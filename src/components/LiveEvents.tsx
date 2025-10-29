import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Zap, Calendar, Trophy } from "lucide-react";

const LiveEvents = () => {
  const liveEvent = {
    title: "Friday Night Hack-Off",
    status: "LIVE NOW",
    participants: 127,
    timeLeft: "02:34:15",
    prize: "K1,500",
    difficulty: "Medium"
  };

  const upcomingEvents = [
    {
      title: "Weekend Warriors Tournament",
      date: "Saturday, 14:00",
      participants: 45,
      prize: "K2,000",
      difficulty: "Hard",
      registered: true
    },
    {
      title: "Beginner's Bootcamp",
      date: "Sunday, 10:00",
      participants: 89,
      prize: "K500",
      difficulty: "Easy",
      registered: false
    },
    {
      title: "Pro League Championship",
      date: "Next Friday, 18:00",
      participants: 234,
      prize: "K10,000",
      difficulty: "Expert",
      registered: false
    }
  ];

  return (
    <section id="live" className="py-24 bg-muted/20">
      <div className="container px-4 mx-auto">
        <div className="mb-12 text-center">
          <Zap className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-primary">LIVE</span> Events
          </h2>
          <p className="text-muted-foreground">Compete in real-time for prizes</p>
        </div>

        <Card className="max-w-4xl mx-auto border-primary/50 bg-gradient-to-br from-primary/5 to-transparent mb-8 animate-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                {liveEvent.title}
              </CardTitle>
              <Badge className="bg-primary text-primary-foreground font-bold px-4 py-1">
                {liveEvent.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold font-mono">{liveEvent.timeLeft}</div>
                <div className="text-sm text-muted-foreground">Time Left</div>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold">{liveEvent.participants}</div>
                <div className="text-sm text-muted-foreground">Active Players</div>
              </div>
              <div className="text-center">
                <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{liveEvent.prize}</div>
                <div className="text-sm text-muted-foreground">Prize Pool</div>
              </div>
              <div className="text-center">
                <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold">{liveEvent.difficulty}</div>
                <div className="text-sm text-muted-foreground">Difficulty</div>
              </div>
            </div>
            <Button variant="neon" size="lg" className="w-full">
              <Zap className="w-5 h-5" />
              Join Event Now
            </Button>
          </CardContent>
        </Card>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Upcoming Events</h3>
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <Card key={index} className="border-border hover:border-primary/30 transition-all">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          Prize: {event.prize}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant={event.registered ? "outline" : "terminal"}
                      className="md:ml-4"
                    >
                      {event.registered ? "Registered ✓" : "Register"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveEvents;
