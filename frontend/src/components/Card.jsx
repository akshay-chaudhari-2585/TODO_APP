import React from 'react';
import './Card.css';

const Card = ({ children, className = '', padding = 'md' }) => {
  const paddingClass = `card-padding-${padding}`;
  
  return (
    <div className={`premium-card glass-panel ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
