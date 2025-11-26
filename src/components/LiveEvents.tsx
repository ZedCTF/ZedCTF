import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Zap, Calendar, Trophy, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";

interface LiveEvent {
  id: string;
  name: string;
  title?: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  participants: number;
  totalParticipants?: number;
  timeLeft: string;
  prize: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  startDate: string;
  endDate: string;
  challengeCount: number;
  registeredUsers?: string[];
  description?: string;
}

interface UpcomingEvent {
  id: string;
  name: string;
  title?: string;
  date: string;
  startDate: string;
  participants: number;
  totalParticipants?: number;
  prize: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  registered: boolean;
  maxParticipants?: number;
  maxIndividuals?: number;
  description?: string;
  registeredUsers?: string[];
}

// Base URL for navigation
const BASE_URL = "/ZedCTF";

const LiveEvents = () => {
  const { user } = useAuthContext();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate time left until event starts or ends
  const calculateTimeLeft = (startDate: string, endDate: string): string => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      // Event hasn't started yet - show time until start
      const diff = start.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (now > end) {
      // Event has ended
      return "00:00:00";
    } else {
      // Event is live - show time until end
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

  // Fetch events from Firestore
  const fetchEventsData = async () => {
    try {
      setError(null);
      
      // Simple query - no complex where clauses that need indexes
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("startDate", "asc")
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      console.log("Total events found:", eventsSnapshot.size);

      const now = new Date();
      const liveData: LiveEvent[] = [];
      const upcomingData: UpcomingEvent[] = [];

      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log("Event data:", data);
        
        if (!data.startDate || !data.endDate) {
          console.log("Skipping event - missing dates:", data.name);
          return;
        }

        const eventStatus = getEventStatus(data.startDate, data.endDate);
        console.log("Event status for", data.name, ":", eventStatus);

        // Skip ended events
        if (eventStatus === "ENDED") {
          return;
        }

        const baseEvent = {
          id: doc.id,
          name: data.name || "Untitled Event",
          title: data.title || data.name || "Untitled Event",
          status: eventStatus,
          participants: data.totalParticipants || data.participants?.length || 0,
          timeLeft: calculateTimeLeft(data.startDate, data.endDate),
          prize: data.prize || `ZMW ${data.individualPrice || 0}`,
          difficulty: data.difficulty || "Medium",
          startDate: data.startDate,
          endDate: data.endDate,
          challengeCount: data.challengeCount || 0,
          registeredUsers: data.registeredUsers || [],
          description: data.description || "More details coming soon..."
        };

        if (eventStatus === "LIVE") {
          console.log("Adding to LIVE events:", data.name);
          liveData.push(baseEvent);
        } else if (eventStatus === "UPCOMING") {
          console.log("Adding to UPCOMING events:", data.name);
          upcomingData.push({
            ...baseEvent,
            date: `${formatDate(data.startDate)} at ${formatTime(data.startDate)}`,
            registered: user ? baseEvent.registeredUsers?.includes(user.uid) || false : false,
            maxParticipants: data.maxIndividuals,
            maxIndividuals: data.maxIndividuals
          });
        }
      });

      console.log("Final LIVE events:", liveData);
      console.log("Final UPCOMING events:", upcomingData);

      setLiveEvents(liveData);
      setUpcomingEvents(upcomingData);

    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message || "Failed to load events");
      setLiveEvents([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const registerForEvent = async (eventId: string) => {
    if (!user) {
      alert("Please log in to register for events");
      return;
    }

    try {
      const eventRef = doc(db, "events", eventId);
      const event = upcomingEvents.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error("Event not found");
      }

      // Check if user is already registered
      if (event.registeredUsers?.includes(user.uid)) {
        alert("You are already registered for this event");
        return;
      }

      // Check if event is full
      if (event.maxParticipants && event.participants >= event.maxParticipants) {
        alert("This event is full");
        return;
      }

      await updateDoc(eventRef, {
        registeredUsers: arrayUnion(user.uid),
        totalParticipants: (event.participants || 0) + 1
      });

      // Refresh events data to update registration status
      fetchEventsData();
      
      alert("Successfully registered for the event!");
    } catch (error: any) {
      console.error('Failed to register for event:', error);
      alert(`Failed to register for event: ${error.message}`);
    }
  };

  const joinLiveEvent = async (eventId: string) => {
    if (!user) {
      alert("Please log in to join events");
      return;
    }

    try {
      const eventRef = doc(db, "events", eventId);
      const event = liveEvents.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error("Event not found");
      }

      // For live events, increment participant count when joining
      await updateDoc(eventRef, {
        totalParticipants: (event.participants || 0) + 1
      });

      // Redirect to competition page with base URL
      window.location.href = `${BASE_URL}/competition/${eventId}`;
    } catch (error: any) {
      console.error('Failed to join live event:', error);
      alert(`Failed to join event: ${error.message}`);
    }
  };

  const navigateToPractice = () => {
    window.location.href = `${BASE_URL}/practice`;
  };

  useEffect(() => {
    fetchEventsData(); // Initial fetch
    
    // Auto-refresh every 30 seconds for live events
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

  const currentLiveEvent = liveEvents[0]; // Get the first live event

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
              <span className="text-primary">LIVE</span> Events
            </h2>
            <p className="text-muted-foreground">Compete in real-time for prizes</p>
          </div>

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
                    {currentLiveEvent.title}
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
                    <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{currentLiveEvent.prize}</div>
                    <div className="text-sm text-muted-foreground">Prize Pool</div>
                  </div>
                  <div className="text-center">
                    <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{currentLiveEvent.difficulty}</div>
                    <div className="text-sm text-muted-foreground">Difficulty</div>
                  </div>
                </div>
                {currentLiveEvent.description && (
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    {currentLiveEvent.description}
                  </p>
                )}
                <Button 
                  variant="neon" 
                  size="lg" 
                  className="w-full"
                  onClick={() => joinLiveEvent(currentLiveEvent.id)}
                >
                  <Zap className="w-5 h-5" />
                  Join Event Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-4xl mx-auto border-border mb-8">
              <CardContent className="p-12 text-center">
                <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Live Events</h3>
                <p className="text-muted-foreground">Check back later for upcoming competitions</p>
                
                {/* Practice Section Call-to-Action */}
                <div className="mt-6 pt-6 border-t border-border">
                  <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h4 className="text-lg font-semibold mb-2">Want to Practice?</h4>
                  <p className="text-muted-foreground mb-4">
                    Sharpen your skills with our practice challenges while you wait for the next live event.
                  </p>
                  <Button 
                    variant="terminal" 
                    onClick={navigateToPractice}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Explore Practice Challenges
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Live Events (if any) */}
          {liveEvents.length > 1 && (
            <div className="max-w-4xl mx-auto mb-8">
              <h3 className="text-2xl font-bold mb-6">Other Live Events</h3>
              <div className="space-y-4">
                {liveEvents.slice(1).map((event) => (
                  <Card key={event.id} className="border-primary/30 hover:border-primary/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-bold text-xl">{event.title}</h4>
                            <Badge className="bg-primary/20 text-primary font-bold">
                              LIVE
                            </Badge>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {event.difficulty}
                            </Badge>
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
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              Prize: {event.prize}
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                        <Button 
                          variant="terminal"
                          className="md:ml-4"
                          onClick={() => joinLiveEvent(event.id)}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Join Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No upcoming events scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="border-border hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-bold text-xl">{event.title}</h4>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {event.difficulty}
                            </Badge>
                            {event.maxParticipants && event.participants >= event.maxParticipants && (
                              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                                FULL
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {event.date}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {event.participants} registered
                              {event.maxParticipants && ` / ${event.maxParticipants} max`}
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              Prize: {event.prize}
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                        <Button 
                          variant={event.registered ? "outline" : "terminal"}
                          className="md:ml-4 whitespace-nowrap"
                          onClick={() => !event.registered && registerForEvent(event.id)}
                          disabled={event.registered || (event.maxParticipants ? event.participants >= event.maxParticipants : false)}
                        >
                          {event.registered ? "Registered ✓" : 
                           event.maxParticipants && event.participants >= event.maxParticipants ? "Event Full" : "Register"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Practice Section Call-to-Action */}
          <div className="max-w-4xl mx-auto mt-16">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8 text-center">
                <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Ready to Practice?</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Access our extensive library of practice challenges covering web security, cryptography, 
                  forensics, and more. Perfect for beginners and experts alike.
                </p>
                <Button 
                  variant="terminal" 
                  size="lg"
                  onClick={navigateToPractice}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Explore Practice Challenges
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default LiveEvents;