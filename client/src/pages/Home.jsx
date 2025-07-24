import { useState } from 'react';
import './Home.css';
import Button from '../components/Button';
import { Upload, FileImage, X, Image as ImageIcon } from 'lucide-react';


const Home = () => {
  //temporary state for images
  const [targetImage, setTargetImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  //temporary preview of images
  const [targetPreview, setTargetPreview] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState([]);

  //handlers 
  //1. target image handler
  const handleTargetChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setTargetImage(file);
      setTargetPreview(URL.createObjectURL(file));
    } else {
      console.log('Please select a valid image file.');
    }
  };

  //remove target image
  const removeTargetImage = () => {
    setTargetImage(null);
    if (targetPreview) {
      URL.revokeObjectURL(targetPreview); // Clean up the object URL
      setTargetPreview(null);
    }
  };

  //2. gallery image handler
  const handleGalleryChange = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    setGalleryImages(prev => [...prev, ...imageFiles]);

    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setGalleryPreview(prev => [...prev, ...newPreviews]);
  };

  //remove gallery image
  const removeGalleryImage = (indexToRemove) => {
    URL.revokeObjectURL(galleryPreview[indexToRemove]); // Clean up the object URL

    setGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setGalleryPreview(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className='home-container'>
      <h1>Find Me</h1>
      <p>Identify your face across your gallery</p>

      <div className='main-contianer'>
        <div className='left-main-container'>
          {/* <img className='placeholder' src='https://placehold.co/200' alt='Placeholder' /> */}

          {targetPreview ? (
            <img src={targetPreview} />
          ) : ( 
            <div className='target-image-container'
              onClick={() => document.getElementById('target-upload').click()}
            >
              <span>Click to upload target image</span>
              <input
                type='file'
                id='target-upload'
                accept='image/*'
                onChange={handleTargetChange}
                style={{ display: 'none' }}
                className='hidden'
              />
            </div>
          )
        }
        </div>

        <div className='right-main-container'>
          {/* {galleryPreview.length === 0 ? ( */}
          {0 ? (
            <img src={galleryPreview} />
          ) : ( 
            <div className='gallery-image-container'
              onClick={() => document.getElementById('gallery-upload').click()}
            >
              <span>Click to upload the gallery</span>
              <input
                type='file'
                id='gallery-upload'
                accept='image/*'
                onChange={handleGalleryChange}
                style={{ display: 'none' }}
                className='hidden'
              />
            </div>
          )
        }
        </div>
      </div>

      <Button 
        className='find-me'
        disabled={!targetImage || galleryImages.length === 0}
      >
        Find Me!
      </Button>

    </div>
  );
};

export default Home;