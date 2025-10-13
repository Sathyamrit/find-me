import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Result.css'; // Re-using styles from the Result page

const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app';

const MyGallery = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('userToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await axios.get(`${API_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                setUser(response.data);
            } catch (err) {
                console.error("Failed to fetch user data:", err);
                setError('Failed to load your gallery. Please try logging in again.');
                if (err.response?.status === 401) {
                    localStorage.removeItem('userToken');
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    if (isLoading) {
        return <div className="home-container" style={{ textAlign: 'center', paddingTop: '5rem' }}><h2>Loading your gallery...</h2></div>;
    }

    if (error) {
        return <div className="home-container" style={{ textAlign: 'center', paddingTop: '5rem' }}><h2 className="error-message">{error}</h2></div>;
    }

    return (
        <div className="home-container">
            <h1>My Gallery</h1>
            <p>Welcome back, {user?.username}! Here are the images you've saved.</p>
            
            <div className='results-section'>
                <h2 className='section-title'>Saved Matched Images ({user?.saved_galleries?.length || 0})</h2>
                <div className='upload-box gallery-box'>
                    {user?.saved_galleries && user.saved_galleries.length > 0 ? (
                        user.saved_galleries.map((url, index) => (
                            <div key={index} className='image-preview-wrapper'>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={`Saved match ${index + 1}`} className='preview-image' />
                                </a>
                            </div>
                        ))
                    ) : (
                        <p>You haven't saved any images yet. Process a new gallery on the "Upload & Process" page!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyGallery;
