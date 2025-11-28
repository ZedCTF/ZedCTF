import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useAdminContext } from "../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Calendar, Users, Clock, MapPin, Trophy, Shield, ArrowLeft, CheckCircle, XCircle, Crown, Eye, BookOpen, BarChart3, Award, Target } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface Event {
  id: string;
  name: string;
  title?: string;
  description?: string;
  startDate: string;
  endDate: string;
  participants: string[];
  totalParticipants?: number;
  maxParticipants?: number;
  challengeCount?: number;
  registeredUsers?: string[];
  createdBy?: "admin" | "user";
  createdById?: string;
  location?: string;
  rules?: string;
  prizes?: string;
  status?: string;
  hostingFee?: number;
  hostingPaymentStatus?: string;
  participationType?: "individual" | "team";
  requiresParticipantPayment?: boolean;
  individualPrice?: number;
  currency?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  solvedBy?: string[];
  isActive: boolean;
  eventId?: string;
  challengeType?: 'practice' | 'live' | 'past_event' | 'upcoming';
  finalCategory?: string;
  solveCount?: number;
}

interface UserStats {
  userId: string;
  username: string;
  totalPoints: number;
  challengesSolved: number;
  rank?: number;
}

const PastEventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin, isModerator } = useAdminContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    if (!eventId) {
      console.log("❌ No eventId in URL parameters");
      setMessage({ type: 'error', text: 'Invalid event URL' });
      setLoading(false);
      return;
    }

    console.log("🎯 Loading past event:", eventId);
    
    const fetchData = async () => {
      await fetchEventData();
      await fetchEventChallenges();
      await fetchEventStats();
    };

    fetchData();
  }, [eventId, user, isAdmin, isModerator]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const eventRef = doc(db, "events", eventId!);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
        setEvent(eventData);
        
        if (user) {
          const userRegistered = 
            eventData.participants?.includes(user.uid) || 
            eventData.registeredUsers?.includes(user.uid);
          setIsRegistered(!!userRegistered);
          
          const isOwner = eventData.createdById === user.uid;
          const hasAdminAccess = isAdmin || isModerator;
          setIsEventOwner(isOwner || hasAdminAccess);
        }
      } else {
        setMessage({ type: 'error', text: 'Past event not found' });
      }
    } catch (error: any) {
      console.error("💥 Error fetching past event:", error);
      setMessage({ type: 'error', text: `Failed to load event: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventChallenges = async () => {
    if (!eventId) return;

    try {
      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId),
        orderBy("points", "asc")
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      
      const challengesData: Challenge[] = [];
      challengesSnapshot.forEach(doc => {
        const data = doc.data();
        challengesData.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          category: data.finalCategory || data.category,
          points: data.points,
          difficulty: data.difficulty,
          solvedBy: data.solvedBy || [],
          isActive: data.isActive,
          eventId: data.eventId,
          challengeType: data.challengeType,
          solveCount: data.solvedBy?.length || 0
        });
      });

      setChallenges(challengesData);
      setChallengesLoaded(true);

    } catch (error) {
      console.error("❌ Error fetching challenges:", error);
      setChallenges([]);
      setChallengesLoaded(true);
    }
  };

  const fetchEventStats = async () => {
    if (!eventId) return;

    try {
      // Get all participants
      const eventRef = doc(db, "events", eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        setStatsLoaded(true);
        return;
      }

      const eventData = eventDoc.data();
      const participants = eventData.participants || eventData.registeredUsers || [];
      
      // Calculate stats for each participant
      const statsPromises = participants.map(async (userId: string) => {
        // Get user data
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        const username = userDoc.exists() ? userDoc.data().username || `User${userId.slice(-6)}` : `User${userId.slice(-6)}`;
        
        // Calculate points and solved challenges for this event
        let totalPoints = 0;
        let challengesSolved = 0;
        
        for (const challenge of challenges) {
          if (challenge.solvedBy?.includes(userId)) {
            totalPoints += challenge.points;
            challengesSolved++;
          }
        }
        
        return {
          userId,
          username,
          totalPoints,
          challengesSolved
        };
      });

      const stats = await Promise.all(statsPromises);
      
      // Sort by points (descending) and add ranks
      const sortedStats = stats
        .filter(stat => stat.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((stat, index) => ({
          ...stat,
          rank: index + 1
        }));
      
      setUserStats(sortedStats);
      setStatsLoaded(true);

    } catch (error) {
      console.error("❌ Error fetching event stats:", error);
      setUserStats([]);
      setStatsLoaded(true);
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date/time";
      }
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch {
      return "Invalid date/time";
    }
  };

  const navigateToEvents = () => {
    navigate("/live");
  };

  const handleChallengeClick = (challenge: Challenge) => {
    navigate(`/challenge/${challenge.id}`);
  };

  const manageEvent = () => {
    navigate(`/admin?tab=events&event=${event?.id}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-500/20 text-green-600 border-green-200";
      case "medium": return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
      case "hard": return "bg-red-500/20 text-red-600 border-red-200";
      case "expert": return "bg-purple-500/20 text-purple-600 border-purple-200";
      default: return "bg-gray-500/20 text-gray-600 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      web: "bg-blue-500/20 text-blue-600 border-blue-200",
      crypto: "bg-purple-500/20 text-purple-600 border-purple-200",
      forensics: "bg-orange-500/20 text-orange-600 border-orange-200",
      pwn: "bg-red-500/20 text-red-600 border-red-200",
      reversing: "bg-indigo-500/20 text-indigo-600 border-indigo-200",
      misc: "bg-gray-500/20 text-gray-600 border-gray-200"
    };
    return colors[category.toLowerCase()] || "bg-gray-500/20 text-gray-600 border-gray-200";
  };

  const getParticipantCount = (event: Event): number => {
    if (event.participants && Array.isArray(event.participants)) {
      return event.participants.length;
    }
    if (event.registeredUsers && Array.isArray(event.registeredUsers)) {
      return event.registeredUsers.length;
    }
    return event.totalParticipants || 0;
  };

  const getUserRank = (): number | null => {
    if (!user) return null;
    const userStat = userStats.find(stat => stat.userId === user.uid);
    return userStat?.rank || null;
  };

  const getUserStats = (): UserStats | null => {
    if (!user) return null;
    return userStats.find(stat => stat.userId === user.uid) || null;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading past event details...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <Card className="max-w-md mx-auto border">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h2 className="text-lg font-bold mb-2">Past Event Not Found</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  The past event doesn't exist or may have been removed.
                </p>
                <Button onClick={navigateToEvents} variant="terminal" size="sm">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Events
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const participantCount = getParticipantCount(event);
  const userRank = getUserRank();
  const currentUserStats = getUserStats();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={navigateToEvents} 
                size="sm" 
                className="h-8 px-2 sm:px-3 -ml-2"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Back to Events</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{event.name}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gray-500 text-gray-foreground">
                PAST EVENT
              </Badge>
              {event.createdBy === 'user' && (
                <Badge variant="outline" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Community Hosted
                </Badge>
              )}
              {isRegistered && user && (
                <Badge className="bg-green-500/20 text-green-600 border-green-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Participated
                </Badge>
              )}
              {isEventOwner && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Event Owner
                </Badge>
              )}
            </div>
          </div>

          {/* Event Info */}
          <Card className="mb-4 border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Started: {formatDateTime(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ended: {formatDateTime(event.endDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{participantCount} participants</span>
                </div>
                {event.participationType && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>•</span>
                    <span className="capitalize">{event.participationType}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
              
              {event.description && (
                <div className="mb-3">
                  <h3 className="font-semibold text-sm mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.description}
                  </p>
                </div>
              )}

              {event.prizes && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <h3 className="font-semibold text-sm">Prizes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.prizes}
                  </p>
                </div>
              )}

              {event.rules && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-sm">Rules & Guidelines</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Performance Summary */}
          {isRegistered && currentUserStats && (
            <Card className="mb-4 border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Your Performance</span>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-blue-800">#{userRank}</span>
                      <span className="text-xs text-blue-600">Rank</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-blue-800">{currentUserStats.totalPoints}</span>
                      <span className="text-xs text-blue-600">Points</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-blue-800">{currentUserStats.challengesSolved}</span>
                      <span className="text-xs text-blue-600">Solved</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            {/* Manage Button for Owners/Admins */}
            {isEventOwner && (
              <Button 
                onClick={manageEvent}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            )}
            
            {/* View Leaderboard */}
            <Button 
              onClick={() => navigate(`/leaderboard?event=${event.id}`)}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Full Leaderboard
            </Button>
          </div>

          {message && (
            <Alert className={`mb-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                  {message.text}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Challenges Section */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    Event Challenges ({challenges.length})
                    <Badge variant="outline" className="text-xs">
                      Available for Review
                    </Badge>
                  </CardTitle>
                  {!challengesLoaded && (
                    <CardDescription className="text-xs">
                      Loading challenges...
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {challenges.length === 0 ? (
                    <div className="text-center py-4">
                      <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No challenges available for this event.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((challenge) => {
                        const isSolved = user && challenge.solvedBy?.includes(user.uid);
                        const solveCount = challenge.solveCount || 0;
                        
                        return (
                          <Card 
                            key={challenge.id} 
                            className={`border-border transition-colors hover:border-primary/30 cursor-pointer ${
                              isSolved ? 'border-green-200 bg-green-50' : ''
                            }`}
                            onClick={() => handleChallengeClick(challenge)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                  {isSolved && <CheckCircle className="w-3 h-3 text-green-600" />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {challenge.points} pts
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant="secondary"
                                  className={`${getDifficultyColor(challenge.difficulty)} text-xs`}
                                >
                                  {challenge.difficulty}
                                </Badge>
                                <Badge 
                                  variant="secondary"
                                  className={`${getCategoryColor(challenge.category)} text-xs`}
                                >
                                  {challenge.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Target className="w-3 h-3 mr-1" />
                                  {solveCount} solves
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {challenge.description}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <p className={`text-xs ${isSolved ? 'text-green-600' : 'text-gray-600'}`}>
                                  {isSolved ? 'Solved' : 'Available for review'}
                                </p>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Review
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Event Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Status</h4>
                    <p className="text-sm text-gray-600 font-medium">Completed</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Duration</h4>
                    <p className="text-sm">
                      {formatDateTime(event.startDate).split(',')[0]} - {formatDateTime(event.endDate).split(',')[0]}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Participants</h4>
                    <p className="text-sm">{participantCount}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Challenges</h4>
                    <p className="text-sm">{challenges.length} total</p>
                  </div>
                  {isRegistered && userRank && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Your Rank</h4>
                      <p className="text-sm text-blue-600 font-medium">#{userRank} of {userStats.length}</p>
                    </div>
                  )}
                  {isEventOwner && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Your Role</h4>
                      <p className="text-sm text-purple-600">Event Owner/Admin</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              {userStats.length > 0 && (
                <Card className="border">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      {userStats.slice(0, 5).map((stat, index) => (
                        <div key={stat.userId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono w-6 text-center ${
                              index === 0 ? 'text-yellow-600 font-bold' : 
                              index === 1 ? 'text-gray-600 font-bold' : 
                              index === 2 ? 'text-orange-600 font-bold' : 'text-muted-foreground'
                            }`}>
                              #{stat.rank}
                            </span>
                            <span className="truncate">{stat.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {stat.challengesSolved} solves
                            </span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {stat.totalPoints}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PastEventDetails;