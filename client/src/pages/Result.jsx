import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Result.css'; // Re-using the same CSS for consistency
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const Result = () => {
  const { state } = useLocation();

  const navigate = useNavigate();

  const { imagesWithPeople, imagesWithoutPeople } = useMemo(() => {
    if (!state?.apiResponse || !state?.originalImages) {
      return { imagesWithPeople: [], imagesWithoutPeople: [] };
    }

    const { apiResponse, originalImages } = state;
    const imageMap = new Map(originalImages.map(file => [file.name, URL.createObjectURL(file)]));
    
    const withPeople = apiResponse.with_people.map(name => ({ name, url: imageMap.get(name) })).filter(img => img.url);
    const withoutPeople = apiResponse.without_people.map(name => ({ name, url: imageMap.get(name) })).filter(img => img.url);
    
    return { imagesWithPeople: withPeople, imagesWithoutPeople: withoutPeople };
  }, [state]);

  if (!state) {
    return (
      <div className='home-container' style={{ textAlign: 'center' }}>
        <h1>No Results</h1>
        <p>Please go back and upload images to process.</p>
        <Link to="/" className='find-me'>Go Back</Link>
      </div>
    );
  }

  // website rendering 
  return (
    <div className='home-container'>
      <h1>Detection Results</h1>
      
      {/* Section for Images WITH People */}
      <div className='results-section'>
        <h2 className='section-title'>Images Containing Target ({imagesWithPeople.length})</h2>
        <div className='upload-box gallery-box'>
          {imagesWithPeople.length > 0 ? (
            imagesWithPeople.map((image) => (
              <div key={image.name} className='image-preview-wrapper'>
                <img src={image.url} alt={image.name} className='preview-image' />
              </div>
            ))
          ) : (
            <p>No images with people were found in your selection.</p>
          )}
        </div>
      </div>

      {/* Section for Images WITHOUT People */}
      <div className='results-section' style={{marginTop: '3rem'}}>
        <h2 className='section-title'>Images Without Target ({imagesWithoutPeople.length})</h2>
        <div className='upload-box gallery-box'>
          {imagesWithoutPeople.length > 0 ? (
            imagesWithoutPeople.map((image) => (
              <div key={image.name} className='image-preview-wrapper'>
                <img src={image.url} alt={image.name} className='preview-image' />
              </div>
            ))
          ) : (
            <p>All images contained people.</p>
          )}
        </div>
      </div>

      {/* Button to go back */}
      <Button
        className='start-over'
        onClick={() => navigate('/')}
        >
        Start Over
      </Button>
    </div>
  );
};

export default Result;