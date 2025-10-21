import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import './Login.css';

// const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app';

const API_URL = 'http://localhost:8000';

function Login() {
  // FIX: Changed state to 'email' to match backend requirements
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // FIX: The backend's OAuth2 form expects 'application/x-www-form-urlencoded' data, not JSON.
      // We create URLSearchParams to format the data correctly.
      const params = new URLSearchParams();
      params.append('username', email); // The backend form field is named 'username' but expects the email value.
      params.append('password', password);

      const response = await axios.post(`${API_URL}/login`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      // CRITICAL FIX: On successful login, store the access token in localStorage.
      // This is essential for making authenticated requests to other parts of your app.
      if (response.data.access_token) {
        localStorage.setItem('userToken', response.data.access_token);
        console.log("Login successful, token stored.");
        navigate('/home'); // Navigate to the main app page
      } else {
        setError('Login failed: No authentication token was received.');
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Login Page</h1>
      <div className='login-container'>
        <form className='login-form' onSubmit={handleLogin}>
          {/* FIX: Changed label and input to use 'email' */}
          <label htmlFor='email'>Email:</label>
          <input
            type='email'
            id='email'
            name='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor='password'>Password:</label>
          <input
            type='password'
            id='password'
            name='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          
          {error && <p className="error-message">{error}</p>}
          
          <div className="button-group">
            <Button type='submit' className='login-button' disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            <Button type='button' className='signup-button' onClick={handleSignup} disabled={isLoading}>
              Signup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;

