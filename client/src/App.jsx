import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Result from './pages/Result';

// Import the new ProtectedRoute component
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes that anyone can access */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* --- This is the new protected section --- */}
        {/* The ProtectedRoute component will act as a wrapper */}
        <Route element={<ProtectedRoute />}>
          {/* Any routes nested inside here are now protected */}
          <Route path="/home" element={<Home />} />
          <Route path="/result" element={<Result />} />
          {/* You can add more protected routes here later */}
        </Route>
        
        {/* Add a default route to redirect users */}
        {/* If a user goes to the root URL, it will redirect them to the login page */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
