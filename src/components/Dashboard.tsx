import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Trophy, 
  TrendingUp, 
  User, 
  Calendar, 
  Settings, 
  Award, 
  GraduationCap, 
  Users, 
  Target,
  ExternalLink,
  Key,
  Shield
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface UserStats {
  totalPoints: number;
  challengesSolved: number;
  currentRank: number;
  username: string;
  joinDate: string;
  displayName?: string;
  bio?: string;
  role?: string;
  institution?: string;
  photoURL?: string;
  country?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  prize: string;
  position: number;
  pointsEarned: number;
}

interface Challenge {
  id: string;
  title: string;
  points: number;
  solvedAt: any;
  category: string;
  difficulty: string;
}

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [eventsParticipated, setEventsParticipated] = useState<Event[]>([]);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-4 h-4" />;
      case 'lecturer':
        return <Users className="w-4 h-4" />;
      case 'expert':
        return <Award className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
        return 'Student';
      case 'lecturer':
        return 'Lecturer';
      case 'expert':
        return 'Expert';
      default:
        return 'General User';
    }
  };

  // Format date
  const formatDate = (dateInput: any) => {
    try {
      if (!dateInput) return "recently";
      
      let date: Date;
      
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        date = new Date();
      }
      
      if (isNaN(date.getTime())) return "recently";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
    } catch (error) {
      return "recently";
    }
  };

  // Calculate rank
  const calculateUserRank = async (userId: string) => {
    try {
      const usersQuery = query(collection(db, "users"), orderBy("totalPoints", "desc"));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) return 1;

      let rank = 1;
      for (const doc of usersSnapshot.docs) {
        if (doc.id === userId) return rank;
        rank++;
      }

      return rank;
    } catch (error) {
      return 0;
    }
  };

  // Fetch solved challenges
  const fetchSolvedChallenges = async (userId: string) => {
    try {
      const challengesQuery = query(
        collection(db, "challenges"),
        where("isActive", "==", true),
        where("solvedBy", "array-contains", userId)
      );
      
      const challengesSnapshot = await getDocs(challengesQuery);
      const solvedChallenges: Challenge[] = [];

      challengesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.solvedBy?.includes(userId)) {
          solvedChallenges.push({
            id: doc.id,
            title: data.title || 'Untitled',
            points: data.points || 0,
            solvedAt: data.solvedAt || new Date(),
            category: data.category || 'general',
            difficulty: data.difficulty || 'easy'
          });
        }
      });

      return solvedChallenges
        .sort((a, b) => {
          const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate() : new Date(a.solvedAt);
          const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate() : new Date(b.solvedAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  // Fetch events
  const fetchEventsParticipated = async (userId: string) => {
    try {
      const eventsQuery = query(collection(db, "events"));
      const eventsSnapshot = await getDocs(eventsQuery);
      const userEvents: Event[] = [];

      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants?.includes(userId)) {
          userEvents.push({
            id: doc.id,
            name: data.name || 'Unnamed Event',
            date: data.date || 'Unknown',
            prize: data.prize || 'Participation',
            position: data.position || 0,
            pointsEarned: data.pointsEarned || 0
          });
        }
      });

      return userEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        
        const points = Number(userData.totalPoints) || 0;
        const solvedChallenges = await fetchSolvedChallenges(user.uid);
        const challengesSolved = solvedChallenges.length;
        const rank = await calculateUserRank(user.uid);
        const userEvents = await fetchEventsParticipated(user.uid);
        const joinDate = userData.createdAt || user?.metadata?.creationTime || new Date().toISOString();
        
        setUserStats({
          totalPoints: points,
          challengesSolved: challengesSolved,
          currentRank: rank,
          username: userData.username || user?.email?.split('@')[0] || 'User',
          joinDate: joinDate,
          displayName: userData.displayName,
          bio: userData.bio,
          role: userData.role,
          institution: userData.institution,
          photoURL: userData.photoURL,
          country: userData.country
        });

        setRecentChallenges(solvedChallenges);
        setEventsParticipated(userEvents);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const navigateToMyProfile = () => user && navigate(`/profile/${user.uid}`);
  const navigateToPracticeChallenge = (id: string) => navigate(`/practice/challenge/${id}`);
  const navigateToProfileSettings = () => navigate('/settings/profile');
  const navigateToPasswordSettings = () => navigate('/settings/password');
  const navigateToAccountSettings = () => navigate('/settings/account');

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {userStats?.displayName || userStats?.username}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={navigateToMyProfile}
                  className="px-4 py-2 border border-border hover:bg-muted transition-colors rounded-lg flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Public Profile
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={navigateToProfileSettings}
                className="p-4 border border-border rounded-lg hover:bg-card transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Profile Settings</p>
                    <p className="text-sm text-muted-foreground">Update your profile details</p>
                  </div>
                </div>
              </button>

              <button
                onClick={navigateToPasswordSettings}
                className="p-4 border border-border rounded-lg hover:bg-card transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Change or reset password</p>
                  </div>
                </div>
              </button>

              <button
                onClick={navigateToAccountSettings}
                className="p-4 border border-border rounded-lg hover:bg-card transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Account</p>
                    <p className="text-sm text-muted-foreground">Manage account settings</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Total Points</CardTitle>
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{userStats?.totalPoints?.toLocaleString() || "0"}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {userStats?.challengesSolved || 0} solved challenges
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Global Rank</CardTitle>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {userStats?.currentRank ? `#${userStats.currentRank}` : "Unranked"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Global leaderboard position</p>
                <button 
                  onClick={() => navigate("/leaderboard/global")}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  View leaderboard →
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Recent Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentChallenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No challenges solved yet</p>
                    <button 
                      onClick={() => navigate('/practice')}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      Browse Challenges
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentChallenges.map((challenge) => (
                      <div 
                        key={challenge.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigateToPracticeChallenge(challenge.id)}
                      >
                        <div>
                          <div className="font-medium hover:text-primary transition-colors">
                            {challenge.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {challenge.category} • {challenge.difficulty}
                          </div>
                        </div>
                        <div className="text-primary font-bold">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsParticipated.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events participated yet</p>
                    <button 
                      onClick={() => navigate('/live')}
                      className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm"
                    >
                      View Events
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventsParticipated.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(event.date)} • Position: #{event.position}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-secondary font-medium">{event.prize}</span>
                          {event.pointsEarned > 0 && (
                            <span className="text-primary text-sm">+{event.pointsEarned} pts</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Dashboard;