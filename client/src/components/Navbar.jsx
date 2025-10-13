import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Button from './Button';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear the user's session
    localStorage.removeItem('userToken');
    // Redirect to the login page
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/home">Find Me</NavLink>
      </div>
      <div className="navbar-links">
        <NavLink to="/home" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Upload & Process
        </NavLink>
        <NavLink to="/gallery" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          My Gallery
        </NavLink>
      </div>
      <div className="navbar-actions">
        <Button className="logout-button" onClick={handleLogout}>Logout</Button>
      </div>
    </nav>
  );
};

export default Navbar;

