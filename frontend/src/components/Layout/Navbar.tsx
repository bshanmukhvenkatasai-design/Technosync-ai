import React from 'react';

export const Navbar = () => {
  return (
    <nav className="bg-white/30 backdrop-blur-md border-b border-gray-200 dark:bg-gray-800/30 dark:border-gray-700 p-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-semibold text-gray-800 dark:text-gray-100">JanVoice</div>
        <ul className="flex space-x-4">
          <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">Home</a></li>
          <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">Dashboard</a></li>
          <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">Profile</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
