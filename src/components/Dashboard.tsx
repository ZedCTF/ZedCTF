import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, User, Calendar, Settings, Award, GraduationCap, Users, Target } from "lucide-react";
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

interface Event {
  id: string;
  name: string;
  date: string;
  prize: string;
  position: number;
  pointsEarned: number;
  participants?: string[];
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

  // Format date properly
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
      
      if (isNaN(date.getTime())) {
        return "recently";
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
    } catch (error) {
      console.error("Date formatting error:", error);
      return "recently";
    }
  };

  // Calculate user's REAL rank from global leaderboard
  const calculateUserRank = async (userId: string, userPoints: number) => {
    try {
      console.log("Calculating REAL rank for user:", userId, "with points:", userPoints);
      
      // Get all users sorted by points to get real ranking
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc")
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.log("No users found in database");
        return 1; // If no users, user is rank 1
      }

      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        totalPoints: Number(doc.data().totalPoints) || 0,
        displayName: doc.data().displayName || doc.data().username || 'Anonymous'
      }));

      console.log(`Found ${allUsers.length} users for REAL rank calculation`);

      // Find the user's actual position in the sorted list
      let rank = 1;
      for (let i = 0; i < allUsers.length; i++) {
        if (allUsers[i].id === userId) {
          console.log(`User found at REAL position ${i + 1} in leaderboard`);
          return i + 1; // Return actual position (1-based index)
        }
      }

      // If user not found in the query (shouldn't happen but just in case)
      console.log("User not found in leaderboard query, this shouldn't happen");
      return allUsers.length + 1; // Return last position

    } catch (error) {
      console.error("Error calculating REAL user rank:", error);
      return 0; // Return 0 if unable to calculate
    }
  };

  // Fetch REAL solved challenges for the user
  const fetchSolvedChallenges = async (userId: string) => {
    try {
      // Get all challenges and filter those solved by the user
      const challengesQuery = query(
        collection(db, "challenges"),
        where("isActive", "==", true)
      );
      
      const challengesSnapshot = await getDocs(challengesQuery);
      const solvedChallenges: Challenge[] = [];

      challengesSnapshot.forEach(doc => {
        const challengeData = doc.data();
        // Check if this challenge was solved by the user
        if (challengeData.solvedBy && Array.isArray(challengeData.solvedBy)) {
          if (challengeData.solvedBy.includes(userId)) {
            solvedChallenges.push({
              id: doc.id,
              title: challengeData.title || 'Untitled Challenge',
              points: challengeData.points || 0,
              solvedAt: challengeData.solvedAt || new Date(),
              category: challengeData.category || 'general',
              difficulty: challengeData.difficulty || 'easy'
            });
          }
        }
      });

      // Sort by solvedAt date (most recent first) and limit to 5
      const sortedChallenges = solvedChallenges
        .sort((a, b) => {
          const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate() : new Date(a.solvedAt);
          const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate() : new Date(b.solvedAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);

      console.log(`Found ${sortedChallenges.length} REAL solved challenges`);
      return sortedChallenges;

    } catch (error) {
      console.error("Error fetching REAL solved challenges:", error);
      return [];
    }
  };

  // Fetch REAL events participated
  const fetchEventsParticipated = async (userId: string) => {
    try {
      const eventsQuery = query(
        collection(db, "events")
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const userEvents: Event[] = [];

      eventsSnapshot.forEach(doc => {
        const eventData = doc.data();
        // Check if user participated in this event
        if (eventData.participants && Array.isArray(eventData.participants)) {
          if (eventData.participants.includes(userId)) {
            userEvents.push({
              id: doc.id,
              name: eventData.name || 'Unnamed Event',
              date: eventData.date || 'Unknown date',
              prize: eventData.prize || 'Participation',
              position: eventData.position || 0,
              pointsEarned: eventData.pointsEarned || 0
            });
          }
        }
      });

      // Sort by date (most recent first) and limit to 5
      const sortedEvents = userEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      console.log(`Found ${sortedEvents.length} REAL events participated`);
      return sortedEvents;

    } catch (error) {
      console.error("Error fetching REAL events:", error);
      return [];
    }
  };

  // Fetch REAL user dashboard data from Firestore
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log("Fetching REAL dashboard data for user:", user.uid);

      // 1. Fetch REAL user stats from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("REAL user data from Firestore:", userData);
        
        setUserProfile(userData);
        
        const userPoints = Number(userData.totalPoints) || 0;
        const challengesSolved = Number(userData.challengesSolved) || 0;

        // Calculate REAL rank from global leaderboard
        const actualRank = await calculateUserRank(user.uid, userPoints);

        // Get REAL solved challenges
        const solvedChallenges = await fetchSolvedChallenges(user.uid);

        // Get REAL events participated
        const userEvents = await fetchEventsParticipated(user.uid);

        // Get join date
        let joinDate = userData.createdAt;
        if (!joinDate && user?.metadata?.creationTime) {
          joinDate = user.metadata.creationTime;
        }
        
        setUserStats({
          totalPoints: userPoints,
          challengesSolved: challengesSolved,
          currentRank: actualRank,
          username: userData.username || user?.email?.split('@')[0] || 'Hacker',
          joinDate: joinDate || new Date().toISOString(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          bio: userData.bio,
          role: userData.role,
          institution: userData.institution,
          photoURL: userData.photoURL
        });

        setRecentChallenges(solvedChallenges);
        setEventsParticipated(userEvents);
      } else {
        console.log("No user document found in Firestore");
        const joinDate = user?.metadata?.creationTime || new Date().toISOString();
        
        setUserStats({
          totalPoints: 0,
          challengesSolved: 0,
          currentRank: 0,
          username: user?.email?.split('@')[0] || 'Hacker',
          joinDate: joinDate
        });
        setRecentChallenges([]);
        setEventsParticipated([]);
      }

    } catch (err) {
      console.error("Error fetching REAL dashboard data:", err);
      const joinDate = user?.metadata?.creationTime || new Date().toISOString();
      
      setUserStats({
        totalPoints: 0,
        challengesSolved: 0,
        currentRank: 0,
        username: user?.email?.split('@')[0] || 'Hacker',
        joinDate: joinDate
      });
      setRecentChallenges([]);
      setEventsParticipated([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle profile modal close with refresh
  const handleProfileModalClose = () => {
    setIsProfileModalOpen(false);
    setTimeout(() => {
      fetchDashboardData();
    }, 1000);
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
        <section id="dashboard" className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
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
      <section id="dashboard" className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto">
          {/* User Welcome Section */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary/30">
                    {user?.photoURL || userProfile?.photoURL ? (
                      <img 
                        src={user?.photoURL || userProfile?.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
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
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
                    Welcome back,{" "}
                    <span className="text-primary">
                      {userStats?.displayName || user?.displayName || userStats?.username || user?.email?.split('@')[0] || 'Hacker'}
                    </span>
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground mt-1">
                    <span className="break-all">{user?.email}</span>
                    {userProfile?.role && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(userProfile.role)}
                          <span>{getRoleLabel(userProfile.role)}</span>
                        </div>
                      </>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm">
                      Member since{" "}
                      {formatDate(userStats?.joinDate)}
                    </span>
                  </div>
                  {userProfile?.institution && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {userProfile.institution}
                    </p>
                  )}
                  {userProfile?.bio && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Grid - REAL Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 lg:mb-8">
            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points
                </CardTitle>
                <Trophy className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl lg:text-3xl font-bold mb-2">
                  {userStats?.totalPoints?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">From {userStats?.challengesSolved || 0} solved challenges</p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Global Rank
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl lg:text-3xl font-bold mb-2">
                  {userStats?.currentRank ? `#${userStats.currentRank}` : "Unranked"}
                </div>
                <p className="text-xs text-muted-foreground">Real position on global leaderboard</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Solved Challenges - REAL Data */}
            <Card className="border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Target className="w-5 h-5 text-primary" />
                  Recently Solved Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {recentChallenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base">No challenges solved yet</p>
                    <p className="text-sm mt-2 mb-4">Solve challenges to see them here</p>
                    <button 
                      onClick={() => navigate('/challenges')}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                    >
                      Browse Challenges
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentChallenges.map((challenge) => (
                      <div 
                        key={challenge.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/challenges/${challenge.id}`)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-base hover:text-primary transition-colors">
                            {challenge.title}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="capitalize">{challenge.category}</span>
                            <span>•</span>
                            <span className="capitalize">{challenge.difficulty}</span>
                          </div>
                        </div>
                        <div className="text-primary font-bold text-lg">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Participated - REAL Data */}
            <Card className="border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Calendar className="w-5 h-5 text-primary" />
                  Events Participated In
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {eventsParticipated.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base">No events participated yet</p>
                    <p className="text-sm mt-2 mb-4">Join CTF events to compete</p>
                    <button 
                      onClick={() => navigate('/events')}
                      className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm"
                    >
                      View Events
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventsParticipated.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium text-base">{event.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{formatDate(event.date)}</span>
                            {event.position > 0 && (
                              <>
                                <span>•</span>
                                <span>Position: #{event.position}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary font-bold">{event.prize}</div>
                          {event.pointsEarned > 0 && (
                            <div className="text-sm text-primary">+{event.pointsEarned} pts</div>
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
        onClose={handleProfileModalClose}
      />
    </>
  );
};

export default Dashboard;