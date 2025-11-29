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
import GlobalLeaderboard from './components/GlobalLeaderboard';
import LiveLeaderboard from './components/LiveLeaderboard';
import AdminDashboard from './components/AdminDashboard';
import PracticeChallengeDetail from './components/PracticeChallengeDetail';
import LiveEventChallengeDetail from './components/LiveEventChallengeDetail';
import UpcomingEventDetails from './components/UpcomingEventDetails';
import LiveEventDetails from './components/LiveEventDetails';
import PastEventDetails from './components/PastEventDetails';
import Navbar from './components/Navbar';

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
                  
                  {/* Public Routes */}
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/leaderboard/global" element={<GlobalLeaderboard />} />
                  <Route path="/leaderboard/live" element={<LiveLeaderboard />} />
                  <Route path="/writeups" element={<Writeups />} />
                  
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
                    path="/writeups/create" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <CreateWriteup />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Practice Challenge Detail Route - User only */}
                  <Route 
                    path="/practice/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <PracticeChallengeDetail />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Live Event Challenge Detail Route - User only */}
                  <Route 
                    path="/live-event/:eventId/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <LiveEventChallengeDetail />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Event Details Routes - User only */}
                  <Route 
                    path="/event/upcoming/:eventId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <UpcomingEventDetails />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/event/live/:eventId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <LiveEventDetails />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/event/past/:eventId" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <PastEventDetails />
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
            </div>
          </Router>
        </AuthInitializer>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;