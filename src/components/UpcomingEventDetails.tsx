import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, arrayUnion, increment, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useAdminContext } from "../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Calendar, Users, Clock, MapPin, Trophy, Shield, ArrowLeft, CheckCircle, XCircle, Crown, UserPlus, Lock, Eye, BookOpen, Settings, Edit } from "lucide-react";
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
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const UpcomingEventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin, isModerator } = useAdminContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!eventId) {
      console.log("❌ No eventId in URL parameters");
      setMessage({ type: 'error', text: 'Invalid event URL' });
      setLoading(false);
      return;
    }

    console.log("🎯 Loading upcoming event:", eventId);
    
    const fetchData = async () => {
      await fetchEventData();
      await fetchEventChallenges();
    };

    fetchData();
    
    // Real-time listener for event updates
    const eventRef = doc(db, "events", eventId);
    const unsubscribeEvent = onSnapshot(eventRef, 
      (doc) => {
        if (doc.exists()) {
          const eventData = {
            id: doc.id,
            ...doc.data()
          } as Event;
          console.log("📡 Real-time event update:", eventData);
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
        }
      },
      (error) => {
        console.error("💥 Real-time event listener error:", error);
      }
    );
    
    return () => {
      unsubscribeEvent();
    };
  }, [eventId, user, isAdmin, isModerator]);

  // Countdown timer for upcoming event
  useEffect(() => {
    if (!event) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(event.startDate).getTime();
      
      const difference = start - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [event]);

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
        setMessage({ type: 'error', text: 'Event not found' });
      }
    } catch (error: any) {
      console.error("💥 Error fetching event:", error);
      setMessage({ type: 'error', text: `Failed to load event: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventChallenges = async () => {
    if (!eventId) return;

    try {
      let challengesData: Challenge[] = [];

      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId),
        orderBy("points", "asc")
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      
      challengesSnapshot.forEach(doc => {
        const data = doc.data();
        // For upcoming events, show all challenges to owners/admins, but hide from regular users
        if (isEventOwner || data.isActive) {
          challengesData.push({
            id: doc.id,
            title: data.title,
            description: isEventOwner ? data.description : "Challenge details will be available when the event starts",
            category: data.finalCategory || data.category,
            points: data.points,
            difficulty: data.difficulty,
            solvedBy: data.solvedBy,
            isActive: data.isActive,
            eventId: data.eventId,
            challengeType: data.challengeType
          });
        }
      });

      setChallenges(challengesData);
      setChallengesLoaded(true);

    } catch (error) {
      console.error("❌ Error fetching challenges:", error);
      setChallenges([]);
      setChallengesLoaded(true);
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

  const registerForEvent = async () => {
    if (!user || !event) {
      alert("Please log in to register for events");
      navigate('/login');
      return;
    }

    setRegistering(true);
    setMessage(null);

    try {
      const alreadyRegistered = 
        event.participants?.includes(user.uid) || 
        event.registeredUsers?.includes(user.uid);
      
      if (alreadyRegistered) {
        setMessage({ type: 'error', text: 'You are already registered for this event.' });
        setIsRegistered(true);
        return;
      }

      // Check if event is full
      if (event.maxParticipants && getParticipantCount(event) >= event.maxParticipants) {
        setMessage({ type: 'error', text: 'This event is full. Registration is closed.' });
        return;
      }

      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(user.uid),
        totalParticipants: increment(1)
      });

      setIsRegistered(true);
      setMessage({ type: 'success', text: 'Successfully registered for the event!' });
      
    } catch (error: any) {
      console.error("❌ Error registering for event:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to register: ${error.message}. Please try again.` 
      });
    } finally {
      setRegistering(false);
    }
  };

  const navigateToEvents = () => {
    navigate("/live");
  };

  const handleChallengeClick = (challenge: Challenge) => {
    if (isEventOwner) {
      navigate(`/challenge/${challenge.id}`);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Challenges will be available when the event starts.' 
      });
    }
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

  const getCurrencyDisplay = (event: Event): string => {
    return event.currency || 'ZMW';
  };

  const getChallengeAccessStatus = (challenge: Challenge) => {
    if (isEventOwner) {
      return { accessible: true, message: "Admin/Event Owner Access" };
    }
    
    return { accessible: false, message: "Available when event starts" };
  };

  const renderCountdown = () => {
    if (!timeLeft) return null;

    return (
      <Card className="mb-4 border border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-800">Event starts in</span>
            </div>
            <div className="flex items-center gap-3 text-center">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-blue-800">{timeLeft.days}</span>
                  <span className="text-xs text-blue-600">days</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.hours}</span>
                <span className="text-xs text-blue-600">hours</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.minutes}</span>
                <span className="text-xs text-blue-600">mins</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.seconds}</span>
                <span className="text-xs text-blue-600">secs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading upcoming event details...</p>
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
                <h2 className="text-lg font-bold mb-2">Upcoming Event Not Found</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  The upcoming event doesn't exist or has already started.
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
  const currency = getCurrencyDisplay(event);
  const isEventFull = event.maxParticipants && participantCount >= event.maxParticipants;

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
              <Badge className="bg-blue-500 text-blue-foreground">
                UPCOMING
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
                  Registered
                </Badge>
              )}
              {isEventOwner && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Event Owner
                </Badge>
              )}
              {isEventFull && (
                <Badge className="bg-red-500/20 text-red-600 border-red-200 text-xs">
                  Event Full
                </Badge>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {renderCountdown()}

          {/* Event Info */}
          <Card className="mb-4 border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Starts: {formatDateTime(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDateTime(event.endDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{participantCount} registered{event.maxParticipants && ` / ${event.maxParticipants} max`}</span>
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

          {/* Payment Info */}
          {event.requiresParticipantPayment && event.individualPrice && (
            <Card className="mb-4 border border-yellow-200 bg-yellow-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Paid Event
                  </Badge>
                  <span className="text-sm text-yellow-800">
                    Registration fee: {event.individualPrice} {currency}
                  </span>
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
                <Settings className="w-4 h-4 mr-2" />
                Manage Event
              </Button>
            )}
            
            {/* Register Button */}
            {!isRegistered && user && !isEventOwner && !isEventFull && (
              <Button 
                onClick={registerForEvent} 
                disabled={registering}
                className="flex-1"
                variant="terminal"
              >
                {registering ? (
                  <>
                    <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register for Event
                  </>
                )}
              </Button>
            )}

            {!isRegistered && !user && (
              <Button 
                onClick={() => navigate('/login')} 
                className="flex-1"
                variant="terminal"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Login to Register
              </Button>
            )}

            {isEventFull && !isRegistered && (
              <Button disabled variant="outline" className="flex-1">
                Event Full - Registration Closed
              </Button>
            )}

            {isRegistered && (
              <Button disabled variant="outline" className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Already Registered
              </Button>
            )}
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
                    Upcoming Challenges ({challenges.length})
                    <Badge variant="outline" className="text-xs">
                      {isEventOwner ? "Preview Access" : "Available when event starts"}
                    </Badge>
                  </CardTitle>
                  {!isEventOwner && (
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Challenges will unlock automatically when the event starts
                    </CardDescription>
                  )}
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
                      <p className="text-sm text-muted-foreground">No challenges preview available for this event yet.</p>
                      {isEventOwner && (
                        <Button 
                          onClick={manageEvent}
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Add Challenges
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((challenge) => {
                        const access = getChallengeAccessStatus(challenge);
                        return (
                          <Card 
                            key={challenge.id} 
                            className={`border-border transition-colors ${
                              access.accessible ? 'hover:border-primary/30 cursor-pointer' : 'opacity-70 bg-muted/30'
                            }`}
                            onClick={() => access.accessible && handleChallengeClick(challenge)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                  {!access.accessible && (
                                    <div className="flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Locked</span>
                                    </div>
                                  )}
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {challenge.points} pts
                                </Badge>
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
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {challenge.description}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <p className={`text-xs ${
                                  access.accessible ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {access.message}
                                </p>
                                {access.accessible && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Preview
                                  </Button>
                                )}
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
                  <CardTitle className="text-base">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Status</h4>
                    <p className="text-sm text-blue-600 font-medium">Upcoming</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Start Time</h4>
                    <p className="text-sm">{formatDateTime(event.startDate)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">End Time</h4>
                    <p className="text-sm">{formatDateTime(event.endDate)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Registered</h4>
                    <p className="text-sm">{participantCount}{event.maxParticipants && ` / ${event.maxParticipants} max`}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Challenges</h4>
                    <p className="text-sm">{challenges.length} preview</p>
                  </div>
                  {isEventOwner && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Your Role</h4>
                      <p className="text-sm text-purple-600">Event Owner/Admin</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UpcomingEventDetails;