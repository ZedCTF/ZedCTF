// src/App.tsx
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import AuthInitializer from './components/AuthInitializer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnlyRoute from './components/AdminOnlyRoute';
import UserOnlyRoute from './components/UserOnlyRoute';
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
import AdminDashboard from './components/AdminDashboard';
import ChallengeDetail from './components/ChallengeDetail';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <AuthInitializer>
          <Router>
            <div className="min-h-screen bg-background flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/auth/github/callback" element={<GitHubCallback />} />
                  
                  {/* User-Only Routes (Regular users only) */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <Dashboard />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/practice" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <Practice />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/live" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <LiveEvents />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/leaderboard" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <Leaderboard />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/writeups" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <Writeups />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/writeups/create" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <CreateWriteup />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Challenge Detail Route - User only */}
                  <Route 
                    path="/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <ChallengeDetail />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Admin-Only Routes */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <AdminOnlyRoute>
                          <AdminDashboard />
                        </AdminOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AuthInitializer>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;