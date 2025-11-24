import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, TrendingUp, User, Calendar, Activity, Settings, Award, BookOpen, GraduationCap, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProfileModal from "./ProfileModal";

interface UserStats {
  totalPoints: number;
  challengesSolved: number;
  currentRank: number;
  timeSpent: string;
  username: string;
  joinDate: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  role?: string;
  institution?: string;
  photoURL?: string;
}

interface Challenge {
  id: string;
  title: string;
  points: number;
  solvedAt: any;
  category: string;
  difficulty: string;
  solvedBy?: string[];
}

interface Event {
  id: string;
  name: string;
  date: string;
  prize: string;
  position: number;
  pointsEarned: number;
  participants?: string[];
}

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: any;
  points?: number;
  userId?: string;
}

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [solvedChallenges, setSolvedChallenges] = useState<Challenge[]>([]);
  const [eventsParticipated, setEventsParticipated] = useState<Event[]>([]);
  const [userActivity, setUserActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  // Fetch user dashboard data from Firestore
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log("Fetching real dashboard data for user:", user.uid);

      // 1. Fetch user stats from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("Real user data from Firestore:", userData);
        
        setUserProfile(userData);
        
        setUserStats({
          totalPoints: userData.totalPoints || 0,
          challengesSolved: userData.challengesSolved || 0,
          currentRank: userData.currentRank || 0,
          timeSpent: userData.timeSpent || "0h 0m",
          username: userData.username || user?.email?.split('@')[0] || 'Hacker',
          joinDate: userData.createdAt || user?.metadata.creationTime || new Date().toISOString(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          bio: userData.bio,
          role: userData.role,
          institution: userData.institution,
          photoURL: userData.photoURL
        });
      } else {
        console.log("No user document found in Firestore");
        // Set real default stats from Firebase Auth
        setUserStats({
          totalPoints: 0,
          challengesSolved: 0,
          currentRank: 0,
          timeSpent: "0h 0m",
          username: user?.email?.split('@')[0] || 'Hacker',
          joinDate: user?.metadata.creationTime || new Date().toISOString()
        });
      }

      // 2. Fetch real solved challenges
      try {
        const challengesQuery = query(
          collection(db, "challenges"),
          where("solvedBy", "array-contains", user.uid),
          orderBy("solvedAt", "desc"),
          limit(5)
        );
        const challengesSnapshot = await getDocs(challengesQuery);
        const challengesData = challengesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Challenge[];
        
        console.log("Real solved challenges:", challengesData);
        setSolvedChallenges(challengesData);
      } catch (error) {
        console.log("No challenges collection or no solved challenges yet");
        setSolvedChallenges([]);
      }

      // 3. Fetch real events participated
      try {
        const eventsQuery = query(
          collection(db, "events"),
          where("participants", "array-contains", user.uid),
          orderBy("date", "desc"),
          limit(5)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];
        
        console.log("Real events participated:", eventsData);
        setEventsParticipated(eventsData);
      } catch (error) {
        console.log("No events collection or no events participated yet");
        setEventsParticipated([]);
      }

      // 4. Fetch real user activity
      try {
        const activityQuery = query(
          collection(db, "activity"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const activitySnapshot = await getDocs(activityQuery);
        const activityData = activitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        
        console.log("Real user activity:", activityData);
        setUserActivity(activityData);
      } catch (error) {
        console.log("No activity collection yet, creating default activity");
        // Create default account creation activity in Firestore
        const defaultActivity: Activity = {
          id: "welcome",
          action: "Account Created",
          description: "Welcome to ZedCTF! Start your cybersecurity journey.",
          timestamp: user?.metadata.creationTime || new Date(),
          userId: user.uid
        };
        setUserActivity([defaultActivity]);
      }

    } catch (err) {
      console.error("Error fetching real dashboard data:", err);
      // Set real fallback data from Firebase Auth
      setUserStats({
        totalPoints: 0,
        challengesSolved: 0,
        currentRank: 0,
        timeSpent: "0h 0m",
        username: user?.email?.split('@')[0] || 'Hacker',
        joinDate: user?.metadata.creationTime || new Date().toISOString()
      });
      setSolvedChallenges([]);
      setEventsParticipated([]);
      setUserActivity([
        {
          id: "welcome",
          action: "Account Created",
          description: "Welcome to ZedCTF! Start your cybersecurity journey.",
          timestamp: user?.metadata.creationTime || new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="dashboard" className="pt-24 pb-16 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section id="dashboard" className="pt-24 pb-16 min-h-screen">
        <div className="container px-4 mx-auto">
          {/* User Welcome Section - Removed Logout Button */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary/30">
                    {user?.photoURL || userProfile?.photoURL ? (
                      <img 
                        src={user?.photoURL || userProfile?.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 hover:bg-primary/90 transition-colors"
                    title="Edit Profile"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <h2 className="text-4xl font-bold">
                    Welcome back,{" "}
                    <span className="text-primary">
                      {userStats?.displayName || user?.displayName || userStats?.username || user?.email?.split('@')[0] || 'Hacker'}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{user?.email}</span>
                    {userProfile?.role && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(userProfile.role)}
                          <span>{getRoleLabel(userProfile.role)}</span>
                        </div>
                      </>
                    )}
                    <span>•</span>
                    <span>Member since{" "}
                      {userStats?.joinDate
                        ? new Date(userStats.joinDate).toLocaleDateString()
                        : "recently"}
                    </span>
                  </div>
                  {userProfile?.institution && (
                    <p className="text-sm text-muted-foreground">
                      {userProfile.institution}
                    </p>
                  )}
                  {userProfile?.bio && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Grid - Real Data Only */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points
                </CardTitle>
                <Trophy className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {userStats?.totalPoints?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime points earned</p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Challenges Solved
                </CardTitle>
                <Target className="w-5 h-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {userStats?.challengesSolved || "0"}
                </div>
                <p className="text-xs text-muted-foreground">Total challenges completed</p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Rank
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  #{userStats?.currentRank || "0"}
                </div>
                <p className="text-xs text-muted-foreground">Global leaderboard position</p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Time Spent
                </CardTitle>
                <Clock className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {userStats?.timeSpent || "0h 0m"}
                </div>
                <p className="text-xs text-muted-foreground">Total practice time</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Solved Challenges - Real Data Only */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Recently Solved Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {solvedChallenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No challenges solved yet</p>
                    <p className="text-sm mt-2">Start practicing to see your progress here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solvedChallenges.map((challenge) => (
                      <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{challenge.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{challenge.category}</span>
                            <span>•</span>
                            <span>{challenge.difficulty}</span>
                            <span>•</span>
                            <span>
                              {challenge.solvedAt ? new Date(challenge.solvedAt.toDate ? challenge.solvedAt.toDate() : challenge.solvedAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                        <div className="text-primary font-bold">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Participated - Real Data Only */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Events Participated In
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsParticipated.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events participated yet</p>
                    <p className="text-sm mt-2">Join live events to appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventsParticipated.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{event.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{event.date}</span>
                            {event.position && <span>• Position: #{event.position}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary font-bold">{event.prize}</div>
                          {event.pointsEarned > 0 && (
                            <div className="text-xs text-primary">+{event.pointsEarned} pts</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Activity - Real Data Only */}
            <Card className="border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm mt-2">Your activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-sm text-muted-foreground">{activity.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {activity.timestamp ? new Date(activity.timestamp.toDate ? activity.timestamp.toDate() : activity.timestamp).toLocaleDateString() : 'Recently'}
                          </div>
                          {activity.points && (
                            <div className="text-sm text-primary font-bold">+{activity.points}</div>
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

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default Dashboard;