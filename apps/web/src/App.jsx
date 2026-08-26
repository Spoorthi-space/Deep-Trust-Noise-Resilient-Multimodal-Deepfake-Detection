import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import PasswordResetPage from './pages/PasswordResetPage.jsx';
import UploadAnalysisPage from './pages/UploadAnalysisPage.jsx';
import ResultsDashboardPage from './pages/ResultsDashboardPage.jsx';
import DocumentationPage from './pages/DocumentationPage.jsx';
import DemoGalleryPage from './pages/DemoGalleryPage.jsx';
import UserProfilePage from './pages/UserProfilePage.jsx';
import AdminPanelPage from './pages/AdminPanelPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/demo" element={<DemoGalleryPage />} />
          
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <UploadAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ResultsDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-6">Page not found</p>
      <a href="/" className="text-primary hover:underline">Back to home</a>
    </div>
  </div>
);

export default App;