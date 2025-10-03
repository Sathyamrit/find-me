import React from 'react';
import './Button.css';

const Button = ({ children, onClick, className, type = 'button', disabled = false }) => {
  return (
    <button
      type={type}
      className={`button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;

