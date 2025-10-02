import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import axios from 'axios'; 
import './Home.css';
import { Camera } from 'lucide-react';
import CameraModal from '../components/CameraModal';

// const API_URL = 'http://127.0.0.1:8000/detect-people/'; //local testing
const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app/detect-people/';

const Home = () => {
  // State for the actual file objects
  const [targetImage, setTargetImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for the image preview URLs
  const [targetPreview, setTargetPreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // State for Camera Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const findMe = async () => {
    setIsLoading(true);
    setError(null);

    // Use FormData to send files to the backend
    const formData = new FormData();

    formData.append('target_image', targetImage);

    galleryImages.forEach(file => {
      formData.append('gallery_images', file);
    });

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Navigate to the result page, passing the API response and original images
      navigate('/result', { 
        state: { 
          apiResponse: response.data, // e.g., { with_people: [...], without_people: [...] }
          originalImages: galleryImages 
        } 
      });

    } catch (err) {
      console.error("API Error:", err);
      const errorMessage = err.response?.data?.detail || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = (capturedFile) => {
    // This function receives the file from the CameraModal
    if (capturedFile) {
        setTargetImage(capturedFile);
        if (targetPreview) URL.revokeObjectURL(targetPreview);
        setTargetPreview(URL.createObjectURL(capturedFile));
    }
  };

  const handleTargetChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setTargetImage(file);
      // Clean up the old preview URL before creating a new one
      if (targetPreview) {
        URL.revokeObjectURL(targetPreview);
      }
      setTargetPreview(URL.createObjectURL(file));
    } else {
      console.log('Please select a valid image file.');
    }
  };

  const removeTargetImage = (e) => {
    e.stopPropagation(); 
    setTargetImage(null);
    if (targetPreview) {
      URL.revokeObjectURL(targetPreview);
      setTargetPreview(null);
    }
  };

  const handleGalleryChange = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    setGalleryImages(prev => [...prev, ...imageFiles]);

    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setGalleryPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeGalleryImage = (e, indexToRemove) => {
    e.stopPropagation(); // Prevent the upload dialog from opening
    
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(galleryPreviews[indexToRemove]);
    
    setGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setGalleryPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <CameraModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCapture={handleCapture}
      />
      <div className='home-container'>
        <h1>Find Me</h1>
        <p>Identify your face across your gallery</p>

        <div className='main-container'>
          {/* --- Target Image Section --- */}
          <div className='upload-section'>
            <h2 className='section-title'>Target Image</h2>
            <div 
              className='upload-box target-box'
              onClick={() => !targetPreview && document.getElementById('target-upload').click()}
            >
              {targetPreview ? (
                <div className='image-preview-wrapper'>
                  <img src={targetPreview} alt="Target Preview" className='preview-image' />
                  <button onClick={removeTargetImage} className='remove-btn'>X</button>
                </div>
              ) : ( 
                <div className="upload-prompt">
                  <span>Click to upload</span> <br />
                  <span className="or-divider">- or -</span> <br />
                  <Button className="icon-btn" onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}>
                    <Camera size={15} /> Capture
                  </Button>
                </div>
              )}
              <input
                type='file'
                id='target-upload'
                accept='image/*'
                onChange={handleTargetChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* --- Gallery Section --- */}
          <div className='upload-section gallery-section'>
            <h2 className='section-title'>Image Gallery</h2>
            <div 
              className='upload-box gallery-box'
              onClick={() => document.getElementById('gallery-upload').click()}
            >
              {galleryPreviews.length > 0 ? (
                galleryPreviews.map((preview, index) => (
                  <div key={index} className='image-preview-wrapper'>
                    <img src={preview} alt={`Gallery Preview ${index + 1}`} className='preview-image' />
                    <button onClick={(e) => removeGalleryImage(e, index)} className='remove-btn'>X</button>
                  </div>
                ))
              ) : (
                <span>Click to upload multiple images</span>
              )}
              <input
                type='file'
                id='gallery-upload'
                accept='image/*'
                multiple // Allow multiple file selection
                onChange={handleGalleryChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className='button-container'>
          <Button
            className='find-me'
            disabled={!targetImage || galleryImages.length === 0 || isLoading}
            onClick={findMe}
          >
            {isLoading ? 'Processing...' : 'Find Me!'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;