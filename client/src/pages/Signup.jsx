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
    confirmPassword: '', // Added for validation
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added for better UX
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- NEW: Client-side password validation ---
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return; // Stop the submission
    }

    setIsLoading(true);

    try {
      // We don't need to send confirmPassword to the backend
      const { confirmPassword, ...payload } = formData;
      const response = await axios.post(`${API_URL}/signup`, payload);
      
      setSuccess(response.data.message + ". Redirecting to login...");
      
      // Redirect to login page after a short delay to show the success message
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className='signup-heading'>Create an Account</h1>
      <div className='signup-container'>
        <form className='signup-form' onSubmit={handleSignup}>
          <label htmlFor='username'>Username:</label>
          <input type='text' id='username' name='username' value={formData.username} onChange={handleChange} required autoComplete="username" />
          
          <label htmlFor='email'>Email:</label>
          <input type='email' id='email' name='email' value={formData.email} onChange={handleChange} required autoComplete="email" />
          
          <label htmlFor='address'>Address:</label>
          <input type='text' id='address' name='address' value={formData.address} onChange={handleChange} required autoComplete="street-address" />
          
          <label htmlFor='password'>Password:</label>
          <input type='password' id='password' name='password' value={formData.password} onChange={handleChange} required autoComplete="new-password" />

          {/* --- NEW: Confirm Password Field --- */}
          <label htmlFor='confirmPassword'>Confirm Password:</label>
          <input type='password' id='confirmPassword' name='confirmPassword' value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
          
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          
          <div className="button-group">
            <Button type='submit' className='signup-button' disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </Button>
            {/* FIX: Changed type to 'button' to prevent form submission */}
            <Button type='button' className='login-button' onClick={handleLoginRedirect} disabled={isLoading}>
              Back to Login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;

