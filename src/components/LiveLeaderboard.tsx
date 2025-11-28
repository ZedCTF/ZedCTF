import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Users, AlertCircle, Clock, ArrowLeft, Zap, Crown, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

interface LiveEvent {
  id: string;
  name: string;
  title?: string;
  status: string;
  participants: number;
  startDate: string;
  endDate: string;
}

const LiveLeaderboard = () => {
  const navigate = useNavigate();
  const [ctfTeams, setCtfTeams] = useState<CTFTeam[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Fetch live events
  const fetchLiveEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, "events"),
        where("status", "in", ["live", "active", "LIVE"]),
        orderBy("startDate", "desc")
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData: LiveEvent[] = [];

      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          name: data.name,
          title: data.title,
          status: data.status,
          participants: data.participants?.length || data.totalParticipants || 0,
          startDate: data.startDate,
          endDate: data.endDate
        });
      });

      setLiveEvents(eventsData);
      
      // Auto-select first event if available
      if (eventsData.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsData[0].id);
      }

      return eventsData;
    } catch (error) {
      console.error("Error fetching live events:", error);
      return [];
    }
  };

  // Fetch event-specific leaderboard data
  const fetchEventLeaderboard = async (eventId: string) => {
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

  const fetchLeaderboardData = async () => {
    try {
      setError("");
      
      const events = await fetchLiveEvents();
      
      if (events.length === 0) {
        setCtfTeams([]);
        setLoading(false);
        return;
      }

      // If no event selected but events exist, use first one
      const eventToUse = selectedEvent || events[0]?.id;
      if (eventToUse) {
        await fetchEventLeaderboard(eventToUse);
      }

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setError("Failed to load leaderboard data. Please try again later.");
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

  const navigateBack = () => {
    navigate("/leaderboard");
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    setLoading(true);
    fetchEventLeaderboard(eventId).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaderboardData(); // Initial fetch
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboardData, 30000);
    
    return () => clearInterval(interval);
  }, [selectedEvent]);

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-20 lg:pt-24 pb-16 bg-muted/20 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading live leaderboard data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const currentEvent = liveEvents.find(event => event.id === selectedEvent) || liveEvents[0];

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
              <Zap className="w-12 h-12 text-primary mx-auto mb-3 lg:mb-4" />
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                Live CTF <span className="text-primary">Leaderboard</span>
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

          {/* Event Selector */}
          {liveEvents.length > 0 && (
            <Card className="border-border shadow-sm max-w-4xl mx-auto mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Active Event:</span>
                  </div>
                  <select 
                    value={selectedEvent}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="flex-1 max-w-md px-3 py-2 border border-border rounded-md text-sm bg-background"
                  >
                    {liveEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title || event.name} ({event.participants} participants)
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-lg max-w-4xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-4 lg:p-6">
              <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <span className="flex items-center gap-2 text-lg lg:text-xl">
                  <Target className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  Live Competition Rankings
                  {currentEvent && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {currentEvent.title || currentEvent.name}
                    </Badge>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {ctfTeams.length > 0 ? `${ctfTeams.length} Participants` : 'No participants found'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {liveEvents.length === 0 ? (
                <div className="text-center py-12 lg:py-16 text-muted-foreground">
                  <Zap className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base lg:text-lg mb-2">No Live Events</p>
                  <p className="text-sm lg:text-base">
                    There are currently no active CTF competitions. Check back later for live events.
                  </p>
                </div>
              ) : ctfTeams.length === 0 ? (
                <div className="text-center py-12 lg:py-16 text-muted-foreground">
                  <Trophy className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base lg:text-lg mb-2">No scores available</p>
                  <p className="text-sm lg:text-base">
                    Scores will appear once participants start solving challenges
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

          {/* Info Card */}
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="border-border bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">About Live CTF Leaderboard</h4>
                    <p className="text-xs text-muted-foreground">
                      This leaderboard shows real-time rankings for currently active CTF competitions only. 
                      Scores update automatically as participants solve challenges during the event.
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

export default LiveLeaderboard;