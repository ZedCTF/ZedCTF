import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import HostEventSection from "./HostEventSection";
import LiveEventsList from "./LiveEventsList";
import UpcomingEventsList from "./UpcomingEventsList";
import PastEventsList from "./PastEventsList";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Crown, Calendar, Clock, Trophy } from "lucide-react";

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

type ActiveTab = "hosting" | "live" | "upcoming" | "past";

const LiveEvents = () => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>("live");
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return name.replace(/0+$/, '').trim();
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

      eventsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        if (!data.startDate || !data.endDate) {
          console.log("Skipping event - missing dates:", data.name);
          return;
        }

        // Filter approved events on client side
        const status = data.status?.toLowerCase();
        if (status !== 'approved' && status !== 'live' && status !== 'upcoming' && status !== 'ended') {
          return;
        }

        const eventStatus = getEventStatus(data.startDate, data.endDate);
        const cleanedName = cleanEventName(data.name);
        const cleanedTitle = data.title ? cleanEventName(data.title) : undefined;

        const baseEvent = {
          id: doc.id,
          name: cleanedName,
          title: cleanedTitle,
          status: eventStatus,
          participants: data.totalParticipants || data.participants?.length || 0,
          timeLeft: calculateTimeLeft(data.startDate, data.endDate),
          startDate: data.startDate,
          endDate: data.endDate,
          challengeCount: data.challengeCount || 0,
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
          pastData.push({
            id: doc.id,
            name: cleanedName,
            title: cleanedTitle,
            startDate: data.startDate,
            endDate: data.endDate,
            participants: data.totalParticipants || data.participants?.length || 0,
            challengeCount: data.challengeCount || 0,
            createdBy: data.createdBy,
            winners: data.winners || [],
            finalScores: data.finalScores || []
          });
        }
      });

      setLiveEvents(liveData);
      setUpcomingEvents(upcomingData);
      setPastEvents(pastData);

    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
    
    const interval = setInterval(fetchEventsData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Tab configuration
  const tabs = [
    {
      id: "hosting" as ActiveTab,
      name: "Request Hosting",
      icon: Crown,
      description: "Host your own CTF event",
      count: null
    },
    {
      id: "live" as ActiveTab,
      name: "Live Events",
      icon: Zap,
      description: "Active competitions",
      count: liveEvents.length
    },
    {
      id: "upcoming" as ActiveTab,
      name: "Upcoming Events",
      icon: Calendar,
      description: "Scheduled competitions",
      count: upcomingEvents.length
    },
    {
      id: "past" as ActiveTab,
      name: "Past Events",
      icon: Trophy,
      description: "Completed competitions",
      count: pastEvents.length
    }
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="py-24 bg-muted/20">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading events...</p>
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
          {/* Header */}
          <div className="mb-8 lg:mb-12 text-center">
            <Zap className="w-16 h-16 lg:w-20 lg:h-20 text-primary mx-auto mb-4" />
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              CTF Events
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Participate in live competitions, view upcoming events, or host your own
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-4xl mx-auto mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {tabs.map((tab) => (
                <Card 
                  key={tab.id}
                  className={`border-border hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    activeTab === tab.id ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        activeTab === tab.id ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <tab.icon className={`w-6 h-6 ${
                          activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm lg:text-base ${
                          activeTab === tab.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {tab.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tab.description}
                        </p>
                      </div>
                      {tab.count !== null && (
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activeTab === tab.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {tab.count}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {activeTab === "hosting" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  Host Your Event
                </h2>
                <HostEventSection />
              </div>
            )}

            {activeTab === "live" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  Live Events
                  {liveEvents.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({liveEvents.length} active)
                    </span>
                  )}
                </h2>
                <LiveEventsList 
                  liveEvents={liveEvents} 
                  upcomingEvents={upcomingEvents}
                  pastEvents={pastEvents}
                />
              </div>
            )}

            {activeTab === "upcoming" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Upcoming Events
                  {upcomingEvents.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({upcomingEvents.length} scheduled)
                    </span>
                  )}
                </h2>
                <UpcomingEventsList upcomingEvents={upcomingEvents} />
              </div>
            )}

            {activeTab === "past" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-primary" />
                  Past Events
                  {pastEvents.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({pastEvents.length} completed)
                    </span>
                  )}
                </h2>
                <PastEventsList pastEvents={pastEvents} />
              </div>
            )}
          </div>

          {/* No Events Message */}
{(activeTab === "live" && liveEvents.length === 0) ||
 (activeTab === "upcoming" && upcomingEvents.length === 0) ||
 (activeTab === "past" && pastEvents.length === 0) ? (
  <Card className="max-w-4xl mx-auto border-border mt-8">
    <CardContent className="p-12 text-center">
      <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
      <h3 className="text-xl font-bold mb-2">No Events Available</h3>
      <p className="text-muted-foreground">
        {activeTab === "live" && "No live events currently running. Check upcoming events for scheduled competitions."}
        {activeTab === "upcoming" && "No upcoming events scheduled. Check back later for new competitions."}
        {activeTab === "past" && "No past events available yet."}
      </p>
    </CardContent>
  </Card>
) : null}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default LiveEvents;