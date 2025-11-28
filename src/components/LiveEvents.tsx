import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Zap, Calendar, Crown, CreditCard, Trophy, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, addDoc, getDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LiveEvent {
  id: string;
  name: string;
  title?: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  participants: number;
  totalParticipants?: number;
  timeLeft: string;
  startDate: string;
  endDate: string;
  challengeCount?: number;
  registeredUsers?: string[];
  description?: string;
  createdBy?: "admin" | "user";
  createdById?: string;
  hostingFee?: number;
  hostingPaymentStatus?: "pending" | "paid" | "not_required";
}

interface UpcomingEvent {
  id: string;
  name: string;
  title?: string;
  date: string;
  startDate: string;
  participants: number;
  totalParticipants?: number;
  registered: boolean;
  maxParticipants?: number;
  maxIndividuals?: number;
  description?: string;
  registeredUsers?: string[];
  createdBy?: "admin" | "user";
  hostingFee?: number;
  challengeCount?: number;
}

interface PastEvent {
  id: string;
  name: string;
  title?: string;
  startDate: string;
  endDate: string;
  participants: number;
  challengeCount?: number;
  createdBy?: "admin" | "user";
  winners?: { rank: number; name: string; points: number }[];
  finalScores?: { rank: number; name: string; points: number }[];
}

interface TopPlayer {
  rank: number;
  name: string;
  points: number;
  userId: string;
}

const LiveEvents = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [showHostingDialog, setShowHostingDialog] = useState(false);
  const [eventName, setEventName] = useState("");
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);

  // Fetch user role from Firestore
  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || "user");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("user");
    }
  };

  // Calculate time left until event starts or ends
  const calculateTimeLeft = (startDate: string, endDate: string): string => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      const diff = start.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (now > end) {
      return "00:00:00";
    } else {
      const diff = end.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Determine event status based on current time
  const getEventStatus = (startDate: string, endDate: string): "LIVE" | "UPCOMING" | "ENDED" => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now >= start && now <= end) {
      return "LIVE";
    } else if (now < start) {
      return "UPCOMING";
    } else {
      return "ENDED";
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Clean event name - remove trailing zeros and trim
  const cleanEventName = (name: string): string => {
    if (!name) return "Untitled Event";
    // Remove trailing zeros and whitespace
    return name.replace(/0+$/, '').trim();
  };

  // Fetch challenges count for an event
  const fetchChallengeCount = async (eventId: string): Promise<number> => {
    try {
      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId)
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      return challengesSnapshot.size;
    } catch (error) {
      console.error("Error fetching challenge count:", error);
      return 0;
    }
  };

  // Fetch top players for live events
  const fetchTopPlayers = async (eventId: string): Promise<TopPlayer[]> => {
    try {
      // Get event participants
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (!eventDoc.exists()) return [];
      
      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      // Fetch user data and calculate scores
      const playerData: TopPlayer[] = [];
      
      for (const userId of participants.slice(0, 10)) { // Limit to top 10 for performance
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Calculate event-specific points
            const eventPoints = userData.eventPoints?.[eventId] || 
                               userData.totalPoints || 
                               0;
            
            playerData.push({
              rank: 0, // Will be set after sorting
              name: userData.displayName || userData.username || userData.email?.split('@')[0] || 'Anonymous',
              points: eventPoints,
              userId: userId
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      // Sort by points and assign ranks
      return playerData
        .sort((a, b) => b.points - a.points)
        .map((player, index) => ({ ...player, rank: index + 1 }))
        .slice(0, 3); // Only return top 3
      
    } catch (error) {
      console.error("Error fetching top players:", error);
      return [];
    }
  };

  // Fetch final scores for past events
  const fetchFinalScores = async (eventId: string): Promise<{ rank: number; name: string; points: number }[]> => {
    try {
      // Get event participants
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (!eventDoc.exists()) return [];
      
      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      // Fetch user data and calculate final scores
      const scoresData: { rank: number; name: string; points: number }[] = [];
      
      for (const userId of participants) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const eventPoints = userData.eventPoints?.[eventId] || 0;
            
            if (eventPoints > 0) {
              scoresData.push({
                rank: 0, // Will be set after sorting
                name: userData.displayName || userData.username || userData.email?.split('@')[0] || 'Anonymous',
                points: eventPoints
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user data for final scores:", error);
        }
      }
      
      // Sort by points and assign ranks
      return scoresData
        .sort((a, b) => b.points - a.points)
        .map((score, index) => ({ ...score, rank: index + 1 }));
      
    } catch (error) {
      console.error("Error fetching final scores:", error);
      return [];
    }
  };

  // Fetch events from Firestore
  const fetchEventsData = async () => {
    try {
      setError(null);
      
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("startDate", "asc")
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      console.log("Total events found:", eventsSnapshot.size);

      const now = new Date();
      const liveData: LiveEvent[] = [];
      const upcomingData: UpcomingEvent[] = [];
      const pastData: PastEvent[] = [];

      // Process events in parallel for better performance
      const eventProcessing = eventsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        if (!data.startDate || !data.endDate) {
          console.log("Skipping event - missing dates:", data.name);
          return;
        }

        // Filter approved events on client side instead of query
        const status = data.status?.toLowerCase();
        if (status !== 'approved' && status !== 'live' && status !== 'upcoming' && status !== 'ended') {
          return;
        }

        const eventStatus = getEventStatus(data.startDate, data.endDate);
        
        // Get challenge count for the event
        const challengeCount = await fetchChallengeCount(doc.id);

        // Clean the event name and title
        const cleanedName = cleanEventName(data.name);
        const cleanedTitle = data.title ? cleanEventName(data.title) : undefined;

        console.log("Event data:", {
          id: doc.id,
          originalName: data.name,
          originalTitle: data.title,
          cleanedName,
          cleanedTitle,
          participants: data.totalParticipants || data.participants?.length || 0,
          challengeCount
        });

        const baseEvent = {
          id: doc.id,
          name: cleanedName,
          title: cleanedTitle,
          status: eventStatus,
          participants: data.totalParticipants || data.participants?.length || 0,
          timeLeft: calculateTimeLeft(data.startDate, data.endDate),
          startDate: data.startDate,
          endDate: data.endDate,
          challengeCount: challengeCount,
          registeredUsers: data.registeredUsers,
          description: data.description,
          createdBy: data.createdBy,
          createdById: data.createdById,
          hostingFee: data.hostingFee,
          hostingPaymentStatus: data.hostingPaymentStatus
        };

        if (eventStatus === "LIVE") {
          liveData.push(baseEvent);
        } else if (eventStatus === "UPCOMING") {
          upcomingData.push({
            ...baseEvent,
            date: `${formatDate(data.startDate)} at ${formatTime(data.startDate)}`,
            registered: user ? (data.registeredUsers?.includes(user.uid) || false) : false,
            maxParticipants: data.maxIndividuals,
            maxIndividuals: data.maxIndividuals
          });
        } else if (eventStatus === "ENDED") {
          // Fetch final scores for past events
          const finalScores = await fetchFinalScores(doc.id);
          
          pastData.push({
            id: doc.id,
            name: cleanedName,
            title: cleanedTitle,
            startDate: data.startDate,
            endDate: data.endDate,
            participants: data.totalParticipants || data.participants?.length || 0,
            challengeCount: challengeCount,
            createdBy: data.createdBy,
            winners: data.winners || [],
            finalScores: finalScores
          });
        }
      });

      await Promise.all(eventProcessing);

      setLiveEvents(liveData);
      setUpcomingEvents(upcomingData);
      setPastEvents(pastData);

      // Fetch top players for the first live event
      if (liveData.length > 0) {
        const topPlayersData = await fetchTopPlayers(liveData[0].id);
        setTopPlayers(topPlayersData);
      }

    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const joinLiveEvent = async (eventId: string) => {
    if (!user) {
      alert("Please log in to join events");
      return;
    }

    try {
      const event = liveEvents.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error("Event not found");
      }

      // Check if user is already registered
      const isRegistered = event.registeredUsers?.includes(user.uid);
      
      if (!isRegistered) {
        alert("You need to register for this event first before joining");
        return;
      }

      navigate(`/competition/${eventId}`);
    } catch (error: any) {
      console.error('Failed to join live event:', error);
      alert(`Failed to join event: ${error.message}`);
    }
  };

  const navigateToAdmin = () => {
    navigate("/admin");
  };

  const navigateToEventDetails = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const navigateToLeaderboard = (eventId?: string) => {
    if (eventId) {
      navigate(`/leaderboard/${eventId}`);
    } else {
      navigate("/leaderboard");
    }
  };

  // Open hosting dialog
  const openHostingDialog = () => {
    setShowHostingDialog(true);
    setEventName("");
  };

  // Process Flutterwave payment for event hosting
  const processHostingPayment = async () => {
    if (!user || !eventName.trim()) {
      alert("Please enter an event name");
      return;
    }
    
    setProcessingPayment(true);

    try {
      // Create hosting request in Firestore with pending status
      const hostRequestRef = await addDoc(collection(db, "hostRequests"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        eventName: eventName.trim(),
        hostingFee: 5,
        status: "pending_payment",
        submittedAt: new Date(),
        paymentMethod: "flutterwave_mobile_money",
        type: "event_hosting"
      });

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the host request to paid status
      await updateDoc(hostRequestRef, {
        status: "paid",
        paidAt: new Date()
      });

      // Create the event with user as owner
      const eventData = {
        name: eventName.trim(),
        title: eventName.trim(),
        createdBy: "user",
        createdById: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || user.email,
        status: "draft",
        hostingFee: 5,
        hostingPaymentStatus: "paid",
        participants: [],
        registeredUsers: [],
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default: 7 days from now
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // Default: 8 days from now
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const eventRef = await addDoc(collection(db, "events"), eventData);

      setShowHostingDialog(false);
      
      // Redirect to event management after successful payment
      navigate(`/admin?tab=events&event=${eventRef.id}`);
      
    } catch (error) {
      console.error("Payment processing error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
    if (user) {
      fetchUserRole();
    }
    
    const interval = setInterval(fetchEventsData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="live" className="py-24 bg-muted/20">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading events...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const currentLiveEvent = liveEvents[0];
  const isUserRegistered = currentLiveEvent?.registeredUsers?.includes(user?.uid || '');

  return (
    <>
      <Navbar />
      <section id="live" className="py-24 bg-muted/20">
        <div className="container px-4 mx-auto">
          {/* Error Message */}
          {error && (
            <div className="max-w-4xl mx-auto mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={fetchEventsData}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="mb-12 text-center">
            <Zap className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-primary">LIVE</span> CTF Events
            </h2>
            <p className="text-muted-foreground">Compete in real-time for prizes</p>
          </div>

          {/* Host Event Section for Regular Users */}
          {user && (
            <Card className="max-w-4xl mx-auto mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Want to Host Your Own Event?</h3>
                      <p className="text-muted-foreground text-sm">
                        Submit a hosting request and get access to event management tools
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={openHostingDialog}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get Hosting Access - 5 ZMW
                    </Button>
                    {userRole === 'admin' && (
                      <Button onClick={navigateToAdmin} variant="outline">
                        <Crown className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    )}
                  </div>
                </div>

                {/* Hosting Access Info */}
                <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-foreground">Event Hosting Fee:</span>
                    <span className="text-lg font-bold text-primary">ZMW 5</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pay 5 ZMW via Mobile Money to unlock event hosting capabilities for your event and get access to:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-foreground">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Challenge Creation Tools
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Event Scheduling
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Challenge Management
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Event Management
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Note: This payment grants hosting access for a single event. Each event requires its own hosting payment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hosting Dialog */}
          <Dialog open={showHostingDialog} onOpenChange={setShowHostingDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Host Your Event</DialogTitle>
                <DialogDescription>
                  Enter a name for your event and complete the payment to get hosting access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input
                    id="eventName"
                    placeholder="Enter your event name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Hosting Fee:</span>
                    <span className="text-lg font-bold text-primary">ZMW 5</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    After payment, you'll be redirected to event management where you can set up your event details, challenges, and schedule.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowHostingDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processHostingPayment}
                  disabled={processingPayment || !eventName.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {processingPayment ? "Processing Payment..." : "Pay 5 ZMW"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Live Event Card */}
          {currentLiveEvent ? (
            <Card className="max-w-4xl mx-auto border-primary/50 bg-gradient-to-br from-primary/5 to-transparent mb-8 animate-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    {currentLiveEvent.title || currentLiveEvent.name}
                    {currentLiveEvent.createdBy === 'user' && (
                      <Badge variant="outline" className="ml-2">
                        Community Hosted
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground font-bold px-4 py-1">
                    LIVE NOW
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold font-mono">{currentLiveEvent.timeLeft}</div>
                    <div className="text-sm text-muted-foreground">Time Left</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{currentLiveEvent.participants}</div>
                    <div className="text-sm text-muted-foreground">Active Players</div>
                  </div>
                  <div className="text-center">
                    <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{currentLiveEvent.challengeCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Challenges</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-bold">
                      {formatTime(currentLiveEvent.endDate)}
                    </div>
                    <div className="text-sm text-muted-foreground">Ends At</div>
                  </div>
                </div>
                {currentLiveEvent.description && (
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    {currentLiveEvent.description}
                  </p>
                )}
                
                {/* Top Players Preview */}
                {topPlayers.length > 0 && (
                  <Card className="mb-4 border-border">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Current Top Players
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="space-y-2">
                        {topPlayers.map((player) => (
                          <div key={player.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {player.rank === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                              {player.rank === 2 && <Medal className="w-4 h-4 text-gray-400" />}
                              {player.rank === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                              <span className="font-medium">{player.name}</span>
                            </div>
                            <span className="font-bold text-primary">{player.points} pts</span>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => navigateToLeaderboard(currentLiveEvent.id)}
                      >
                        View All Ranks
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  variant="neon" 
                  size="lg" 
                  className="w-full"
                  onClick={() => isUserRegistered ? joinLiveEvent(currentLiveEvent.id) : navigateToEventDetails(currentLiveEvent.id)}
                >
                  <Zap className="w-5 h-5" />
                  {isUserRegistered ? "Start Playing Now" : "View Event Details"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-4xl mx-auto border-border mb-8">
              <CardContent className="p-12 text-center">
                <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Live Events</h3>
                <p className="text-muted-foreground">Check back later for upcoming competitions</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Live Events */}
          {liveEvents.length > 1 && (
            <div className="max-w-4xl mx-auto mb-8">
              <h3 className="text-2xl font-bold mb-6">Other Live Events</h3>
              <div className="space-y-4">
                {liveEvents.slice(1).map((event) => (
                  <Card 
                    key={event.id} 
                    className="border-primary/30 hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => navigateToEventDetails(event.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <h4 className="font-bold text-xl mb-2">{event.title || event.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 text-primary font-bold">
                                LIVE
                              </Badge>
                              {event.createdBy === 'user' && (
                                <Badge variant="secondary">
                                  Community Hosted
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {event.timeLeft}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {event.participants} players
                            </div>
                            {event.challengeCount !== undefined && event.challengeCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                {event.challengeCount} challenges
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events - Simplified Display */}
          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-2xl font-bold mb-6">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No upcoming events scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="border-border hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => navigateToEventDetails(event.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg">{event.title || event.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.date} • {event.challengeCount || 0} challenges
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.createdBy === 'user' && (
                            <Badge variant="secondary">
                              Community Hosted
                            </Badge>
                          )}
                          {event.registered && (
                            <Badge className="bg-green-500/20 text-green-600">
                              Registered
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold mb-6">Past Events</h3>
              <div className="space-y-4">
                {pastEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="border-border hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => navigateToEventDetails(event.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-3">
                            <h4 className="font-bold text-xl mb-2">{event.title || event.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                ENDED
                              </Badge>
                              {event.createdBy === 'user' && (
                                <Badge variant="secondary">
                                  Community Hosted
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(event.startDate)} - {formatDate(event.endDate)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {event.participants} participants
                            </div>
                            {event.challengeCount !== undefined && event.challengeCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                {event.challengeCount} challenges
                              </div>
                            )}
                          </div>
                          
                          {/* Final Scores for Past Events */}
                          {event.finalScores && event.finalScores.length > 0 && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                              <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                Final Rankings
                              </h5>
                              <div className="space-y-2">
                                {event.finalScores.slice(0, 5).map((score, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium w-6">#{score.rank}</span>
                                      <span>{score.name}</span>
                                    </div>
                                    <span className="font-bold text-primary">{score.points} pts</span>
                                  </div>
                                ))}
                              </div>
                              {event.finalScores.length > 5 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  +{event.finalScores.length - 5} more participants
                                </p>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-3"
                                onClick={() => navigateToLeaderboard(event.id)}
                              >
                                View Complete Leaderboard
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default LiveEvents;