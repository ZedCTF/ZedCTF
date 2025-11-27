// src/components/EventDetails.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, arrayUnion, increment, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Calendar, Users, Zap, Clock, MapPin, Trophy, Shield, ArrowLeft, CheckCircle, XCircle, Crown, UserPlus } from "lucide-react";
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
}

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!eventId) {
      console.log("❌ No eventId in URL parameters");
      setMessage({ type: 'error', text: 'Invalid event URL' });
      setLoading(false);
      return;
    }

    console.log("🎯 Loading event:", eventId);
    
    const fetchData = async () => {
      await fetchEventData();
      await fetchEventChallenges();
    };

    fetchData();
    
    // Real-time listener for event updates
    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, 
      (doc) => {
        if (doc.exists()) {
          const eventData = {
            id: doc.id,
            ...doc.data()
          } as Event;
          console.log("📡 Real-time update:", eventData);
          setEvent(eventData);
          
          // Check registration status only if user is logged in
          if (user) {
            const userRegistered = 
              eventData.participants?.includes(user.uid) || 
              eventData.registeredUsers?.includes(user.uid);
            setIsRegistered(!!userRegistered);
          }
        }
      },
      (error) => {
        console.error("💥 Real-time listener error:", error);
      }
    );
    
    return () => unsubscribe();
  }, [eventId, user]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching event data for:", eventId);
      
      const eventRef = doc(db, "events", eventId!);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
        console.log("✅ Event found:", eventData);
        setEvent(eventData);
        
        // Check if user is registered - only if user is logged in
        if (user) {
          const userRegistered = 
            eventData.participants?.includes(user.uid) || 
            eventData.registeredUsers?.includes(user.uid);
          setIsRegistered(!!userRegistered);
          console.log("👤 User registration status:", userRegistered);
        }
      } else {
        console.log("❌ Event not found in Firestore");
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
      console.log("🔄 Fetching challenges for event:", eventId);
      
      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId),
        where("isActive", "==", true),
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
          category: data.category,
          points: data.points,
          difficulty: data.difficulty,
          solvedBy: data.solvedBy,
          isActive: data.isActive,
          eventId: data.eventId
        });
      });

      console.log("✅ Challenges fetched:", challengesData.length);
      setChallenges(challengesData);
    } catch (error) {
      console.error("❌ Error fetching challenges:", error);
      setChallenges([]);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid time";
      }
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return "Invalid time";
    }
  };

  const getEventStatus = (startDate: string, endDate: string): "UPCOMING" | "LIVE" | "ENDED" => {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "UPCOMING";
      }

      if (now < start) return "UPCOMING";
      if (now > end) return "ENDED";
      return "LIVE";
    } catch {
      return "UPCOMING";
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
      // Check if already registered
      const alreadyRegistered = 
        event.participants?.includes(user.uid) || 
        event.registeredUsers?.includes(user.uid);
      
      if (alreadyRegistered) {
        setMessage({ type: 'error', text: 'You are already registered for this event.' });
        setIsRegistered(true);
        return;
      }

      console.log("📝 Attempting registration for user:", user.uid);
      
      // Update event with new registration - use participants array
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(user.uid),
        totalParticipants: increment(1)
      });

      console.log("✅ Registration successful");
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

  const joinEvent = () => {
    if (!event) return;
    
    if (!isRegistered) {
      setMessage({ type: 'error', text: 'You need to register for this event first.' });
      return;
    }

    const eventStatus = getEventStatus(event.startDate, event.endDate);
    if (eventStatus !== "LIVE") {
      setMessage({ type: 'error', text: 'This event is not currently live.' });
      return;
    }

    // Navigate to competition page
    navigate(`/competition/${event.id}`);
  };

  const navigateToEvents = () => {
    navigate("/events");
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

  // Calculate participant count
  const getParticipantCount = (event: Event): number => {
    if (event.participants && Array.isArray(event.participants)) {
      return event.participants.length;
    }
    if (event.registeredUsers && Array.isArray(event.registeredUsers)) {
      return event.registeredUsers.length;
    }
    return event.totalParticipants || 0;
  };

  // Safe currency display
  const getCurrencyDisplay = (event: Event): string => {
    return event.currency || 'ZMW';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading event details...</p>
              <p className="text-xs text-muted-foreground mt-1">Event ID: {eventId}</p>
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
                <h2 className="text-lg font-bold mb-2">Event Not Found</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  Event ID: {eventId}
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  The event doesn't exist or you don't have permission to view it.
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

  const eventStatus = getEventStatus(event.startDate, event.endDate);
  const isEventLive = eventStatus === "LIVE";
  const isEventEnded = eventStatus === "ENDED";
  const isEventUpcoming = eventStatus === "UPCOMING";
  const participantCount = getParticipantCount(event);
  const currency = getCurrencyDisplay(event);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Mobile-optimized header */}
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
              <Badge 
                className={
                  isEventLive ? "bg-primary text-primary-foreground" : 
                  isEventEnded ? "bg-destructive text-destructive-foreground" : 
                  "bg-blue-500 text-blue-foreground"
                }
              >
                {eventStatus}
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
            </div>
          </div>

          {/* Mobile-optimized event info */}
          <Card className="mb-4 border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDate(event.endDate)} at {formatTime(event.endDate)}</span>
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
              </div>
              
              {event.description && (
                <p className="text-sm text-muted-foreground leading-relaxed break-words">
                  {event.description}
                </p>
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
            {isEventLive && isRegistered && user && (
              <Button onClick={joinEvent} className="bg-primary flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Join Event Now
              </Button>
            )}
            {isEventUpcoming && !isRegistered && user && (
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
            {isEventUpcoming && !user && (
              <Button 
                onClick={() => navigate('/login')} 
                className="flex-1"
                variant="terminal"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Login to Register
              </Button>
            )}
            {isEventEnded && (
              <Button disabled variant="outline" className="flex-1">
                Event Ended
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

          {/* Mobile-optimized main content */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Main Content - Full width on mobile */}
            <div className="lg:col-span-2 space-y-4">
              {/* Challenges Section */}
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    Event Challenges ({challenges.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {challenges.length === 0 ? (
                    <div className="text-center py-4">
                      <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No challenges available for this event yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Check back later or contact the event organizer.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((challenge) => (
                        <Card 
                          key={challenge.id} 
                          className="border-border hover:border-primary/30 cursor-pointer transition-colors"
                          onClick={() => user && navigate(`/challenge/${challenge.id}`)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-sm">{challenge.title}</h3>
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
                            {!user && (
                              <p className="text-xs text-blue-600 mt-2">
                                Login to view challenge details
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Full width on mobile, sticky on desktop */}
            <div className="space-y-4">
              {/* Event Info Card */}
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Status</h4>
                    <p className="capitalize text-sm">{eventStatus.toLowerCase()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Duration</h4>
                    <p className="text-sm">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Participants</h4>
                    <p className="text-sm">{participantCount} registered{event.maxParticipants && ` of ${event.maxParticipants} max`}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Challenges</h4>
                    <p className="text-sm">{challenges.length} available</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Participation</h4>
                    <p className="text-sm capitalize">{event.participationType || 'individual'}</p>
                  </div>
                  {event.requiresParticipantPayment && event.individualPrice && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Fee</h4>
                      <p className="text-sm">{event.individualPrice} {currency}</p>
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

export default EventDetails;