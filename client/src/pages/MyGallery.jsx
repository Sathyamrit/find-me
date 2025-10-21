import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyGallery.css';

const API_URL = 'http://localhost:8000';

export default function MyGallery() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setError('Not authenticated');
      return;
    }
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load results');
      }
    })();
  }, []);

  return (
    <div className="my-results-page">
      <h2>Previous Results</h2>
      {error && <p className="error">{error}</p>}
      {results.length === 0 ? (
        <p>No results yet.</p>
      ) : (
        results.map(r => (
          <div key={r.id} className="result-card">
            <div className="meta">
              <strong>When:</strong> {new Date(r.created_at).toLocaleString()}
            </div>
            {r.target_image_url && <img src={r.target_image_url} alt="target" className="thumb" />}
            <div>
              <strong>Matches:</strong>
              <div className="thumb-list">
                {r.matched_images?.map((u, i) => <img key={i} src={u} alt={`match-${i}`} className="thumb" />)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
