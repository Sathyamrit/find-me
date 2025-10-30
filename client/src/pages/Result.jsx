import React, { useMemo, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './Result.css';
import Home from './Home';
import Button from '../components/Button';

const Result = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { matchedImages, unmatchedWithPeople, withoutPeople } = useMemo(() => {
    if (!state?.apiResponse) {
      return { matchedImages: [], unmatchedWithPeople: [], withoutPeople: [] };
    }

    const { apiResponse, originalImages } = state || {};
    // Map local files by name for local previews
    const imageMap = new Map((originalImages || []).map(file => [file.name, URL.createObjectURL(file)]));

    const mapItem = (item, idx) => {
      if (!item) return null;
      // If backend returned a URL, use it directly
      if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        return { name: item.split('/').pop() || `image-${idx}`, url: item, isLocal: false };
      }
      // Otherwise try to resolve to a local file preview
      const url = imageMap.get(item);
      if (url) return { name: item, url, isLocal: true };
      // fallback: return item as name (no url)
      return { name: String(item), url: null, isLocal: false };
    };

    const matched = (apiResponse.matched_images || []).map(mapItem).filter(i => i.url);
    const unmatched = (apiResponse.unmatched_images_with_people || []).map(mapItem).filter(i => i.url);
    const noPeople = (apiResponse.images_without_people || []).map(mapItem).filter(i => i.url);

    return { matchedImages: matched, unmatchedWithPeople: unmatched, withoutPeople: noPeople };
  }, [state]);

  useEffect(() => {
    // Revoke only local object URLs (created from File objects)
    return () => {
      const localImages = [...matchedImages, ...unmatchedWithPeople, ...withoutPeople].filter(i => i.isLocal);
      localImages.forEach(image => URL.revokeObjectURL(image.url));
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
          onClick={() => navigate('/Home')}
          >
          Start Over
        </Button>
      </div>
    </div>
  );
};

export default Result;