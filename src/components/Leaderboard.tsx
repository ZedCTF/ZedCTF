import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Crown, Users, AlertCircle, Target, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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

export interface CTFTeam {
  rank: number;
  team: string;
  captain: string;
  points: number;
  lastActivity: string;
  challenge: string;
}

interface LeaderboardProps {
  eventName?: string;
}

const Leaderboard = ({ eventName = "CTF Competition" }: LeaderboardProps) => {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [ctfTeams, setCtfTeams] = useState<CTFTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Fetch top users from Firestore based on totalPoints
  const fetchLeaderboardData = async () => {
    try {
      console.log("Fetching leaderboard data from Firestore...");
      setError("");
      
      let usersData: TopUser[] = [];
      let teamsData: CTFTeam[] = [];

      // Fetch Global Leaderboard (Users) - ALL USERS with points
      try {
        const usersQuery = query(
          collection(db, "users"),
          orderBy("totalPoints", "desc"),
          limit(100) // Increased limit to get more users
        );

        const usersSnapshot = await getDocs(usersQuery);
        let rankCounter = 1;
        
        // Get ALL users with points, not just current user
        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          
          // Include ALL users who have points (even if 0, but sorted by points desc)
          // This will naturally show users with highest points first
          usersData.push({
            rank: rankCounter,
            name: userData.displayName || userData.username || userData.email?.split('@')[0] || 'Anonymous',
            email: userData.email || '',
            points: userData.totalPoints || 0,
            userId: doc.id,
            photoURL: userData.photoURL,
            role: userData.role,
            institution: userData.institution
          });
          rankCounter++;
        }

        console.log(`Found ${usersData.length} users for global leaderboard`, usersData);
      } catch (queryError) {
        console.log("Global leaderboard query failed:", queryError);
        setError("Unable to load leaderboard data. Please check Firestore rules.");
      }

      // Fetch LIVE CTF Leaderboard (Teams) - from events
      try {
        const eventsQuery = query(
          collection(db, "events"),
          limit(1)
        );

        const eventsSnapshot = await getDocs(eventsQuery);
        
        if (!eventsSnapshot.empty) {
          const eventData = eventsSnapshot.docs[0].data();
          console.log("Event found:", eventData);
          
          if (eventData.participants && Array.isArray(eventData.participants)) {
            teamsData = eventData.participants
              .filter((participant: any) => participant.points > 0)
              .map((participant: any, index: number) => ({
                rank: index + 1,
                team: participant.teamName || `Team ${index + 1}`,
                captain: participant.captain || participant.displayName || 'Unknown',
                points: participant.points || 0,
                lastActivity: participant.lastActivity || 'Recently',
                challenge: participant.currentChallenge || 'Multiple challenges'
              }))
              .sort((a: CTFTeam, b: CTFTeam) => b.points - a.points)
              .map((team: CTFTeam, index: number) => ({ ...team, rank: index + 1 }));
          }
        }

        console.log(`Found ${teamsData.length} teams for CTF leaderboard`);
      } catch (ctfError) {
        console.log("CTF leaderboard query failed:", ctfError);
      }

      setTopUsers(usersData);
      setCtfTeams(teamsData);
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setError("Failed to load leaderboard data. Please try again later.");
      setTopUsers([]);
      setCtfTeams([]);
    } finally {
      setLoading(false);
    }
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
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-500" />;
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
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  useEffect(() => {
    fetchLeaderboardData(); // Initial fetch
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="leaderboard" className="pt-20 lg:pt-24 pb-16 bg-muted/20 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading leaderboard data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* LIVE CTF Competition Leaderboard */}
      <section id="ctf-leaderboard" className="pt-20 lg:pt-24 pb-16 bg-background min-h-screen">
        <div className="container px-4 mx-auto">
          <div className="mb-6 lg:mb-8 text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-3 lg:mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              {eventName} - <span className="text-primary">Live Scoreboard</span>
            </h2>
            <p className="text-muted-foreground text-sm lg:text-base">
              Real-time competition rankings
            </p>
            {lastUpdated && (
              <Badge variant="outline" className="mt-2 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Updated {lastUpdated}
              </Badge>
            )}
          </div>

          {error && (
            <Alert className="max-w-2xl mx-auto mb-6 bg-yellow-50 border-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-border shadow-lg">
            <CardHeader className="bg-muted/30 p-4 lg:p-6">
              <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <span className="flex items-center gap-2 text-lg lg:text-xl">
                  <Target className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  Live Competition Rankings
                </span>
                <span className="text-sm text-muted-foreground">
                  {ctfTeams.length > 0 ? `${ctfTeams.length} Teams Competing` : 'No active competitions'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ctfTeams.length === 0 ? (
                <div className="text-center py-12 lg:py-16 text-muted-foreground">
                  <Trophy className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base lg:text-lg mb-2">No active competitions</p>
                  <p className="text-sm lg:text-base">Join an event to see live scores</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Cards View */}
                  <div className="lg:hidden space-y-3 p-4">
                    {ctfTeams.map((team) => (
                      <Card key={team.rank} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                team.rank <= 3 ? getRankColor(team.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(team.rank)}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{team.team}</div>
                                <div className="text-xs text-muted-foreground">Capt: {team.captain}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{team.points.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">points</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Last: {team.lastActivity}</span>
                            <span className="truncate max-w-[120px]">{team.challenge}</span>
                          </div>
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
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Team</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Captain</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Points</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Activity</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Challenge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ctfTeams.map((team) => (
                          <tr 
                            key={team.rank} 
                            className="hover:bg-muted/20 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                                team.rank <= 3 ? getRankColor(team.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(team.rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                              {team.team}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                              {team.captain}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-lg font-bold text-primary">
                                {team.points.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {team.lastActivity}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                              {team.challenge}
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
        </div>
      </section>

      {/* Global Leaderboard */}
      <section id="global-leaderboard" className="py-12 lg:py-16 bg-muted/20">
        <div className="container px-4 mx-auto">
          <div className="mb-6 lg:mb-12 text-center">
            <Trophy className="w-12 h-12 lg:w-16 lg:h-16 text-primary mx-auto mb-3 lg:mb-4" />
            <h2 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">
              Global <span className="text-primary">Leaderboard</span>
            </h2>
            <p className="text-muted-foreground text-sm lg:text-base">Top performers based on challenge points</p>
          </div>

          <Card className="border-border shadow-lg">
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
                    This could be due to Firestore rules restrictions or no users have points yet
                  </p>
                  <button 
                    onClick={fetchLeaderboardData}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    Refresh Data
                  </button>
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
                                  />
                                ) : (
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                    {getUserInitials(user.name)}
                                  </AvatarFallback>
                                )}
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
                          <div className="text-xs text-muted-foreground">
                            {user.institution || 'No institution'}
                          </div>
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
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                      {getUserInitials(user.name)}
                                    </AvatarFallback>
                                  )}
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
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Leaderboard;