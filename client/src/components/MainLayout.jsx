import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const MainLayout = () => {
  return (
    <div>
      <Navbar />
      <main>
        {/* The <Outlet> will render the matched child route (Home, Gallery, etc.) */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
