import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Clock, ArrowLeft, Globe, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs, Timestamp } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
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
  lastSolvedAt?: Timestamp | null;
  joinDate?: Timestamp | null;
}

const GlobalLeaderboard = () => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 users per page

  // Ranking algorithm with tie-breaking
  const calculateRanks = (usersData: TopUser[]): TopUser[] => {
    if (usersData.length === 0) return [];
    
    // Filter out admin users
    const nonAdminUsers = usersData.filter(user => user.role !== 'admin');
    
    // Sort with tie-breaking logic
    const sortedUsers = [...nonAdminUsers].sort((a, b) => {
      // 1. Primary sort: points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // 2. Secondary sort: last solved timestamp (descending - most recent first)
      const aTime = a.lastSolvedAt ? 
                   (a.lastSolvedAt instanceof Timestamp ? a.lastSolvedAt.toMillis() : 
                    (a.lastSolvedAt as any)?.toDate?.()?.getTime() || 0) : 0;
      const bTime = b.lastSolvedAt ? 
                   (b.lastSolvedAt instanceof Timestamp ? b.lastSolvedAt.toMillis() : 
                    (b.lastSolvedAt as any)?.toDate?.()?.getTime() || 0) : 0;
      
      if (aTime !== bTime) {
        return bTime - aTime; // Most recent first
      }
      
      // 3. Tertiary sort: name (alphabetical) for consistent ordering
      return (a.name || '').localeCompare(b.name || '');
    });
    
    // Calculate ranks with proper tie handling
    const rankedUsers: TopUser[] = [];
    
    sortedUsers.forEach((user, index) => {
      // Check if this user has the same points as previous user
      if (index === 0) {
        // First user always gets rank 1
        rankedUsers.push({ ...user, rank: 1 });
      } else if (user.points === sortedUsers[index - 1].points) {
        // Same points as previous user - check if also same timestamp for true tie
        const currentTime = user.lastSolvedAt ? 
                          (user.lastSolvedAt instanceof Timestamp ? user.lastSolvedAt.toMillis() : 
                           (user.lastSolvedAt as any)?.toDate?.()?.getTime() || 0) : 0;
        const prevTime = sortedUsers[index - 1].lastSolvedAt ? 
                        (sortedUsers[index - 1].lastSolvedAt instanceof Timestamp ? sortedUsers[index - 1].lastSolvedAt.toMillis() : 
                         (sortedUsers[index - 1].lastSolvedAt as any)?.toDate?.()?.getTime() || 0) : 0;
        
        if (currentTime === prevTime) {
          // True tie - same rank as previous user
          rankedUsers.push({ ...user, rank: rankedUsers[index - 1].rank });
        } else {
          // Different timestamps - new rank
          rankedUsers.push({ ...user, rank: index + 1 });
        }
      } else {
        // Different points - new rank
        rankedUsers.push({ ...user, rank: index + 1 });
      }
    });
    
    return rankedUsers;
  };

  // Fetch top users from Firestore with additional data for tie-breaking
  const fetchLeaderboardData = async () => {
    try {
      console.log("Fetching global leaderboard data from Firestore...");
      
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc"),
        limit(200) // Increased limit to capture more users
      );

      try {
        const unsubscribeListener = onSnapshot(usersQuery, 
          (snapshot) => {
            console.log(`Real-time update received: ${snapshot.size} users`);
            
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
              const userRole = userData.role || 'user';
              
              // IMPORTANT: Get timestamps properly for tie-breaking
              let lastSolvedAt = null;
              if (userData.lastSolvedAt) {
                lastSolvedAt = userData.lastSolvedAt instanceof Timestamp ? 
                              userData.lastSolvedAt : 
                              (userData.lastSolvedAt?.toDate ? userData.lastSolvedAt : null);
              }
              
              let joinDate = null;
              if (userData.createdAt) {
                joinDate = userData.createdAt instanceof Timestamp ? 
                          userData.createdAt : 
                          (userData.createdAt?.toDate ? userData.createdAt : null);
              }
              
              usersData.push({
                rank: 0,
                name: userData.displayName || 
                      userData.username || 
                      userData.email?.split('@')[0] || 
                      'Anonymous',
                email: userData.email || '',
                points: userPoints,
                userId: doc.id,
                photoURL: userData.photoURL,
                role: userRole,
                institution: userData.institution,
                lastSolvedAt: lastSolvedAt,
                joinDate: joinDate
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
            console.error("Error code:", error.code, "Message:", error.message);
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
        limit(200) // Increased limit
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
        const userRole = userData.role || 'user';
        
        // Get timestamps properly
        let lastSolvedAt = null;
        if (userData.lastSolvedAt) {
          lastSolvedAt = userData.lastSolvedAt instanceof Timestamp ? 
                        userData.lastSolvedAt : 
                        (userData.lastSolvedAt?.toDate ? userData.lastSolvedAt : null);
        }
        
        let joinDate = null;
        if (userData.createdAt) {
          joinDate = userData.createdAt instanceof Timestamp ? 
                    userData.createdAt : 
                    (userData.createdAt?.toDate ? userData.createdAt : null);
        }
        
        usersData.push({
          rank: 0,
          name: userData.displayName || 
                userData.username || 
                userData.email?.split('@')[0] || 
                'Anonymous',
          email: userData.email || '',
          points: userPoints,
          userId: doc.id,
          photoURL: userData.photoURL,
          role: userRole,
          institution: userData.institution,
          lastSolvedAt: lastSolvedAt,
          joinDate: joinDate
        });
      });

      const rankedUsers = calculateRanks(usersData);
      console.log(`One-time fetch: ${rankedUsers.length} users ranked`);
      
      setTopUsers(rankedUsers);
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (queryError: any) {
      console.error("One-time fetch also failed:", queryError);
      setTopUsers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1); // Reset to first page on refresh
    
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    fetchLeaderboardData();
  };

  // Get rank display - different badges for 1st, 2nd, 3rd
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <span className="font-bold text-yellow-600 text-lg mt-1">#{rank}</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-gray-400" />
          </div>
          <span className="font-bold text-gray-500 text-lg mt-1">#{rank}</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <span className="font-bold text-amber-600 text-lg mt-1">#{rank}</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <span className="font-bold text-muted-foreground text-lg">#{rank}</span>
          </div>
        </div>
      );
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

  // Navigate to user profile
  const navigateToUserProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const navigateBack = () => {
    navigate("/leaderboard");
  };

  // Calculate paginated users
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = topUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(topUsers.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
    
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

          <Card className="border-border shadow-lg max-w-4xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-4 lg:p-6">
              <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <span className="flex items-center gap-2 text-lg lg:text-xl">
                  <Users className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  Top Platform Hackers
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {topUsers.length > 0 ? `${topUsers.length} Players` : 'No players found'}
                  </span>
                  {totalPages > 1 && (
                    <span className="text-xs text-primary font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>
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
                <>
                  <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Player</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {currentUsers.map((user) => (
                            <tr 
                              key={user.userId} 
                              className={`hover:bg-muted/20 transition-all duration-200 cursor-pointer ${
                                user.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''
                              }`}
                              onClick={() => navigateToUserProfile(user.userId)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getRankDisplay(user.rank)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12 border-2 border-primary/20">
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
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                                      {getUserInitials(user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-semibold text-foreground text-lg hover:text-primary transition-colors">
                                      {user.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-2xl font-bold text-primary">
                                  {user.points.toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="lg:hidden space-y-3 p-4">
                      {currentUsers.map((user) => (
                        <Card 
                          key={user.userId} 
                          className="border-border hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => navigateToUserProfile(user.userId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div>
                                  {getRankDisplay(user.rank)}
                                </div>
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
                                  <div className="font-semibold text-foreground text-base hover:text-primary transition-colors">
                                    {user.name}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-primary">{user.points.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">points</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              Tap to view profile
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border p-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, topUsers.length)} of {topUsers.length} players
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={prevPage}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Show current page and nearby pages
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => paginate(pageNum)}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={nextPage}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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
                        ✓ Click on any player to view their profile and detailed stats
                      </span>
                      <span className="block mt-1 text-primary font-medium">
                        ✓ Tie-breaking: Users with same points are ranked by most recent activity
                      </span>
                      <span className="block mt-1 text-primary font-medium">
                        ✓ Updates in real-time when users earn points
                      </span>
                      <span className="block mt-1 text-primary font-medium">
                        ✓ Showing top 200 players
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