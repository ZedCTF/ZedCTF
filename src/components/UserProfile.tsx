import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Target, Calendar, Mail, GraduationCap, Building, Award } from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface UserProfileData {
  id: string;
  displayName: string;
  username: string;
  email: string;
  totalPoints: number;
  challengesSolved: number;
  role: string;
  institution: string;
  bio: string;
  photoURL: string;
  joinDate: any;
  lastActive: any;
}

interface Challenge {
  id: string;
  title: string;
  points: number;
  solvedAt: any;
  category: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Get user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", userId));

        if (!userDoc.exists()) {
          setError("User not found");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const userProfile: UserProfileData = {
          id: userDoc.id,
          displayName: userData.displayName || userData.username || 'Anonymous',
          username: userData.username || '',
          email: userData.email || '',
          totalPoints: userData.totalPoints || 0,
          challengesSolved: userData.challengesSolved || 0,
          role: userData.role || 'user',
          institution: userData.institution || '',
          bio: userData.bio || '',
          photoURL: userData.photoURL || '',
          joinDate: userData.createdAt || userData.joinDate,
          lastActive: userData.lastActive || userData.lastSolvedAt
        };

        setUser(userProfile);

        // Fetch recent challenges solved by this user
        const challengesQuery = query(
          collection(db, "challenges"),
          where("solvedBy", "array-contains", userId)
        );
        
        const challengesSnapshot = await getDocs(challengesQuery);
        const challenges: Challenge[] = [];
        
        challengesSnapshot.forEach(doc => {
          const challengeData = doc.data();
          challenges.push({
            id: doc.id,
            title: challengeData.title || 'Untitled Challenge',
            points: challengeData.points || 0,
            solvedAt: challengeData.solvedAt || new Date(),
            category: challengeData.category || 'general'
          });
        });

        // Sort by solvedAt date (most recent first) and limit to 5
        const sortedChallenges = challenges
          .sort((a, b) => {
            const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate().getTime() : new Date(a.solvedAt);
            const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate().getTime() : new Date(b.solvedAt);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        setRecentChallenges(sortedChallenges);

      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return <GraduationCap className="w-4 h-4" />;
      case 'lecturer': return <Building className="w-4 h-4" />;
      case 'expert': return <Award className="w-4 h-4" />;
      case 'moderator': return <Award className="w-4 h-4" />;
      case 'admin': return <Award className="w-4 h-4" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student': return 'Student';
      case 'lecturer': return 'Lecturer';
      case 'expert': return 'Expert';
      case 'moderator': return 'Moderator';
      case 'admin': return 'Admin';
      default: return 'User';
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "Unknown";
    
    try {
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
        return "Unknown";
      }
      
      if (isNaN(date.getTime())) {
        return "Unknown";
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading user profile...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-6 -ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Card className="max-w-2xl mx-auto">
              <CardContent className="text-center py-16">
                <div className="text-6xl mb-4">😕</div>
                <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  {error || "The user you're looking for doesn't exist or has been removed."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate(-1)}>Go Back</Button>
                  <Button variant="outline" onClick={() => navigate("/leaderboard")}>
                    View Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          {/* User Profile Header */}
          <Card className="max-w-4xl mx-auto mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-primary/20">
                  <AvatarImage src={user.photoURL} alt={user.displayName} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2">{user.displayName}</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {user.role && user.role !== 'user' && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {getRoleIcon(user.role)}
                        <span>{getRoleLabel(user.role)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </div>

                  {user.institution && (
                    <p className="text-muted-foreground mb-3">
                      <Building className="w-4 h-4 inline mr-2" />
                      {user.institution}
                    </p>
                  )}

                  {user.bio && (
                    <p className="text-muted-foreground mb-4">{user.bio}</p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Member since {formatDate(user.joinDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points
                </CardTitle>
                <Trophy className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{user.totalPoints.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Global leaderboard points</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Challenges Solved
                </CardTitle>
                <Target className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{user.challengesSolved}</div>
                <p className="text-xs text-muted-foreground">Total challenges completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Active
                </CardTitle>
                <Calendar className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatDate(user.lastActive)}</div>
                <p className="text-xs text-muted-foreground">Recent activity</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Challenges */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Recently Solved Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No challenges solved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentChallenges.map((challenge) => (
                    <div 
                      key={challenge.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/challenge/${challenge.id}`)}
                    >
                      <div className="flex-1">
                        <div className="font-medium hover:text-primary transition-colors">
                          {challenge.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="capitalize">{challenge.category}</span>
                          <span className="mx-2">•</span>
                          Solved on {formatDate(challenge.solvedAt)}
                        </div>
                      </div>
                      <div className="text-primary font-bold text-lg">+{challenge.points}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default UserProfile;