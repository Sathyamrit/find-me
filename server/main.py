import io
import os
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

import bcrypt
import face_recognition
import numpy as np
from dotenv import load_dotenv
from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from google.cloud import storage
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, EmailStr

# --- Load Environment Variables ---
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

# --- Database Connection & Models ---
client = AsyncIOMotorClient(MONGO_URI)
db = client.find_me_db
user_collection = db.users

# --- FIX: Create a dedicated model for the signup request ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    address: str
    password: str

class User(BaseModel):
    username: str
    email: EmailStr
    address: str

class UserInDB(User):
    hashed_password: str
    saved_galleries: List[str] = Field(default_factory=list)

class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Authentication & Security ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def get_user(email: str):
    user = await user_collection.find_one({"email": email})
    if user:
        return UserInDB(**user)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = await get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# --- Google Cloud Storage Helper ---
storage_client = storage.Client()

def upload_to_gcs(file_content: bytes, filename: str, user_id: str) -> str:
    """Uploads a file to GCS and returns its public URL. Raises Exception on failure."""
    try:
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob_path = f"user_images/{user_id}/{datetime.now(timezone.utc).timestamp()}_{filename}"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(file_content, content_type='image/jpeg')
        return blob.public_url
    except Exception as e:
        print(f"CRITICAL: Failed to upload {filename} to GCS. Error: {e}")
        # --- FIX: Raise an exception to prevent bad data from being saved ---
        raise IOError(f"Failed to upload {filename} to cloud storage.")

# --- Core Logic Functions ---
def _process_image(file_content: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(file_content))
    image = ImageOps.exif_transpose(image)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    return np.array(image)

def classify_and_match_gallery(target_file: UploadFile, gallery_files: List[UploadFile], user_id: str) -> Dict[str, List[str]]:
    matched_urls, unmatched_urls_with_people, urls_without_people = [], [], []
    target_encoding = None
    try:
        target_content = target_file.file.read()
        target_image_np = _process_image(target_content)
        target_face_locations = face_recognition.face_locations(target_image_np)
        if target_face_locations:
            target_encoding = face_recognition.face_encodings(target_image_np, known_face_locations=target_face_locations)[0]
        else:
            print("Warning: No face found in the target image.")
    except Exception as e:
        print(f"Error processing target image {target_file.filename}: {e}")

    for gallery_file in gallery_files:
        try:
            gallery_content = gallery_file.file.read()
            gallery_image_np = _process_image(gallery_content)
            gallery_face_locations = face_recognition.face_locations(gallery_image_np)
            
            if not gallery_face_locations:
                url = upload_to_gcs(gallery_content, gallery_file.filename, user_id)
                urls_without_people.append(url)
                continue

            if not target_encoding:
                url = upload_to_gcs(gallery_content, gallery_file.filename, user_id)
                unmatched_urls_with_people.append(url)
                continue

            gallery_encodings = face_recognition.face_encodings(gallery_image_np, known_face_locations=gallery_face_locations)
            
            is_match_found = False
            for gallery_encoding in gallery_encodings:
                if face_recognition.compare_faces([target_encoding], gallery_encoding)[0]:
                    url = upload_to_gcs(gallery_content, gallery_file.filename, user_id)
                    matched_urls.append(url)
                    is_match_found = True
                    break
            
            if not is_match_found:
                url = upload_to_gcs(gallery_content, gallery_file.filename, user_id)
                unmatched_urls_with_people.append(url)
        except Exception as e:
            print(f"Skipping gallery file {gallery_file.filename} due to error: {e}")
            continue

    return {
        "matched_images": matched_urls, 
        "unmatched_images_with_people": unmatched_urls_with_people, 
        "images_without_people": urls_without_people
    }

# --- FastAPI Server Setup ---
app = FastAPI(title="FindMe API", version="2.1.0")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://find-me-sathyamrit.vercel.app"
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- API Endpoints ---
@app.get("/")
def root():
    return {"message": "Welcome to the FindMe Python Backend! Version 2.1"}

# --- FIX: Use the UserCreate model to correctly handle the request body ---
@app.post("/signup", response_model=User)
async def signup(user_data: UserCreate):
    existing_user = await user_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(
        username=user_data.username,
        email=user_data.email,
        address=user_data.address,
        hashed_password=hashed_password
    )
    await user_collection.insert_one(user_in_db.model_dump())
    return User(**user_data.model_dump())

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserInDB)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@app.post("/classify-and-match/")
async def classify_and_find_matches(
    target_image: UploadFile = File(...),
    gallery_images: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    results = await run_in_threadpool(
        classify_and_match_gallery,
        target_file=target_image,
        gallery_files=gallery_images,
        user_id=str(current_user.email)
    )
    if results["matched_images"]:
        await user_collection.update_one(
            {"email": current_user.email},
            {"$addToSet": {"saved_galleries": {"$each": results["matched_images"]}}}
        )
    return results

