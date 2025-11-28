import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Zap, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface PastEventsListProps {
  pastEvents: PastEvent[];
}

const PastEventsList = ({ pastEvents }: PastEventsListProps) => {
  const navigate = useNavigate();

  const navigateToEventDetails = (eventId: string) => {
    navigate(`/event/past/${eventId}`);
  };

  const navigateToLeaderboard = (eventId: string) => {
    navigate(`/leaderboard?event=${eventId}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (pastEvents.length === 0) {
    return null;
  }

  return (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToLeaderboard(event.id);
                        }}
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
  );
};

export default PastEventsList;