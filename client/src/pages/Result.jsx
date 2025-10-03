import React, { useMemo, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './Result.css';
import Button from '../components/Button';

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { matchedImages, unmatchedWithPeople, withoutPeople } = useMemo(() => {
    // Guard clause: if there's no state, return empty arrays
    if (!state?.apiResponse || !state?.originalImages) {
      return { matchedImages: [], unmatchedWithPeople: [], withoutPeople: [] };
    }

    const { apiResponse, originalImages } = state;
    
    // Create a mapping of filename to a temporary URL for quick lookups
    const imageMap = new Map(originalImages.map(file => [file.name, URL.createObjectURL(file)]));
    
    // Map the filenames from the API response to their corresponding image URLs
    const matched = (apiResponse.matched_images || []).map(name => ({ name, url: imageMap.get(name) })).filter(img => img.url);
    const unmatched = (apiResponse.unmatched_images_with_people || []).map(name => ({ name, url: imageMap.get(name) })).filter(img => img.url);
    const noPeople = (apiResponse.images_without_people || []).map(name => ({ name, url: imageMap.get(name) })).filter(img => img.url);
    
    return { matchedImages: matched, unmatchedWithPeople: unmatched, withoutPeople: noPeople };
  }, [state]);

  useEffect(() => {
    return () => {
      const allImages = [...matchedImages, ...unmatchedWithPeople, ...withoutPeople];
      allImages.forEach(image => URL.revokeObjectURL(image.url));
    };
  }, [matchedImages, unmatchedWithPeople, withoutPeople]);


  if (!state) {
    return (
      <div className='home-container' style={{ textAlign: 'center' }}>
        <h1>No Results</h1>
        <p>Please go back and upload images to process.</p>
        <Link to="/" className='find-me'>Go Back</Link>
      </div>
    );
  }

  return (
    <div className='home-container'>
      <h1>Classification Results</h1>
      
      {/* --- NEW: Section for Matched Images --- */}
      <div className='results-section'>
        <h2 className='section-title'>Matched Images ({matchedImages.length})</h2>
        <div className='upload-box gallery-box'>
          {matchedImages.length > 0 ? (
            matchedImages.map((image) => (
              <div key={image.name} className='image-preview-wrapper'>
                <img src={image.url} alt={image.name} className='preview-image' />
              </div>
            ))
          ) : (
            <p>No images were found containing the target person.</p>
          )}
        </div>
      </div>

      {/* --- NEW: Section for Unmatched Images (that still contain people) --- */}
      <div className='results-section' style={{marginTop: '3rem'}}>
        <h2 className='section-title'>Unmatched Images with People ({unmatchedWithPeople.length})</h2>
        <div className='upload-box gallery-box'>
          {unmatchedWithPeople.length > 0 ? (
            unmatchedWithPeople.map((image) => (
              <div key={image.name} className='image-preview-wrapper'>
                <img src={image.url} alt={image.name} className='preview-image' />
              </div>
            ))
          ) : (
            <p>No other people were found in the gallery.</p>
          )}
        </div>
      </div>

      {/* --- UPDATED: Section for Images Without People --- */}
      <div className='results-section' style={{marginTop: '3rem'}}>
        <h2 className='section-title'>Images Without People ({withoutPeople.length})</h2>
        <div className='upload-box gallery-box'>
          {withoutPeople.length > 0 ? (
            withoutPeople.map((image) => (
              <div key={image.name} className='image-preview-wrapper'>
                <img src={image.url} alt={image.name} className='preview-image' />
              </div>
            ))
          ) : (
            <p>All images in the gallery contained people.</p>
          )}
        </div>
      </div>

      <div className='button-container'>
        <Button
          className='start-over'
          onClick={() => navigate('/')}
          >
          Start Over
        </Button>
      </div>
    </div>
  );
};

export default Result;