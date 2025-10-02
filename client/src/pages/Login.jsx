import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import './Login.css';

const API_URL = 'https://find-me-backend-service-933492600521.us-central1.run.app';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password,
      });
      console.log(response.data.message);
      // On successful login, navigate to the main app page
      navigate('/home'); // Or wherever your main app page is
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    }
  };

  return (
    <div>
      <h1>Login Page</h1>
      <div className='login-container'>
        <form className='login-form' onSubmit={handleLogin}>
          <label htmlFor='username'>Username:</label>
          <input
            type='text'
            id='username'
            name='username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor='password'>Password:</label>
          <input
            type='password'
            id='password'
            name='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <p className="error-message">{error}</p>}
          
          <Button type='submit' className='login-button'>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;

