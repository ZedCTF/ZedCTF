import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, TrendingUp, User, Calendar, Activity, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
}

interface Challenge {
  id: string;
  title: string;
  points: number;
  solvedAt: string;
  category: string;
  difficulty: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  prize: string;
  position: number;
  pointsEarned: number;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  points?: number;
}

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [solvedChallenges, setSolvedChallenges] = useState<Challenge[]>([]);
  const [eventsParticipated, setEventsParticipated] = useState<Event[]>([]);
  const [userActivity, setUserActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  // Fetch user dashboard data from Firestore
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log("Fetching dashboard data for user:", user.uid);

      // 1. Fetch user stats from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data from Firestore:", userData);
        
        setUserStats({
          totalPoints: userData.totalPoints || 0,
          challengesSolved: userData.challengesSolved || 0,
          currentRank: userData.currentRank || 0,
          timeSpent: userData.timeSpent || "0h 0m",
          username: userData.username || user?.email?.split('@')[0] || 'Hacker',
          joinDate: userData.createdAt || user?.metadata.creationTime || new Date().toISOString(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName
        });
      } else {
        console.log("No user document found in Firestore");
        // Set default stats if no user document exists
        setUserStats({
          totalPoints: 0,
          challengesSolved: 0,
          currentRank: 0,
          timeSpent: "0h 0m",
          username: user?.email?.split('@')[0] || 'Hacker',
          joinDate: user?.metadata.creationTime || new Date().toISOString()
        });
      }

      // 2. Fetch solved challenges (you'll need to create this collection later)
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
        setSolvedChallenges(challengesData);
      } catch (error) {
        console.log("No challenges data yet, using empty array");
        setSolvedChallenges([]);
      }

      // 3. Fetch events participated (you'll need to create this collection later)
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
        setEventsParticipated(eventsData);
      } catch (error) {
        console.log("No events data yet, using empty array");
        setEventsParticipated([]);
      }

      // 4. Fetch user activity (you'll need to create this collection later)
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
        setUserActivity(activityData);
      } catch (error) {
        console.log("No activity data yet, using empty array");
        // Add default account creation activity
        setUserActivity([
          {
            id: "1",
            action: "Account Created",
            description: "Welcome to ZedCTF!",
            timestamp: user?.metadata.creationTime || new Date().toISOString()
          }
        ]);
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      // Set fallback data
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
          id: "1",
          action: "Account Created",
          description: "Welcome to ZedCTF!",
          timestamp: user?.metadata.creationTime || new Date().toISOString()
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
          {/* User Welcome Section with Logout */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold">
                    Welcome back,{" "}
                    <span className="text-primary">
                      {userStats?.displayName || user?.displayName || userStats?.username || user?.email?.split('@')[0] || 'Hacker'}
                    </span>
                  </h2>
                  <p className="text-muted-foreground">
                    {user?.email} • Member since{" "}
                    {userStats?.joinDate
                      ? new Date(userStats.joinDate).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoutLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {logoutLoading ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {userStats ? (
              <>
                <Card className="border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Points
                    </CardTitle>
                    <Trophy className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{userStats.totalPoints.toLocaleString()}</div>
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
                    <div className="text-3xl font-bold mb-2">{userStats.challengesSolved}</div>
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
                    <div className="text-3xl font-bold mb-2">#{userStats.currentRank}</div>
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
                    <div className="text-3xl font-bold mb-2">{userStats.timeSpent}</div>
                    <p className="text-xs text-muted-foreground">Total practice time</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Loading state for stats
              [...Array(4)].map((_, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-24 mb-4"></div>
                      <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Solved Challenges */}
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
                    {solvedChallenges.slice(0, 5).map((challenge) => (
                      <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{challenge.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{challenge.category}</span>
                            <span>•</span>
                            <span>{challenge.difficulty}</span>
                            <span>•</span>
                            <span>{new Date(challenge.solvedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-primary font-bold">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Participated */}
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
                    {eventsParticipated.slice(0, 5).map((event) => (
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

            {/* User Activity */}
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
                    {userActivity.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-sm text-muted-foreground">{activity.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleDateString()}
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
    </>
  );
};

export default Dashboard;