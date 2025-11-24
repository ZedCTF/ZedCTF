// src/components/admin/PlatformAnalytics.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Shield, Trophy, Clock } from "lucide-react";

interface PlatformAnalyticsProps {
  onBack: () => void;
}

const PlatformAnalytics = ({ onBack }: PlatformAnalyticsProps) => {
  // Mock analytics data
  const analyticsData = {
    totalUsers: 150,
    activeUsers: 47,
    totalChallenges: 25,
    solvedChallenges: 189,
    averageSolveTime: "2h 15m",
    popularCategory: "Web Security"
  };

  const stats = [
    {
      title: "Total Users",
      value: analyticsData.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Users (30d)",
      value: analyticsData.activeUsers,
      description: "Recently active users",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Total Challenges",
      value: analyticsData.totalChallenges,
      description: "Available challenges",
      icon: Shield,
      color: "text-purple-600"
    },
    {
      title: "Challenge Solves",
      value: analyticsData.solvedChallenges,
      description: "Total solutions submitted",
      icon: Trophy,
      color: "text-orange-600"
    },
    {
      title: "Avg Solve Time",
      value: analyticsData.averageSolveTime,
      description: "Average time to solve challenges",
      icon: Clock,
      color: "text-red-600"
    },
    {
      title: "Popular Category",
      value: analyticsData.popularCategory,
      description: "Most solved category",
      icon: BarChart3,
      color: "text-indigo-600"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Analytics</CardTitle>
        <CardDescription>
          Comprehensive overview of platform performance and user engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Growth</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                User growth chart will be displayed here
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Challenge Performance</CardTitle>
              <CardDescription>Solve rates by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Challenge performance chart will be displayed here
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
          <Button>
            Export Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformAnalytics;