import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import './Home.css';

const Home = () => {
  // State for the actual file objects
  const [targetImage, setTargetImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  // State for the image preview URLs
  const [targetPreview, setTargetPreview] = useState(null);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const navigate = useNavigate();

  const findMe = () => {
    // This is where you would eventually add the API call logic
    // For now, it just navigates to the result page
    if (!targetImage || galleryImages.length === 0) {
        alert("Please upload a target image and at least one gallery image.");
        return;
    }
    navigate('/result');
  };

  // handlers

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
              <span>Click to upload</span>
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

      <div className='button-container'>
        <Button
          className='find-me'
          disabled={!targetImage || galleryImages.length === 0}
          onClick={findMe}
        >
          Find Me!
        </Button>
      </div>
    </div>
  );
};

export default Home;