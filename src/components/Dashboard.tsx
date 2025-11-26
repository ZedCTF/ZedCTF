import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, TrendingUp, User, Calendar, Settings, Award, GraduationCap, Users } from "lucide-react";
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

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [solvedChallenges, setSolvedChallenges] = useState<Challenge[]>([]);
  const [eventsParticipated, setEventsParticipated] = useState<Event[]>([]);
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

  // Format date properly - simplified version
  const formatDate = (dateInput: any) => {
    try {
      if (!dateInput) return "recently";
      
      let date: Date;
      
      // If it's already a Date object
      if (dateInput instanceof Date) {
        date = dateInput;
      }
      // If it's a Firestore timestamp with toDate method
      else if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      }
      // If it's a string (ISO string or other date string)
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }
      // If it's a number (timestamp)
      else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      }
      // Fallback to current date
      else {
        date = new Date();
      }
      
      // Check if date is valid
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

  // Format Firestore timestamp for solved challenges
  const formatFirestoreTimestamp = (timestamp: any) => {
    try {
      let date: Date;
      
      // Handle Firestore timestamp object
      if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle regular date string or ISO string
      else if (timestamp) {
        date = new Date(timestamp);
      }
      // Fallback
      else {
        return 'Recently';
      }
      
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Recently';
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
        
        // Fix challengesSolved to ensure it's a number
        const challengesSolved = typeof userData.challengesSolved === 'number' 
          ? userData.challengesSolved 
          : (userData.challengesSolved ? parseInt(userData.challengesSolved) || 0 : 0);

        // Get join date - prioritize user document, fallback to auth metadata
        let joinDate = userData.createdAt;
        if (!joinDate && user?.metadata?.creationTime) {
          joinDate = user.metadata.creationTime;
        }
        
        setUserStats({
          totalPoints: userData.totalPoints || 0,
          challengesSolved: challengesSolved,
          currentRank: userData.currentRank || 0,
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
      } else {
        console.log("No user document found in Firestore");
        // Set real default stats from Firebase Auth
        const joinDate = user?.metadata?.creationTime || new Date().toISOString();
        
        setUserStats({
          totalPoints: 0,
          challengesSolved: 0,
          currentRank: 0,
          username: user?.email?.split('@')[0] || 'Hacker',
          joinDate: joinDate
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

    } catch (err) {
      console.error("Error fetching real dashboard data:", err);
      // Set real fallback data from Firebase Auth
      const joinDate = user?.metadata?.creationTime || new Date().toISOString();
      
      setUserStats({
        totalPoints: 0,
        challengesSolved: 0,
        currentRank: 0,
        username: user?.email?.split('@')[0] || 'Hacker',
        joinDate: joinDate
      });
      setSolvedChallenges([]);
      setEventsParticipated([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle profile modal close with refresh
  const handleProfileModalClose = () => {
    setIsProfileModalOpen(false);
    // Refresh data after profile update
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
          {/* User Welcome Section - Mobile Optimized */}
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

          {/* Statistics Grid - Only 2 Cards Now */}
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
                <p className="text-xs text-muted-foreground">From correct challenge solutions</p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Rank
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl lg:text-3xl font-bold mb-2">
                  #{userStats?.currentRank || "0"}
                </div>
                <p className="text-xs text-muted-foreground">Global leaderboard position</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Solved Challenges */}
            <Card className="border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Target className="w-5 h-5 text-primary" />
                  Recently Solved Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {solvedChallenges.length === 0 ? (
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
                    {solvedChallenges.map((challenge) => (
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
                            <span>•</span>
                            <span>
                              {formatFirestoreTimestamp(challenge.solvedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-primary font-bold text-lg">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Participated */}
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
                            <span>{event.date}</span>
                            {event.position && (
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