import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const path = location.pathname;

  const isPortal = path.startsWith('/citizen') || 
                   path.startsWith('/officer') || 
                   path.startsWith('/mp') || 
                   path.startsWith('/admin') ||
                   path === '/' || 
                   path === '/login' || 
                   path === '/register';

  if (isPortal) {
    return <div className="min-h-screen bg-[#F7F9F8]">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F9F8] text-[#1F2937] font-inter">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
