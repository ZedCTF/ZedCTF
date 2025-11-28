import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Crown, Users, AlertCircle, Target, Clock, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";

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
  name: string;
  points: number;
  userId: string;
  photoURL?: string;
  role?: string;
  institution?: string;
  status?: string;
  progress?: string;
}

interface LeaderboardProps {
  eventName?: string;
}

const Leaderboard = ({ eventName = "CTF Competition" }: LeaderboardProps) => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [ctfTeams, setCtfTeams] = useState<CTFTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentEvent, setCurrentEvent] = useState<any>(null);

  // Fetch current event data if eventId is provided
  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (eventDoc.exists()) {
        setCurrentEvent({ id: eventId, ...eventDoc.data() });
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    }
  };

  // Fetch REAL event-specific leaderboard data
  const fetchEventLeaderboard = async () => {
    if (!eventId) return;
    
    try {
      // Get event participants
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (!eventDoc.exists()) {
        setCtfTeams([]);
        return;
      }
      
      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      // Fetch user data for each participant and calculate REAL scores
      const teamData: CTFTeam[] = [];
      
      for (const userId of participants) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get REAL event-specific points
            const eventPoints = userData.eventPoints?.[eventId] || 0;
            
            // Determine status and progress
            const status = "Active now";
            const progress = eventPoints > 0 ? "Multiple challenges" : "No challenges solved";
            
            // Include all participants, even with 0 points
            teamData.push({
              rank: 0, // Will be set after sorting
              name: userData.displayName || userData.username || userData.email?.split('@')[0] || 'Anonymous',
              points: eventPoints,
              userId: userId,
              photoURL: userData.photoURL,
              role: userData.role,
              institution: userData.institution,
              status: status,
              progress: progress
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      // Sort by points and assign ranks
      const sortedTeams = teamData
        .sort((a, b) => b.points - a.points)
        .map((team, index) => ({ ...team, rank: index + 1 }));
        
      setCtfTeams(sortedTeams);
      console.log("Real CTF teams data:", sortedTeams);
      
    } catch (error) {
      console.error("Error fetching event leaderboard:", error);
      setCtfTeams([]);
    }
  };

  // Fetch top users from Firestore based on totalPoints
  const fetchLeaderboardData = async () => {
    try {
      console.log("Fetching leaderboard data from Firestore...");
      setError("");
      
      let usersData: TopUser[] = [];

      // If eventId is provided, fetch event-specific leaderboard
      if (eventId) {
        await fetchEventData();
        await fetchEventLeaderboard();
      } else {
        // Fetch Global Leaderboard (Users) - ALL USERS with points
        try {
          const usersQuery = query(
            collection(db, "users"),
            orderBy("totalPoints", "desc"),
            limit(100)
          );

          const usersSnapshot = await getDocs(usersQuery);
          let rankCounter = 1;
          
          for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            
            // Include users with any points (including 0)
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

        // For global view, try to get data from active events
        try {
          const eventsQuery = query(
            collection(db, "events"),
            where("status", "in", ["live", "active", "LIVE", "approved"]),
            limit(1)
          );

          const eventsSnapshot = await getDocs(eventsQuery);
          
          if (!eventsSnapshot.empty) {
            const eventDoc = eventsSnapshot.docs[0];
            await fetchEventLeaderboardForEvent(eventDoc.id);
          } else {
            // No active events, clear CTF teams
            setCtfTeams([]);
          }
        } catch (ctfError) {
          console.log("CTF leaderboard query failed:", ctfError);
          setCtfTeams([]);
        }
      }

      if (!eventId) {
        setTopUsers(usersData);
      }
      
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

  // Helper function to fetch event leaderboard for a specific event
  const fetchEventLeaderboardForEvent = async (specificEventId: string) => {
    try {
      const eventDoc = await getDoc(doc(db, "events", specificEventId));
      if (!eventDoc.exists()) {
        setCtfTeams([]);
        return;
      }
      
      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      const teamData: CTFTeam[] = [];
      
      for (const userId of participants) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const eventPoints = userData.eventPoints?.[specificEventId] || 0;
            
            // Determine status and progress
            const status = "Active now";
            const progress = eventPoints > 0 ? "Multiple challenges" : "No challenges solved";
            
            teamData.push({
              rank: 0,
              name: userData.displayName || userData.username || userData.email?.split('@')[0] || 'Anonymous',
              points: eventPoints,
              userId: userId,
              photoURL: userData.photoURL,
              role: userData.role,
              institution: userData.institution,
              status: status,
              progress: progress
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      const sortedTeams = teamData
        .sort((a, b) => b.points - a.points)
        .map((team, index) => ({ ...team, rank: index + 1 }));
        
      setCtfTeams(sortedTeams);
      
    } catch (error) {
      console.error("Error fetching event leaderboard:", error);
      setCtfTeams([]);
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

  const navigateBack = () => {
    if (eventId) {
      navigate(`/event/${eventId}`);
    } else {
      navigate("/events");
    }
  };

  useEffect(() => {
    fetchLeaderboardData(); // Initial fetch
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboardData, 30000);
    
    return () => clearInterval(interval);
  }, [eventId]);

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

  const displayEventName = currentEvent?.name || eventName;

  return (
    <>
      <Navbar />
      
      {/* LIVE CTF Competition Leaderboard */}
      <section id="ctf-leaderboard" className="pt-20 lg:pt-24 pb-16 bg-background min-h-screen">
        <div className="container px-4 mx-auto">
          <div className="mb-6 lg:mb-8">
            <Button 
              variant="ghost" 
              onClick={navigateBack}
              className="mb-4 -ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {eventId ? 'Event' : 'Events'}
            </Button>
            
            <div className="text-center">
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3 lg:mb-4" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                {displayEventName} - <span className="text-primary">Live Scoreboard</span>
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
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-4 lg:p-6">
              <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <span className="flex items-center gap-2 text-lg lg:text-xl">
                  <Target className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  Live Competition Rankings
                </span>
                <span className="text-sm text-muted-foreground">
                  {ctfTeams.length > 0 ? `${ctfTeams.length} Participants` : 'No participants found'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ctfTeams.length === 0 ? (
                <div className="text-center py-12 lg:py-16 text-muted-foreground">
                  <Trophy className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base lg:text-lg mb-2">No scores available</p>
                  <p className="text-sm lg:text-base">
                    {eventId ? 'Scores will appear once participants start solving challenges' : 'No active competitions with scores'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Cards View */}
                  <div className="lg:hidden space-y-3 p-4">
                    {ctfTeams.map((player) => (
                      <Card key={player.userId} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                player.rank <= 3 ? getRankColor(player.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(player.rank)}
                              </div>
                              <Avatar className="w-8 h-8 border-2 border-primary/20">
                                {player.photoURL ? (
                                  <img 
                                    src={player.photoURL} 
                                    alt={player.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                    {getUserInitials(player.name)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground text-sm">{player.name}</div>
                                <div className="text-xs text-muted-foreground">{player.role || 'Hacker'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{player.points.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">points</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{player.institution || 'No institution'}</span>
                            <span>{player.status || 'Active'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {player.progress || 'No progress'}
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
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Player/Team</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Player Name</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Points</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ctfTeams.map((player) => (
                          <tr 
                            key={player.userId} 
                            className={`hover:bg-muted/20 transition-all duration-200 ${
                              player.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                                player.rank <= 3 ? getRankColor(player.rank) : 'bg-muted'
                              }`}>
                                {getRankDisplay(player.rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border-2 border-primary/20">
                                  {player.photoURL ? (
                                    <img 
                                      src={player.photoURL} 
                                      alt={player.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                      {getUserInitials(player.name)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {player.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {player.role || 'Hacker'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {player.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-xl font-bold text-primary">
                                {player.points.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-200">
                                {player.status || 'Active now'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {player.progress || 'Multiple challenges'}
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

      {/* Global Leaderboard - Only show if not viewing event-specific leaderboard */}
      {!eventId && (
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
      )}

      <Footer />
    </>
  );
};

export default Leaderboard;