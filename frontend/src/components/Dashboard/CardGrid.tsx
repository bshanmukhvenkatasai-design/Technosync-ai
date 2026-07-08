import React from 'react';

export const CardGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {React.Children.map(children, child => (
      <div className="bg-white/30 backdrop-blur-md rounded-xl p-4 shadow-sm dark:bg-gray-800/30">
        {child}
      </div>
    ))}
  </div>
);
