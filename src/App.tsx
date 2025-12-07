// App.tsx - Full updated version with writeup routes fixed
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import AuthInitializer from './components/AuthInitializer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnlyRoute from './components/AdminOnlyRoute';
import UserOnlyRoute from './components/UserOnlyRoute';
import WriteupRoute from './components/WriteupRoute'; // ADD THIS IMPORT
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Writeups from './pages/Writeups';
import MyWriteups from './pages/MyWriteups';
import CreateWriteup from './pages/CreateWriteup';
import WriteupView from './pages/WriteupView';
import EditWriteup from './pages/EditWriteup';
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
// IMPORT THE MULTI-QUESTION COMPONENTS
import MultiQuestionPracticeChallengeDetails from './components/admin/practice/MultiQuestionPracticeChallengeDetails';
import MultiLiveEventChallengeDetails from './components/live/MultiLiveEventChallengeDetails';
import LiveEventChallengeDetail from './components/LiveEventChallengeDetail';
import UpcomingChallengePreview from './components/UpcomingChallengePreview';
import UpcomingEventDetails from './components/UpcomingEventDetails';
import LiveEventDetails from './components/LiveEventDetails';
import PastEventDetails from './components/PastEventDetails';
import Navbar from './components/Navbar';
import MigrationPage from './pages/MigrationPage';
import UserProfile from './components/UserProfile';

// Import the new settings pages
import ProfileSettings from './components/ProfileSettings';
import PasswordSettings from './components/PasswordSettings';
import AccountSettings from './components/AccountSettings';

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
                  
                  {/* Migration Tool Route */}
                  <Route path="/migrate-users" element={<MigrationPage />} />
                  
                  {/* Public Routes */}
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/leaderboard/global" element={<GlobalLeaderboard />} />
                  <Route path="/leaderboard/live" element={<LiveLeaderboard />} />
                  <Route path="/writeups" element={<Writeups />} />
                  
                  {/* Writeup Management Route - Protected (Use WriteupRoute for admins too) */}
                  <Route 
                    path="/writeups/my" 
                    element={
                      <ProtectedRoute>
                        <WriteupRoute>
                          <MyWriteups />
                        </WriteupRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Writeup Creation Route - Protected (Use WriteupRoute for admins too) */}
                  <Route 
                    path="/writeups/create" 
                    element={
                      <ProtectedRoute>
                        <WriteupRoute>
                          <CreateWriteup />
                        </WriteupRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Writeup Edit Route - Protected (Use WriteupRoute for admins too) */}
                  <Route 
                    path="/writeups/edit/:id" 
                    element={
                      <ProtectedRoute>
                        <WriteupRoute>
                          <EditWriteup />
                        </WriteupRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Writeup View Route - Public or Protected based on status */}
                  <Route path="/writeups/:id" element={<WriteupView />} />
                  
                  {/* User Profile Route */}
                  <Route path="/profile/:userId" element={<UserProfile />} />
                  
                  {/* Settings Routes - Protected (Keep UserOnlyRoute for settings) */}
                  <Route 
                    path="/settings/profile" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <ProfileSettings />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/settings/password" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <PasswordSettings />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/settings/account" 
                    element={
                      <ProtectedRoute>
                        <UserOnlyRoute>
                          <AccountSettings />
                        </UserOnlyRoute>
                      </ProtectedRoute>
                    } 
                  />
                  
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
                  
                  {/* Practice Routes - Accessible to ALL authenticated users (including admins) */}
                  <Route 
                    path="/practice" 
                    element={
                      <ProtectedRoute>
                        <Practice />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* LIVE CTF Routes - Accessible to ALL authenticated users (including admins) */}
                  <Route 
                    path="/live" 
                    element={
                      <ProtectedRoute>
                        <LiveEvents />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Practice Challenge Detail Routes - Accessible to ALL authenticated users (including admins) */}
                  {/* SINGLE QUESTION CHALLENGES */}
                  <Route 
                    path="/practice/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <PracticeChallengeDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* MULTI-QUESTION CHALLENGES */}
                  <Route 
                    path="/practice/multi/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <MultiQuestionPracticeChallengeDetails />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Live Event Challenge Detail Routes - Accessible to ALL authenticated users (including admins) */}
                  {/* SINGLE QUESTION LIVE EVENT CHALLENGES */}
                  <Route 
                    path="/live-event/:eventId/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <LiveEventChallengeDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* MULTI-QUESTION LIVE EVENT CHALLENGES */}
                  <Route 
                    path="/live-event/:eventId/multi/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <MultiLiveEventChallengeDetails />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Upcoming Challenge Preview Route - Accessible to ALL authenticated users (including admins) */}
                  <Route 
                    path="/event/upcoming/:eventId/challenge/:challengeId" 
                    element={
                      <ProtectedRoute>
                        <UpcomingChallengePreview />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Event Details Routes - Accessible to ALL authenticated users (including admins) */}
                  <Route 
                    path="/event/upcoming/:eventId" 
                    element={
                      <ProtectedRoute>
                        <UpcomingEventDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/event/live/:eventId" 
                    element={
                      <ProtectedRoute>
                        <LiveEventDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/event/past/:eventId" 
                    element={
                      <ProtectedRoute>
                        <PastEventDetails />
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