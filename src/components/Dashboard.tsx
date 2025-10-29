import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Points",
      value: "2,450",
      icon: Trophy,
      change: "+120 this week",
      color: "text-primary"
    },
    {
      title: "Challenges Solved",
      value: "38",
      icon: Target,
      change: "+5 this week",
      color: "text-secondary"
    },
    {
      title: "Current Rank",
      value: "#42",
      icon: TrendingUp,
      change: "↑3 positions",
      color: "text-primary"
    },
    {
      title: "Time Spent",
      value: "24h",
      icon: Clock,
      change: "This month",
      color: "text-muted-foreground"
    }
  ];

  return (
    <section id="dashboard" className="py-24 relative">
      <div className="container px-4 mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4">Your <span className="text-primary">Dashboard</span></h2>
          <p className="text-muted-foreground">Track your progress and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,136,0.1)]"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { challenge: "Buffer Overflow Basic", points: 100, time: "2 hours ago" },
                { challenge: "SQL Injection Advanced", points: 250, time: "1 day ago" },
                { challenge: "XSS Detection", points: 150, time: "2 days ago" }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <div className="font-medium">{activity.challenge}</div>
                    <div className="text-sm text-muted-foreground">{activity.time}</div>
                  </div>
                  <div className="text-primary font-bold">+{activity.points}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Weekly LIVE Challenge", date: "Tomorrow, 18:00", prize: "K500" },
                { name: "Beginner Tournament", date: "This Weekend", prize: "K1,000" },
                { name: "Pro League Finals", date: "Next Week", prize: "K5,000" }
              ].map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">{event.date}</div>
                  </div>
                  <div className="text-secondary font-bold">{event.prize}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
