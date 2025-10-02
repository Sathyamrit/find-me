import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import './Signup.css';

const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app';

function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    address: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/signup`, formData);
      setSuccess(response.data.message + ". Redirecting to login...");
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    }
  };

  return (
    <div>
      <h1>Signup Page</h1>
      <div className='signup-container'>
        <form className='signup-form' onSubmit={handleSignup}>
          <label htmlFor='username'>Username:</label>
          <input type='text' id='username' name='username' onChange={handleChange} required />
          
          <label htmlFor='email'>Email:</label>
          <input type='email' id='email' name='email' onChange={handleChange} required />
          
          <label htmlFor='address'>Address:</label>
          <input type='text' id='address' name='address' onChange={handleChange} required />
          
          <label htmlFor='password'>Password:</label>
          <input type='password' id='password' name='password' onChange={handleChange} required />
          
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          
          <Button type='submit' className='signup-button'>
            Sign Up
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
