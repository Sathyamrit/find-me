import io
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from fastapi.concurrency import run_in_threadpool
import face_recognition
from PIL import Image, ImageOps
import numpy as np

# --- Core Logic Functions ---

def _process_image(file_content: bytes) -> np.ndarray:
    """
    Private helper function to correctly load, orient, and convert an image.
    """
    image = Image.open(io.BytesIO(file_content))
    # Auto-orient the image based on its EXIF data (crucial for mobile photos)
    image = ImageOps.exif_transpose(image)
    # Standardize the format for face_recognition
    if image.mode != 'RGB':
        image = image.convert('RGB')
    return np.array(image)

def classify_and_match_gallery(target_file: UploadFile, gallery_files: List[UploadFile]) -> Dict[str, List[str]]:
    """
    Processes a gallery to classify images and find matches for a target face.
    This is a synchronous, CPU-intensive function designed to be run in a threadpool.
    """
    matched_filenames = []
    unmatched_filenames_with_people = []
    filenames_without_people = []
    
    target_encoding = None

    try:
        # 1. Process the target image and attempt to get its face encoding.
        target_content = target_file.file.read()
        target_image_np = _process_image(target_content)
        target_face_locations = face_recognition.face_locations(target_image_np)
        
        if target_face_locations:
            target_encoding = face_recognition.face_encodings(target_image_np, known_face_locations=target_face_locations)[0]
        else:
            print("Warning: No face found in the target image. All gallery images with faces will be classified as 'unmatched'.")

    except Exception as e:
        print(f"A critical error occurred while processing the target image {target_file.filename}: {e}")
        # If the target image fails to process, we can't perform matching.
        # We can still classify the gallery images.
        target_encoding = None

    # 2. Loop through each image in the gallery.
    for gallery_file in gallery_files:
        try:
            gallery_content = gallery_file.file.read()
            gallery_image_np = _process_image(gallery_content)
            gallery_face_locations = face_recognition.face_locations(gallery_image_np)
            
            if not gallery_face_locations:
                filenames_without_people.append(gallery_file.filename)
                continue

            # If we have no valid target encoding, any image with people is automatically unmatched.
            if not target_encoding:
                unmatched_filenames_with_people.append(gallery_file.filename)
                continue

            gallery_encodings = face_recognition.face_encodings(gallery_image_np, known_face_locations=gallery_face_locations)
            
            is_match_found = False
            for gallery_encoding in gallery_encodings:
                is_match = face_recognition.compare_faces([target_encoding], gallery_encoding)[0]
                if is_match:
                    matched_filenames.append(gallery_file.filename)
                    is_match_found = True
                    break 
            
            if not is_match_found:
                unmatched_filenames_with_people.append(gallery_file.filename)

        except Exception as e:
            # If a single gallery image is corrupt or fails, classify it as "without people" and move on.
            print(f"Error processing gallery file {gallery_file.filename}: {e}")
            filenames_without_people.append(gallery_file.filename)
            continue

    return {
        "matched_images": matched_filenames, 
        "unmatched_images_with_people": unmatched_filenames_with_people, 
        "images_without_people": filenames_without_people
    }

# --- FastAPI Server Setup ---

app = FastAPI(
    title="FindMe API",
    description="API to classify images and find face matches.",
    version="1.3.1", # Version updated for review
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    # Add your Vercel URL here when you are ready to deploy
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.post("/classify-and-match/")
async def classify_and_find_matches(
    target_image: UploadFile = File(...),
    gallery_images: List[UploadFile] = File(...)
):
    """
    Accepts a target image and a gallery. Returns three lists: matched images,
    unmatched images with people, and images without people.
    """
    results = await run_in_threadpool(
        classify_and_match_gallery,
        target_file=target_image,
        gallery_files=gallery_images
    )
    return results

@app.get("/")
async def root():
    return {"message": "Welcome to the FindMe Python Backend! Version 1.3.1"}

