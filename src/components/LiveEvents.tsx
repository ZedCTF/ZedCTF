import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Zap, Calendar, Trophy, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { collection, getDocs, query, where, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";

interface LiveEvent {
  id: string;
  title: string;
  status: "LIVE" | "STARTING_SOON" | "ENDED";
  participants: number;
  timeLeft: string;
  prize: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  startTime: string;
  endTime: string;
  challengeCount: number;
  registeredUsers?: string[];
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  participants: number;
  prize: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  registered: boolean;
  maxParticipants?: number;
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

  // Fetch events from Firestore
  const fetchEventsData = async () => {
    try {
      // Query for live events
      const liveEventsQuery = query(
        collection(db, "events"),
        where("status", "in", ["LIVE", "STARTING_SOON"]),
        orderBy("startTime", "asc")
      );

      // Query for upcoming events
      const upcomingEventsQuery = query(
        collection(db, "events"),
        where("status", "==", "UPCOMING"),
        orderBy("startTime", "asc")
      );

      const [liveSnapshot, upcomingSnapshot] = await Promise.all([
        getDocs(liveEventsQuery),
        getDocs(upcomingEventsQuery)
      ]);

      const liveData = liveSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveEvent[];

      const upcomingData = upcomingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registered: user ? doc.data().registeredUsers?.includes(user.uid) || false : false
      })) as UpcomingEvent[];

      setLiveEvents(liveData);
      setUpcomingEvents(upcomingData);

    } catch (err) {
      console.error("Error fetching events:", err);
      // Silent fail - just set empty arrays
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
      await updateDoc(eventRef, {
        registeredUsers: arrayUnion(user.uid),
        participants: (upcomingEvents.find(e => e.id === eventId)?.participants || 0) + 1
      });

      // Refresh events data to update registration status
      fetchEventsData();
    } catch (error) {
      console.error('Failed to register for event:', error);
      alert("Failed to register for event. Please try again.");
    }
  };

  const joinLiveEvent = async (eventId: string) => {
    if (!user) {
      alert("Please log in to join events");
      return;
    }

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        participants: (liveEvents.find(e => e.id === eventId)?.participants || 0) + 1
      });

      // Redirect to competition page with base URL
      window.location.href = `${BASE_URL}/competition/${eventId}`;
    } catch (error) {
      console.error('Failed to join live event:', error);
      alert("Failed to join event. Please try again.");
    }
  };

  const navigateToPractice = () => {
    window.location.href = `${BASE_URL}/practice`;
  };

  const navigateToChallenge = (challengeId: string) => {
    window.location.href = `${BASE_URL}/challenge/${challengeId}`;
  };

  useEffect(() => {
    fetchEventsData(); // Initial fetch
    
    // Auto-refresh every 10 seconds for live events
    const interval = setInterval(fetchEventsData, 10000);
    
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
                    {currentLiveEvent.status === "LIVE" ? "LIVE NOW" : "STARTING SOON"}
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
                <Button 
                  variant="neon" 
                  size="lg" 
                  className="w-full"
                  onClick={() => joinLiveEvent(currentLiveEvent.id)}
                >
                  <Zap className="w-5 h-5" />
                  {currentLiveEvent.status === "LIVE" ? "Join Event Now" : "Prepare for Event"}
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
                          className="md:ml-4"
                          onClick={() => !event.registered && registerForEvent(event.id)}
                          disabled={event.registered}
                        >
                          {event.registered ? "Registered ✓" : "Register"}
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