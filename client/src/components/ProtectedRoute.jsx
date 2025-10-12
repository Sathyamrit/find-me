import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Check for the user token in localStorage
  const token = localStorage.getItem('userToken');

  // If a token exists, the user is considered authenticated.
  // The <Outlet /> component will render the nested child route (e.g., your Home page).
  if (token) {
    return <Outlet />;
  }

  // If no token is found, redirect the user to the login page.
  // The 'replace' prop is used to prevent the user from going back to the protected page
  // using the browser's back button after being redirected.
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
