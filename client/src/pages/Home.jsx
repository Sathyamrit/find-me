import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import axios from 'axios';
import './Home.css';
import { Camera } from 'lucide-react';
import CameraModal from '../components/CameraModal';

const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app/classify-and-match/';

const Home = () => {
  const [targetImage, setTargetImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState('target');
  const navigate = useNavigate();

  // Redirect to login if no token is found
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const findMe = async () => {
    if (!targetImage || galleryImages.length === 0) return;

    setIsLoading(true);
    setError(null);

    // --- CRITICAL FIX: Get the token from localStorage ---
    const token = localStorage.getItem('userToken');
    if (!token) {
      setError("Authentication error. Please log in again.");
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('target_image', targetImage);
    galleryImages.forEach(file => {
      formData.append('gallery_images', file);
    });

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // --- CRITICAL FIX: Add the Authorization header ---
          'Authorization': `Bearer ${token}`,
        },
      });
      
      navigate('/result', { 
        state: { 
          apiResponse: response.data,
          originalImages: galleryImages 
        } 
      });

    } catch (err) {
      console.error("API Error:", err);
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem('userToken'); // Clear expired token
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = (mode) => {
    setCaptureMode(mode);
    setIsModalOpen(true);
  };

  const handleCapture = (capturedFile) => {
    if (!capturedFile) return;

    if (captureMode === 'target') {
      setTargetImage(capturedFile);
      if (targetPreview) URL.revokeObjectURL(targetPreview);
      setTargetPreview(URL.createObjectURL(capturedFile));
    } else {
      setGalleryImages(prev => [...prev, capturedFile]);
      const newPreview = URL.createObjectURL(capturedFile);
      setGalleryPreviews(prev => [...prev, newPreview]);
    }
  };

  const handleTargetChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setTargetImage(file);
      if (targetPreview) {
        URL.revokeObjectURL(targetPreview);
      }
      setTargetPreview(URL.createObjectURL(file));
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
    e.stopPropagation();
    URL.revokeObjectURL(galleryPreviews[indexToRemove]);
    setGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setGalleryPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <>
      <CameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCapture={handleCapture}
      />
      <div className='home-container'>
        <h1>Find Me</h1>
        <p>Identify your face across your gallery</p>

        <div className='main-container'>
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
                  <span>Click to upload</span>
                  <span className="or-divider">- or -</span>
                  <Button className="icon-btn" onClick={(e) => { e.stopPropagation(); openCamera('target'); }}>
                    <Camera size={15} /> Capture
                  </Button>
                </div>
              )}
              <input type='file' id='target-upload' onChange={handleTargetChange} style={{ display: 'none' }} />
            </div>
          </div>

          <div className='upload-section gallery-section'>
            <h2 className='section-title'>Image Gallery</h2>
            <div 
                className='upload-box gallery-box'
                onClick={() => document.getElementById('gallery-upload').click()}
            >
              {galleryPreviews.map((preview, index) => (
                <div key={index} className='image-preview-wrapper'>
                  <img src={preview} alt={`Gallery Preview ${index + 1}`} className='preview-image' />
                  <button onClick={(e) => removeGalleryImage(e, index)} className='remove-btn'>X</button>
                </div>
              ))}
              {galleryPreviews.length === 0 && (
                 <div className="upload-prompt-gallery-initial">
                    <span>Click to upload gallery</span>
                    <span className="or-divider">- or -</span>
                    <Button className="icon-btn" onClick={(e) => { e.stopPropagation(); openCamera('gallery'); }}>
                        <Camera size={15} /> Capture
                    </Button>
                 </div>
              )}
              <input type='file' id='gallery-upload' multiple onChange={handleGalleryChange} style={{ display: 'none' }} />
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
    </>
  );
};

export default Home;

