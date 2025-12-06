import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Zap, Clock, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface LiveEvent {
  id: string;
  name: string;
  title?: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  participants: number;
  totalParticipants?: number;
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

interface LiveEventsListProps {
  liveEvents: LiveEvent[];
  upcomingEvents: LiveEvent[];
  pastEvents: LiveEvent[];
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

const LiveEventsList = ({ liveEvents, upcomingEvents, pastEvents }: LiveEventsListProps) => {
  const navigate = useNavigate();
  const [timeLeftMap, setTimeLeftMap] = useState<Record<string, TimeLeft>>({});

  const navigateToEventDetails = (eventId: string) => {
    navigate(`/event/live/${eventId}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calculate time left for each event
  const calculateTimeLeft = (endDate: string): TimeLeft => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const difference = end - now;
    
    if (difference > 0) {
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      return {
        hours,
        minutes,
        seconds,
        totalSeconds: difference / 1000
      };
    }
    
    // Event has ended
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0
    };
  };

  const formatTimeLeft = (timeLeft: TimeLeft): string => {
    if (timeLeft.totalSeconds <= 0) {
      return "00:00:00";
    }
    
    return `${timeLeft.hours.toString().padStart(2, '0')}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;
  };

  // Initialize and update timers for all live events
  useEffect(() => {
    if (liveEvents.length === 0) return;

    // Initialize time left for each event
    const initialTimeLeftMap: Record<string, TimeLeft> = {};
    liveEvents.forEach(event => {
      initialTimeLeftMap[event.id] = calculateTimeLeft(event.endDate);
    });
    setTimeLeftMap(initialTimeLeftMap);

    // Update timers every second
    const timer = setInterval(() => {
      const updatedTimeLeftMap: Record<string, TimeLeft> = {};
      liveEvents.forEach(event => {
        updatedTimeLeftMap[event.id] = calculateTimeLeft(event.endDate);
      });
      setTimeLeftMap(updatedTimeLeftMap);
    }, 1000);

    return () => clearInterval(timer);
  }, [liveEvents]);

  if (liveEvents.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto border-border">
        <CardContent className="p-12 text-center">
          <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No Live Events</h3>
          <p className="text-muted-foreground">
            There are no live events running at the moment. Check upcoming events for scheduled competitions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4">
        {liveEvents.map((event) => {
          const timeLeft = timeLeftMap[event.id] || calculateTimeLeft(event.endDate);
          const timeLeftDisplay = formatTimeLeft(timeLeft);
          
          return (
            <Card 
              key={event.id} 
              className="border-border hover:border-primary/30 cursor-pointer transition-colors group"
              onClick={() => navigateToEventDetails(event.id)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3">
                      <h4 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                        {event.title || event.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground animate-pulse">
                          LIVE NOW
                        </Badge>
                        {event.createdBy === 'user' && (
                          <Badge variant="outline" className="text-xs">
                            <Crown className="w-3 h-3 mr-1" />
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
                        {event.participants} active player{event.participants !== 1 ? 's' : ''}
                        {event.totalParticipants && ` / ${event.totalParticipants} max`}
                      </div>
                      {event.challengeCount !== undefined && event.challengeCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {event.challengeCount} challenge{event.challengeCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        Ends in
                      </div>
                      <div className="font-mono text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">
                        {timeLeftDisplay}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToEventDetails(event.id);
                      }}
                    >
                      View Event
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LiveEventsList;