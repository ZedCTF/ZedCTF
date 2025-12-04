import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, AlertCircle, Clock, ArrowLeft, Globe, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export interface TopUser {
  rank: number;
  name: string;
  email: string;
  points: number;
  userId: string;
  photoURL?: string;
  role?: string;
  institution?: string;
}

const GlobalLeaderboard = () => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Calculate ranks with tie handling
  const calculateRanks = (usersData: TopUser[]): TopUser[] => {
    if (usersData.length === 0) return [];
    
    // Sort by points descending
    const sortedUsers = [...usersData].sort((a, b) => b.points - a.points);
    
    let rankCounter = 1;
    let previousPoints: number | null = null;
    let sameRankCount = 0;
    
    return sortedUsers.map((user, index) => {
      const userPoints = user.points || 0;
      
      // Calculate rank with tie handling
      let currentRank = rankCounter;
      if (previousPoints === userPoints) {
        sameRankCount++;
      } else {
        rankCounter += sameRankCount + 1;
        sameRankCount = 0;
        currentRank = rankCounter;
      }
      previousPoints = userPoints;
      
      return {
        ...user,
        rank: currentRank
      };
    });
  };

  // Fetch top users from Firestore based on totalPoints
  const fetchLeaderboardData = async () => {
    try {
      console.log("Fetching global leaderboard data from Firestore...");
      setError("");
      
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc"),
        limit(100)
      );

      // Try to set up real-time listener first
      try {
        const unsubscribeListener = onSnapshot(usersQuery, 
          (snapshot) => {
            console.log("Real-time update received for leaderboard");
            
            if (snapshot.empty) {
              console.log("No users found in database");
              setTopUsers([]);
              setLastUpdated(new Date().toLocaleTimeString());
              return;
            }

            const usersData: TopUser[] = [];
            
            snapshot.forEach((doc) => {
              const userData = doc.data();
              const userPoints = userData.totalPoints || 0;
              
              usersData.push({
                rank: 0, // Will be calculated by calculateRanks
                name: userData.displayName || 
                      userData.username || 
                      userData.email?.split('@')[0] || 
                      'Anonymous',
                email: userData.email || '',
                points: userPoints,
                userId: doc.id,
                photoURL: userData.photoURL,
                role: userData.role,
                institution: userData.institution
              });
            });

            const rankedUsers = calculateRanks(usersData);
            console.log(`Real-time update: ${rankedUsers.length} users ranked`);
            
            setTopUsers(rankedUsers);
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
            setIsRefreshing(false);
          },
          (error) => {
            console.error("Real-time listener error:", error);
            
            // Provide specific error messages
            if (error.code === 'permission-denied') {
              setError("Permission denied. Please ensure Firestore rules allow public reading of users collection.");
            } else if (error.code === 'failed-precondition') {
              setError("Firestore index required. Please create a composite index for 'users/totalPoints' in Firebase Console.");
            } else {
              setError(`Unable to set up real-time updates: ${error.message || 'Unknown error'}`);
            }
            
            // Fall back to one-time fetch if real-time fails
            console.log("Falling back to one-time fetch due to listener error");
            handleOneTimeFetch();
          }
        );
        
        setUnsubscribe(() => unsubscribeListener);
        return;
        
      } catch (listenerError: any) {
        console.error("Failed to set up real-time listener:", listenerError);
        handleOneTimeFetch();
      }

    } catch (error: any) {
      console.error("Unexpected error fetching leaderboard data:", error);
      setError(`Failed to load leaderboard data: ${error.message || 'Please try again later.'}`);
      setTopUsers([]);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fallback one-time fetch
  const handleOneTimeFetch = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc"),
        limit(100)
      );

      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.log("No users found in database");
        setTopUsers([]);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const usersData: TopUser[] = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userPoints = userData.totalPoints || 0;
        
        usersData.push({
          rank: 0, // Will be calculated by calculateRanks
          name: userData.displayName || 
                userData.username || 
                userData.email?.split('@')[0] || 
                'Anonymous',
          email: userData.email || '',
          points: userPoints,
          userId: doc.id,
          photoURL: userData.photoURL,
          role: userData.role,
          institution: userData.institution
        });
      });

      const rankedUsers = calculateRanks(usersData);
      console.log(`One-time fetch: ${rankedUsers.length} users ranked`);
      
      setTopUsers(rankedUsers);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (queryError: any) {
      console.error("One-time fetch also failed:", queryError);
      
      if (queryError.code === 'permission-denied') {
        setError("Permission denied. Please ensure Firestore rules allow public reading of users collection.");
      } else if (queryError.code === 'failed-precondition') {
        setError("Firestore index required. Please create a composite index for 'users/totalPoints' in Firebase Console.");
      } else {
        setError(`Unable to load leaderboard data: ${queryError.message || 'Unknown error'}`);
      }
      
      setTopUsers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Clean up existing listener
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    fetchLeaderboardData();
  };

  // Get rank display - show badges for top 3, numbers for others
  const getRankDisplay = (rank: number) => {
    if (rank <= 3) {
      return (
        <div className="flex items-center justify-center gap-1">
          {getRankBadge(rank)}
          <span className="text-white font-bold text-sm">#{rank}</span>
        </div>
      );
    } else {
      return <span className="font-bold text-white text-sm">#{rank}</span>;
    }
  };

  // Get badge icon based on rank
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Trophy className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Trophy className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  // Get rank color for background
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-br from-yellow-500 to-yellow-600";
      case 2:
        return "bg-gradient-to-br from-gray-500 to-gray-600";
      case 3:
        return "bg-gradient-to-br from-amber-600 to-amber-700";
      default:
        return "bg-primary";
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const navigateBack = () => {
    navigate("/leaderboard");
  };

  useEffect(() => {
    fetchLeaderboardData();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (loading && !isRefreshing) {
    return (
      <>
        <Navbar />
        <section className="pt-20 lg:pt-24 pb-16 bg-muted/20 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading global leaderboard data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      <section className="pt-20 lg:pt-24 pb-16 bg-background min-h-screen">
        <div className="container px-4 mx-auto">
          <div className="mb-6 lg:mb-8">
            <Button 
              variant="ghost" 
              onClick={navigateBack}
              className="mb-4 -ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leaderboards
            </Button>
            
            <div className="text-center">
              <Globe className="w-12 h-12 text-primary mx-auto mb-3 lg:mb-4" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                Global <span className="text-primary">Leaderboard</span>
              </h2>
              <p className="text-muted-foreground text-sm lg:text-base">
                Top performers based on all-time challenge points
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {lastUpdated && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Updated {lastUpdated}
                  </Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-xs"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="max-w-2xl mx-auto mb-6 bg-yellow-50 border-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                {error}
                <div className="mt-2 text-xs">
                  <strong>Firebase Console Steps:</strong>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Go to Firebase Console → Firestore Database</li>
                    <li>Click "Indexes" tab</li>
                    <li>Create composite index: Collection: "users", Fields: "totalPoints" DESC</li>
                    <li>Wait 1-5 minutes for index to build</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-border shadow-lg max-w-4xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-4 lg:p-6">
              <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <span className="flex items-center gap-2 text-lg lg:text-xl">
                  <Users className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  Top Platform Hackers
                </span>
                <span className="text-sm text-muted-foreground">
                  {topUsers.length > 0 ? `${topUsers.length} Players` : 'No players found'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topUsers.length === 0 ? (
                <div className="text-center py-12 lg:py-16 text-muted-foreground">
                  <Trophy className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base lg:text-lg mb-2">No users found in leaderboard</p>
                  <p className="text-sm lg:text-base mb-4">
                    Start solving challenges to earn points and appear on the leaderboard!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh Data
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/challenges")}
                    >
                      View Challenges
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Cards View */}
                  <div className="lg:hidden space-y-3 p-4">
                    {topUsers.map((user) => (
                      <Card key={user.userId} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                user.rank <= 3 ? getRankColor(user.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(user.rank)}
                              </div>
                              <Avatar className="w-8 h-8 border-2 border-primary/20">
                                {user.photoURL ? (
                                  <img 
                                    src={user.photoURL} 
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Hide image on error, will show fallback
                                      const img = e.target as HTMLImageElement;
                                      img.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                  {getUserInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground text-sm">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.role || 'Hacker'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{user.points.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">points</div>
                            </div>
                          </div>
                          {user.institution && (
                            <div className="text-xs text-muted-foreground">
                              {user.institution}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Player</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Institution</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {topUsers.map((user) => (
                          <tr 
                            key={user.userId} 
                            className={`hover:bg-muted/20 transition-all duration-200 ${
                              user.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                                user.rank <= 3 ? getRankColor(user.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(user.rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border-2 border-primary/20">
                                  {user.photoURL ? (
                                    <img 
                                      src={user.photoURL} 
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        img.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                    {getUserInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.role || 'Hacker'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {user.institution || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-xl font-bold text-primary">
                                {user.points.toLocaleString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="border-border bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">About Global Leaderboard</h4>
                    <p className="text-xs text-muted-foreground">
                      This leaderboard tracks overall performance across all events and challenges on the platform. 
                      Points are accumulated from all completed challenges regardless of event participation.
                      <span className="block mt-1 text-primary font-medium">
                        ✓ Updates in real-time when users earn points
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default GlobalLeaderboard;