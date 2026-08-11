import React from 'react';
import './Card.css';

const Card = ({ children, className = '', padding = 'md', interactive = false, onClick }) => {
  const paddingClass = `card-padding-${padding}`;
  const interactiveClass = interactive ? 'card-interactive' : '';
  
  return (
    <div 
      className={`premium-card glass-panel ${paddingClass} ${interactiveClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
