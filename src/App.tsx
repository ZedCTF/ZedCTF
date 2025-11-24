// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext'; // Add this import
import AuthInitializer from './components/AuthInitializer';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Writeups from './pages/Writeups';
import CreateWriteup from './pages/CreateWriteup';
import GitHubCallback from './pages/GitHubCallback';
import NotFound from './pages/NotFound';
import Dashboard from './components/Dashboard';
import Practice from './components/Practice';
import LiveEvents from './components/LiveEvents';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard'; // Add this import

function App() {
  return (
    <AuthProvider>
      <AdminProvider> {/* Add AdminProvider */}
        <AuthInitializer>
          <Router basename="/ZedCTF">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/github/callback" element={<GitHubCallback />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/practice" 
                element={
                  <ProtectedRoute>
                    <Practice />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/live" 
                element={
                  <ProtectedRoute>
                    <LiveEvents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leaderboard" 
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/writeups" 
                element={
                  <ProtectedRoute>
                    <Writeups />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/writeups/create" 
                element={
                  <ProtectedRoute>
                    <CreateWriteup />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthInitializer>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;