import React from 'react';

interface LogoProps {
  className?: string;
  color?: string;
}

export const JanVoiceLogo: React.FC<LogoProps> = ({ className = "w-6 h-6", color = "currentColor" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clean Human Head Silhouette facing Right */}
      <path 
        d="M9.5 4C6.46 4 4 6.46 4 9.5C4 11.53 5.1 13.3 6.75 14.28C6.91 14.38 7 14.56 7 14.75V17C7 17.55 7.45 18 8 18H9.5L11.5 20V18H12.5C15.54 18 18 15.54 18 12.5C18 9.5 15.54 4 12.5 4H9.5Z" 
        fill={color} 
      />
      {/* 3 Concave Speaking Waves */}
      <path 
        d="M17 9.5C17.7 10.3 18.1 11.4 18.1 12.5C18.1 13.6 17.7 14.7 17 15.5" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M19 7.5C20.25 8.85 21 10.6 21 12.5C21 14.4 20.25 16.15 19 17.5" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M21 5.5C22.85 7.35 24 9.8 24 12.5C24 15.2 22.85 17.65 21 19.5" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
    </svg>
  );
};
