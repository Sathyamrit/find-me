from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from find_me import check_for_people_in_upload 

# initialize FastAPI app
app = FastAPI(
    title="Face Recognition API",
    description="API for face recognition to find a face in a gallery of images",
    version="1.0.0",
)

# middleware 
origins = ["*"]
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# --- API Endpoint for Detecting People ---
@app.post("/detect-people/")
async def detect_people_in_gallery(
    gallery_images: List[UploadFile] = File(..., description="A list of images to check for people.")
):
    with_people = []
    without_people = []

    for image_file in gallery_images:
        await image_file.seek(0)
        has_people = await check_for_people_in_upload(image_file)
        
        if has_people:
            with_people.append(image_file.filename)
        else:
            without_people.append(image_file.filename)
            
    return {
        "with_people": with_people,
        "without_people": without_people
    }


@app.get("/")
async def root():
  return {"message": "Welcome to your Python Backend!"}
