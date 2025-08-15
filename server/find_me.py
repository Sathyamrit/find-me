import io
import face_recognition
from fastapi import UploadFile

async def check_for_people_in_upload(file: UploadFile):
    try:
        content = await file.read()
        image = face_recognition.load_image_file(io.BytesIO(content))
        face_locations = face_recognition.face_locations(image)
        return len(face_locations) > 0
    except Exception as e:
        print(f"Error processing file {file.filename}: {e}")
        return False


# # logic to return images containing target image
# async def find_images_with_target(gallery_images: List[UploadFile], target_image: UploadFile):
#     target_content = await target_image.read()
#     target_image_data = face_recognition.load_image_file(io.BytesIO(target_content))
#     target_face_encodings = face_recognition.face_encodings(target_image_data)
    
#     if not target_face_encodings:
#         return []
#     target_face_encoding = target_face_encodings[0]
    
#     images_with_target = []