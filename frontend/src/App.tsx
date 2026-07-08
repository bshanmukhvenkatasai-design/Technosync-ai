import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireRole } from './components/Layout/ProtectedGuard';
import Layout from './components/Layout/Layout';
import Landing from './pages/Public/Landing';
import About from './pages/Public/About';
import Features from './pages/Public/Features';
import Contact from './pages/Public/Contact';
import Login from './pages/Public/Login';
import Register from './pages/Public/Register';
import ForgotPassword from './pages/Public/ForgotPassword';
import ResetPassword from './pages/Public/ResetPassword';
import Profile from './pages/Public/Profile';
import CitizenDashboard from './pages/Citizen/Dashboard';
import OfficerDashboard from './pages/Officer/OfficerDashboard';
import MPDashboard from './pages/MP/MPDashboard';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { DemoDashboard } from './pages/Public/DemoDashboard';
import { Architecture } from './pages/Public/Architecture';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/demo" element={<DemoDashboard />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Profile (Auth protected) */}
            <Route 
              path="/profile" 
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              } 
            />

            {/* Citizen (Auth + Role protected) */}
            <Route 
              path="/citizen/dashboard" 
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={['Citizen', 'Admin']}>
                    <CitizenDashboard />
                  </RequireRole>
                </RequireAuth>
              } 
            />

            {/* Officer (Auth + Role protected) */}
            <Route 
              path="/officer/dashboard" 
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={['Officer', 'Admin']}>
                    <OfficerDashboard />
                  </RequireRole>
                </RequireAuth>
              } 
            />

            {/* MP (Auth + Role protected) */}
            <Route 
              path="/mp/dashboard" 
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={['MP', 'Admin']}>
                    <MPDashboard />
                  </RequireRole>
                </RequireAuth>
              } 
            />

            {/* Admin (Auth + Role protected) */}
            <Route 
              path="/admin/dashboard" 
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </RequireRole>
                </RequireAuth>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
};

export default App;
