// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import AuthInitializer from './components/AuthInitializer'; // Import the new component
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

function App() {
  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
      <AuthInitializer> {/* Use the new initializer component */}
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthInitializer>
    </AuthProvider>
  );
}

export default App;