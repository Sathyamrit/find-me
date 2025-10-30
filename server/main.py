import io
import os
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

import bcrypt
import face_recognition
import numpy as np
from bson import ObjectId
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from google.cloud import storage
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, EmailStr
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str
    GCS_BUCKET_NAME: Optional[str] = None
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    APP_BASE_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env" # Loads from a .env file for local development

settings = Settings()

app = FastAPI(title="FindMe API", version="2.1.0")

#CORS Middleware 
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://find-me-sathyamrit.vercel.app", 
    "https://find-me-backend-service-933492600521.us-central1.run.app"
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Password Hashing & JWT) 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Database Connection 
client = AsyncIOMotorClient(settings.MONGO_URI)
db = client.find_me_db
user_collection = db.users
results_collection = db.results

# Google Cloud Storage Client 
# currently not in use / not working / service unavailable
storage_client = None
if settings.GCS_BUCKET_NAME:
    try:
        storage_client = storage.Client()
    except Exception as e:
        print(f"Warning: Google Cloud Storage client init failed: {e}. Falling back to local storage.")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# PYDANTIC MODELS
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v, validation_info=None):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

class UserBase(BaseModel):
    username: str
    email: EmailStr
    address: str

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    saved_galleries: List[str] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# AUTHENTICATION & HELPER FUNCTIONS

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def get_user(email: str) -> Optional[UserInDB]:
    user = await user_collection.find_one({"email": email})
    if user:
        return UserInDB(**user)
    return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire_delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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

def upload_to_gcs(file_content: bytes, filename: str, user_id: str) -> str:
    """
    Upload to Google Cloud Storage when configured. Otherwise save to local uploads directory
    and return a URL that FastAPI serves at /uploads/...
    """
    if storage_client and settings.GCS_BUCKET_NAME:
        try:
            bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
            blob_path = f"user_images/{user_id}/{int(datetime.now(timezone.utc).timestamp())}_{filename}"
            blob = bucket.blob(blob_path)
            blob.upload_from_string(file_content, content_type='image/jpeg')
            return blob.public_url
        except Exception as e:
            print(f"CRITICAL: Failed to upload {filename} to GCS. Error: {e}")
          
    try:
        user_dir = os.path.join(UPLOAD_DIR, str(user_id))
        os.makedirs(user_dir, exist_ok=True)
        safe_filename = f"{int(datetime.now(timezone.utc).timestamp())}_{filename}"
        file_path = os.path.join(user_dir, safe_filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
        # Build an absolute URL to the uploaded file using APP_BASE_URL
        public_url = f"{settings.APP_BASE_URL}/uploads/{user_id}/{safe_filename}"
        return public_url
    except Exception as e:
        print(f"CRITICAL: Failed to save {filename} locally. Error: {e}")
        raise IOError(f"Failed to upload {filename} to storage.")


# CORE LOGIC (CPU-INTENSIVE)

def _process_image(file_content: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(file_content))
    image = ImageOps.exif_transpose(image)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    return np.array(image)

def classify_and_match_gallery(target_content: bytes, gallery_items: List[Dict], user_id: str) -> Dict[str, List[str]]:
    """
    gallery_items: list of {"filename": str, "content": bytes}
    This function runs synchronously in a threadpool (CPU-bound).
    """
    matched_urls, unmatched_urls_with_people, urls_without_people = [], [], []
    target_encoding = None

    # Process target image and extract encoding (if any)
    try:
        target_image_np = _process_image(target_content)
        target_face_locations = face_recognition.face_locations(target_image_np)
        print(f"[debug] target faces found: {len(target_face_locations)}")
        if target_face_locations:
            encs = face_recognition.face_encodings(target_image_np, known_face_locations=target_face_locations)
            if encs:
                target_encoding = encs[0]
    except Exception as e:
        print(f"Error processing target image: {e}")

    # Process each gallery item (already-read bytes)
    for item in gallery_items:
        filename = item.get("filename", "unknown")
        content = item.get("content", b"")
        try:
            gallery_image_np = _process_image(content)
            gallery_face_locations = face_recognition.face_locations(gallery_image_np)
            print(f"[debug] gallery '{filename}' faces found: {len(gallery_face_locations)}")

            # No faces in gallery image
            if not gallery_face_locations:
                url = upload_to_gcs(content, filename, user_id)
                urls_without_people.append(url)
                continue

            # Faces present in gallery but no face in target => unmatched_with_people
            if target_encoding is None:
                url = upload_to_gcs(content, filename, user_id)
                unmatched_urls_with_people.append(url)
                continue

            gallery_encodings = face_recognition.face_encodings(gallery_image_np, known_face_locations=gallery_face_locations)
            is_match_found = False
            for gallery_encoding in gallery_encodings:
                # compare_faces returns list of booleans
                matches = face_recognition.compare_faces([target_encoding], gallery_encoding)
                if matches and matches[0]:
                    url = upload_to_gcs(content, filename, user_id)
                    matched_urls.append(url)
                    is_match_found = True
                    break

            if not is_match_found:
                url = upload_to_gcs(content, filename, user_id)
                unmatched_urls_with_people.append(url)

        except Exception as e:
            print(f"Skipping gallery file {filename} due to error: {e}")
            # If processing fails, treat as without-people fallback to preserve UX
            try:
                url = upload_to_gcs(content, filename, user_id)
                urls_without_people.append(url)
            except Exception:
                pass
            continue

    return {
        "matched_images": matched_urls,
        "unmatched_images_with_people": unmatched_urls_with_people,
        "images_without_people": urls_without_people
    }

# API ENDPOINTS
@app.get("/")
def root():
    return {"message": "Welcome to the FindMe Python Backend! Version 2.1"}

@app.post("/signup", response_model=UserBase)
async def signup(user_data: UserCreate):
    if await user_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    # Create a dictionary to insert, as Pydantic models with aliases can be tricky
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "address": user_data.address,
        "hashed_password": hashed_password,
        "saved_galleries": []
    }
    await user_collection.insert_one(user_doc)
    return UserBase(**user_data.model_dump())

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user(form_data.username) # The form sends email in the 'username' field
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserBase)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@app.post("/classify-and-match/")
async def classify_and_find_matches(
    target_image: UploadFile = File(...),
    gallery_images: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    # read target bytes
    target_content = await target_image.read()

    # Upload target image (optional; helps persist target preview URL)
    try:
        target_url = upload_to_gcs(target_content, target_image.filename, str(current_user.email))
    except Exception as e:
        print("Warning: failed to upload target image:", e)
        target_url = None

    # Read gallery files into memory (bytes) here in async code, then pass plain data into the sync worker.
    gallery_items = []
    for gf in gallery_images:
        try:
            content = await gf.read()
            gallery_items.append({"filename": gf.filename, "content": content})
        except Exception as e:
            print(f"Warning: failed to read gallery file {gf.filename}: {e}")

    # Run CPU-bound matching in threadpool with pre-read bytes
    results = await run_in_threadpool(
        classify_and_match_gallery,
        target_content,
        gallery_items,
        str(current_user.email)
    )

    # Update user's saved_galleries with matched images (if any)
    if results.get("matched_images"):
        await user_collection.update_one(
            {"email": current_user.email},
            {"$addToSet": {"saved_galleries": {"$each": results["matched_images"]}}}
        )

    # Build API response including target URL
    api_response = {
        "target_image_url": target_url,
        **results
    }

    # Persist the result document for this user
    try:
        inserted_id = await save_result_for_user(str(current_user.id), api_response)
        print(f"Saved result {inserted_id} for user {current_user.email}")
    except Exception as e:
        print("Warning: failed to save result for user:", e)

    return api_response

# Stored result model + helper
class StoredResult(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    user_id: str
    created_at: datetime
    target_image_url: Optional[str] = None
    matched_images: List[str] = Field(default_factory=list)
    unmatched_with_people: List[str] = Field(default_factory=list)
    images_without_people: List[str] = Field(default_factory=list)
    raw: Optional[Dict] = None

    class Config:
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

async def save_result_for_user(user_id: str, result: Dict) -> str:
    """
    Save the result document for the given user_id. Returns inserted_id as str.
    Non-fatal: raises if insert fails (caller should log but not break main flow).
    """
    doc = {
        "user_id": str(user_id),
        "created_at": datetime.now(timezone.utc),
        "target_image_url": result.get("target_image_url"),
        "matched_images": result.get("matched_images", []),
        "unmatched_with_people": result.get("unmatched_images_with_people", []),
        "images_without_people": result.get("images_without_people", []),
        "raw": result,
    }
    res = await results_collection.insert_one(doc)
    return str(res.inserted_id)

# Endpoint
@app.get("/results", response_model=List[StoredResult])
async def list_my_results(current_user = Depends(get_current_user)):
    # current_user expected to have .id (ObjectId or str)
    uid = str(current_user.id)
    cursor = results_collection.find({"user_id": uid}).sort("created_at", -1)
    out = []
    async for doc in cursor:
        out.append(doc)
    return out

# Simple startup check to confirm MongoDB Atlas connectivity
@app.on_event("startup")
async def startup_db_check():
    try:
        # ping the server to validate connection (motor async)
        await client.admin.command('ping')
        print("MongoDB Atlas: connection OK")
    except Exception as e:
        # print error and continue; this helps debugging on startup logs
        print(f"MongoDB Atlas: connection FAILED: {e}")

