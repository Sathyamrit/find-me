import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts and Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Result from './pages/Result';
import MyGallery from './pages/MyGallery'; // Import the new page
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout'; // Import the new layout

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* These routes will have the Navbar */}
            <Route path="/home" element={<Home />} />
            <Route path="/gallery" element={<MyGallery />} />
            <Route path="/result" element={<Result />} />
          </Route>
        </Route>
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
