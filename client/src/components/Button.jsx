import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Button.css';

const Button = ({ children, onClick, className, disabled }) => {
  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default Button;