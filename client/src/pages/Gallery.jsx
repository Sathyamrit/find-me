// client/src/pages/MyGallery.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
                localStorage.removeItem('userToken'); // Clear bad token
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    if (isLoading) {
        return <div className="loading-container">Loading your gallery...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="home-container">
            <h1>Welcome, {user?.username}!</h1>
            <p>Here are your saved image galleries.</p>
            
            {/* You can now map over user.saved_galleries to display them */}
            {/* This is a simple example to get you started */}
            <div className='results-section'>
                <h2 className='section-title'>My Matched Images</h2>
                <div className='upload-box gallery-box'>
                    {user?.saved_galleries && user.saved_galleries.length > 0 ? (
                        user.saved_galleries.map((url, index) => (
                            <div key={index} className='image-preview-wrapper'>
                                <img src={url} alt={`Saved match ${index + 1}`} className='preview-image' />
                            </div>
                        ))
                    ) : (
                        <p>You haven't processed any images yet. Go to the <a href="/home">Home</a> page to start!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyGallery;