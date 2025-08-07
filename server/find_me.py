import face_recognition
import os

# check images for people
def are_people_in_image(image_path: str) -> bool:
    # check if the file exists to avoid errors.
    if not os.path.exists(image_path):
        print(f"Error: The file '{image_path}' was not found.")
        return False

    try:        
        image = face_recognition.load_image_file(image_path)
        face_locations = face_recognition.face_locations(image)
        number_of_faces = len(face_locations)

        if number_of_faces > 0:
            print(f"success! Found {number_of_faces} person/people in '{image_path}'.")
            return True
        else:
            print(f"no people were found in '{image_path}'.")
            return False

    except Exception as e:
        print(f"an error occurred while processing the image '{image_path}': {e}")
        return False

if __name__ == "__main__":    
    image_to_check = "my_test_image.jpg" 

    if not os.path.exists(image_to_check):
        print("\n----------------------------------")
        print(f"WARNING: The sample image '{image_to_check}' does not exist.")
        print("Please place an image with that name in the same folder as this script, or change the 'image_to_check' variable to your image's path.")
        print("----------------------------------")
    else:
        print(f"\nAnalyzing '{image_to_check}'...")
        # Call the function and check the result
        people_found = are_people_in_image(image_to_check)

        if people_found:
            print("\nResult: The image contains people.")
        else:
            print("\nResult: The image does not contain people.")


# match the face in the image to a known face
def match_face_in_image(image_path: str, known_faces_dir: str) -> bool:
    if not os.path.exists(image_path):
        print(f"Error: The file '{image_path}' was not found.")
        return False

    if not os.path.exists(known_faces_dir):
        print(f"Error: The directory '{known_faces_dir}' was not found.")
        return False

    try:
        unknown_image = face_recognition.load_image_file(image_path)
        unknown_face_encodings = face_recognition.face_encodings(unknown_image)

        if len(unknown_face_encodings) == 0:
            print("No faces found in the image to match.")
            return False

        for filename in os.listdir(known_faces_dir):
            known_face_path = os.path.join(known_faces_dir, filename)
            known_image = face_recognition.load_image_file(known_face_path)
            known_face_encodings = face_recognition.face_encodings(known_image)

            if len(known_face_encodings) == 0:
                continue

            results = face_recognition.compare_faces(known_face_encodings,
                                                     unknown_face_encodings[0])
            if True in results:
                print(f"Match found: '{filename}' matches the face in '{image_path}'.")
                return True
        print(f"No matches found for the face in '{image_path}' against known faces.")
        return False
    except Exception as e:
        print(f"An error occurred while processing the image '{image_path}': {e}")
        return False
    