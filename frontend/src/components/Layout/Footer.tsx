import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white/30 backdrop-blur-md border-t border-gray-200 dark:bg-gray-800/30 dark:border-gray-700 p-4 text-center text-sm text-gray-600 dark:text-gray-300">
      <div className="container mx-auto">
        © {new Date().getFullYear()} JanVoice. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
