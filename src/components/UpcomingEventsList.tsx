import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Crown, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpcomingEvent {
  id: string;
  name: string;
  title?: string;
  date: string;
  startDate: string;
  participants: number;
  totalParticipants?: number;
  maxParticipants?: number;
  maxIndividuals?: number;
  description?: string;
  registeredUsers?: string[];
  createdBy?: "admin" | "user";
  hostingFee?: number;
  challengeCount?: number;
}

interface UpcomingEventsListProps {
  upcomingEvents: UpcomingEvent[];
}

const UpcomingEventsList = ({ upcomingEvents }: UpcomingEventsListProps) => {
  const navigate = useNavigate();

  const navigateToEventDetails = (eventId: string) => {
    navigate(`/event/upcoming/${eventId}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (upcomingEvents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No upcoming events scheduled</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4">
        {upcomingEvents.map((event) => (
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
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                        UPCOMING
                      </Badge>
                      {event.createdBy === 'user' && (
                        <Badge variant="outline">
                          <Crown className="w-3 h-3 mr-1" />
                          Community Hosted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    {event.challengeCount !== undefined && event.challengeCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{event.challengeCount} challenges</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToEventDetails(event.id);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEventsList;