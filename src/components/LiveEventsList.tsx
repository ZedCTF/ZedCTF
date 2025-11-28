import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Zap, Clock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface LiveEventsListProps {
  liveEvents: LiveEvent[];
  upcomingEvents: LiveEvent[];
  pastEvents: LiveEvent[];
}

const LiveEventsList = ({ liveEvents, upcomingEvents, pastEvents }: LiveEventsListProps) => {
  const navigate = useNavigate();

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
        {liveEvents.map((event) => (
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
                      <Badge className="bg-primary text-primary-foreground">
                        LIVE NOW
                      </Badge>
                      {event.createdBy === 'user' && (
                        <Badge variant="outline">
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
                      {event.participants} active players
                    </div>
                    {event.challengeCount !== undefined && event.challengeCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {event.challengeCount} challenges
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      Ends in
                    </div>
                    <div className="font-mono text-lg font-bold text-primary">
                      {event.timeLeft}
                    </div>
                  </div>
                  <Button 
                    variant="terminal" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToEventDetails(event.id);
                    }}
                  >
                    Join Event
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LiveEventsList;