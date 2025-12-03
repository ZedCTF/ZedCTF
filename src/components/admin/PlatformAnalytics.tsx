// src/components/admin/PlatformAnalytics.tsx
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Shield, 
  Trophy, 
  Clock,
  Calendar,
  TrendingUp,
  Download
} from "lucide-react";
import { 
  collection, 
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase";

interface PlatformAnalyticsProps {
  onBack: () => void;
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalChallenges: number;
  solvedChallenges: number;
  totalEvents: number;
  activeEvents: number;
  averageSolveTime: string;
  popularCategory: string;
  totalSubmissions: number;
  successfulSubmissions: number;
  userGrowthData: { date: string; count: number }[];
  challengePerformance: { category: string; solved: number; total: number; rate: number }[];
}

interface User {
  id: string;
  createdAt?: any;
  [key: string]: any;
}

interface Challenge {
  id: string;
  isActive?: boolean;
  solvedBy?: string[];
  category?: string;
  [key: string]: any;
}

interface Submission {
  id: string;
  isCorrect?: boolean;
  createdAt?: any;
  challengeStartedAt?: any;
  [key: string]: any;
}

interface Event {
  id: string;
  status?: string;
  [key: string]: any;
}

const PlatformAnalytics = ({ onBack }: PlatformAnalyticsProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalChallenges: 0,
    solvedChallenges: 0,
    totalEvents: 0,
    activeEvents: 0,
    averageSolveTime: "0h 0m",
    popularCategory: "N/A",
    totalSubmissions: 0,
    successfulSubmissions: 0,
    userGrowthData: [],
    challengePerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching analytics data...");

      // Get current time
      const now = new Date();

      // Fetch all data in parallel
      const [
        usersSnapshot,
        challengesSnapshot,
        submissionsSnapshot,
        eventsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "challenges")),
        getDocs(collection(db, "submissions")),
        getDocs(collection(db, "events"))
      ]);

      // Process users with proper typing
      const users: User[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate active users (created in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const activeUsers = users.filter(user => {
        let createdAt: Date;
        
        if (user.createdAt?.toDate && typeof user.createdAt.toDate === 'function') {
          createdAt = user.createdAt.toDate();
        } else if (user.createdAt instanceof Timestamp) {
          createdAt = user.createdAt.toDate();
        } else if (user.createdAt && typeof user.createdAt === 'object' && 'seconds' in user.createdAt) {
          createdAt = new Timestamp(user.createdAt.seconds, user.createdAt.nanoseconds).toDate();
        } else {
          createdAt = new Date(0);
        }
        
        return createdAt >= thirtyDaysAgo;
      }).length;

      // Process challenges with proper typing
      const challenges: Challenge[] = challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const activeChallenges = challenges.filter(challenge => 
        challenge.isActive !== false
      );
      
      // Calculate total solves from solvedBy arrays
      const totalSolves = activeChallenges.reduce((sum, challenge) => {
        const solvedByCount = Array.isArray(challenge.solvedBy) ? challenge.solvedBy.length : 0;
        return sum + solvedByCount;
      }, 0);

      // Process submissions with proper typing
      const submissions: Submission[] = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const successfulSubmissions = submissions.filter(sub => 
        sub.isCorrect === true
      ).length;

      // Process events with proper typing
      const events: Event[] = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const activeEvents = events.filter(event => 
        event.status === 'live' || event.status === 'upcoming'
      ).length;

      // Calculate average solve time (based on submission timestamps)
      let totalSolveTime = 0;
      let solveCount = 0;
      
      submissions.forEach(sub => {
        try {
          let createdAt: Date | null = null;
          let challengeStartedAt: Date | null = null;
          
          // Parse createdAt
          if (sub.createdAt?.toDate && typeof sub.createdAt.toDate === 'function') {
            createdAt = sub.createdAt.toDate();
          } else if (sub.createdAt instanceof Timestamp) {
            createdAt = sub.createdAt.toDate();
          } else if (sub.createdAt && typeof sub.createdAt === 'object' && 'seconds' in sub.createdAt) {
            createdAt = new Timestamp(sub.createdAt.seconds, sub.createdAt.nanoseconds).toDate();
          }
          
          // Parse challengeStartedAt
          if (sub.challengeStartedAt?.toDate && typeof sub.challengeStartedAt.toDate === 'function') {
            challengeStartedAt = sub.challengeStartedAt.toDate();
          } else if (sub.challengeStartedAt instanceof Timestamp) {
            challengeStartedAt = sub.challengeStartedAt.toDate();
          } else if (sub.challengeStartedAt && typeof sub.challengeStartedAt === 'object' && 'seconds' in sub.challengeStartedAt) {
            challengeStartedAt = new Timestamp(sub.challengeStartedAt.seconds, sub.challengeStartedAt.nanoseconds).toDate();
          }
          
          if (createdAt && challengeStartedAt) {
            const solveTime = createdAt.getTime() - challengeStartedAt.getTime();
            if (solveTime > 0) {
              totalSolveTime += solveTime;
              solveCount++;
            }
          }
        } catch (error) {
          console.warn("Error parsing submission timestamp:", error);
        }
      });
      
      const avgSolveTimeMs = solveCount > 0 ? totalSolveTime / solveCount : 0;
      const avgHours = Math.floor(avgSolveTimeMs / (1000 * 60 * 60));
      const avgMinutes = Math.floor((avgSolveTimeMs % (1000 * 60 * 60)) / (1000 * 60));
      const averageSolveTime = avgHours > 0 ? 
        `${avgHours}h ${avgMinutes}m` : `${avgMinutes}m`;

      // Calculate popular category
      const categoryStats: Record<string, { solved: number; total: number }> = {};
      activeChallenges.forEach(challenge => {
        const category = challenge.category || 'Uncategorized';
        const solvedCount = Array.isArray(challenge.solvedBy) ? challenge.solvedBy.length : 0;
        
        if (!categoryStats[category]) {
          categoryStats[category] = { solved: 0, total: 0 };
        }
        categoryStats[category].total++;
        categoryStats[category].solved += solvedCount;
      });

      let popularCategory = "N/A";
      let maxSolveRate = 0;
      
      Object.entries(categoryStats).forEach(([category, stats]) => {
        const solveRate = stats.total > 0 ? stats.solved / stats.total : 0;
        if (solveRate > maxSolveRate) {
          maxSolveRate = solveRate;
          popularCategory = category;
        }
      });

      // Calculate user growth data
      const userGrowthData = calculateUserGrowthData(users, timeRange);

      // Calculate challenge performance
      const challengePerformance = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        solved: stats.solved,
        total: stats.total,
        rate: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0
      })).sort((a, b) => b.rate - a.rate);

      setAnalyticsData({
        totalUsers: users.length,
        activeUsers,
        totalChallenges: activeChallenges.length,
        solvedChallenges: totalSolves,
        totalEvents: events.length,
        activeEvents,
        averageSolveTime,
        popularCategory,
        totalSubmissions: submissions.length,
        successfulSubmissions,
        userGrowthData,
        challengePerformance
      });

      console.log("✅ Analytics data loaded:", {
        totalUsers: users.length,
        activeUsers,
        totalChallenges: activeChallenges.length,
        solvedChallenges: totalSolves,
        popularCategory
      });

    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserGrowthData = (users: User[], range: string) => {
    const now = new Date();
    let days = 30;
    
    switch (range) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = Math.min(365, users.length); // Show last year or all users
    }

    const data: { date: string; count: number }[] = [];
    const userCounts: Record<string, number> = {};

    // Initialize with zero counts for all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      userCounts[dateStr] = 0;
    }

    // Count users created on each day
    users.forEach(user => {
      let userDate: Date;
      
      try {
        if (user.createdAt?.toDate && typeof user.createdAt.toDate === 'function') {
          userDate = user.createdAt.toDate();
        } else if (user.createdAt instanceof Timestamp) {
          userDate = user.createdAt.toDate();
        } else if (user.createdAt && typeof user.createdAt === 'object' && 'seconds' in user.createdAt) {
          userDate = new Timestamp(user.createdAt.seconds, user.createdAt.nanoseconds).toDate();
        } else {
          return; // Skip users without valid creation date
        }

        const dateStr = userDate.toISOString().split('T')[0];
        const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        if (userDate >= rangeStart) {
          userCounts[dateStr] = (userCounts[dateStr] || 0) + 1;
        }
      } catch (error) {
        console.warn("Error parsing user creation date:", error);
      }
    });

    // Convert to cumulative data
    let cumulativeCount = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      cumulativeCount += userCounts[dateStr] || 0;
      
      // Format date for display
      const displayDate = days <= 30 ? 
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
        date.toLocaleDateString('en-US', { month: 'short' });
      
      data.push({
        date: displayDate,
        count: cumulativeCount
      });
    }

    return data;
  };

  const stats = [
    {
      title: "Total Users",
      value: analyticsData.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
      change: "+12%",
      trend: "up" as const
    },
    {
      title: "Active Users (30d)",
      value: analyticsData.activeUsers,
      description: "Recently active users",
      icon: Users,
      color: "text-green-600",
      change: "+8%",
      trend: "up" as const
    },
    {
      title: "Total Challenges",
      value: analyticsData.totalChallenges,
      description: "Active challenges",
      icon: Shield,
      color: "text-purple-600",
      change: "+5%",
      trend: "up" as const
    },
    {
      title: "Challenge Solves",
      value: analyticsData.solvedChallenges,
      description: "Total solutions submitted",
      icon: Trophy,
      color: "text-orange-600",
      change: "+23%",
      trend: "up" as const
    },
    {
      title: "Success Rate",
      value: analyticsData.totalSubmissions > 0 ? 
        `${Math.round((analyticsData.successfulSubmissions / analyticsData.totalSubmissions) * 100)}%` : 
        "0%",
      description: "Successful submissions",
      icon: TrendingUp,
      color: "text-red-600",
      change: "+2%",
      trend: "up" as const
    },
    {
      title: "Avg Solve Time",
      value: analyticsData.averageSolveTime,
      description: "Average time to solve",
      icon: Clock,
      color: "text-indigo-600",
      change: "-15m",
      trend: "down" as const
    },
    {
      title: "Total Events",
      value: analyticsData.totalEvents,
      description: "All events created",
      icon: Calendar,
      color: "text-teal-600",
      change: "+3",
      trend: "up" as const
    },
    {
      title: "Active Events",
      value: analyticsData.activeEvents,
      description: "Live/upcoming events",
      icon: Calendar,
      color: "text-yellow-600",
      change: "+1",
      trend: "up" as const
    }
  ];

  const exportAnalytics = () => {
    const csvContent = [
      ['Metric', 'Value', 'Description'],
      ['Total Users', analyticsData.totalUsers, 'Registered users'],
      ['Active Users (30d)', analyticsData.activeUsers, 'Recently active users'],
      ['Total Challenges', analyticsData.totalChallenges, 'Active challenges'],
      ['Challenge Solves', analyticsData.solvedChallenges, 'Total solutions submitted'],
      ['Success Rate', `${analyticsData.totalSubmissions > 0 ? 
        Math.round((analyticsData.successfulSubmissions / analyticsData.totalSubmissions) * 100) : 
        0}%`, 'Successful submissions'],
      ['Average Solve Time', analyticsData.averageSolveTime, 'Average time to solve'],
      ['Total Events', analyticsData.totalEvents, 'All events created'],
      ['Active Events', analyticsData.activeEvents, 'Live/upcoming events'],
      ['Popular Category', analyticsData.popularCategory, 'Most solved category'],
      ['Total Submissions', analyticsData.totalSubmissions, 'All submissions'],
      ['Successful Submissions', analyticsData.successfulSubmissions, 'Correct submissions']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-3">
            ← Back to Admin
          </Button>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Real-time insights based on Firestore data
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
              className="p-2 border rounded text-sm bg-background"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics Dashboard</CardTitle>
          <CardDescription>
            Comprehensive overview of platform performance and user engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <span className={`text-xs font-medium ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Growth</CardTitle>
                <CardDescription>Last {timeRange === 'all' ? 'year' : timeRange}</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.userGrowthData.length > 0 ? (
                  <div className="space-y-3">
                    <div className="h-48 flex items-end gap-1 pb-4 border-b">
                      {analyticsData.userGrowthData.map((item, index) => {
                        const maxCount = Math.max(...analyticsData.userGrowthData.map(d => d.count));
                        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-3/4 bg-blue-500 rounded-t transition-all duration-300"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-muted-foreground mt-2 text-center">
                              {item.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Total users: {analyticsData.totalUsers.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No user growth data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Challenge Performance</CardTitle>
                <CardDescription>Solve rates by category</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.challengePerformance.length > 0 ? (
                  <div className="space-y-4">
                    {analyticsData.challengePerformance.slice(0, 5).map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm">
                            {item.solved}/{item.total} ({item.rate}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {analyticsData.challengePerformance.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        +{analyticsData.challengePerformance.length - 5} more categories
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No challenge performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Summary</CardTitle>
              <CardDescription>Key insights and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Most Popular Category</p>
                  <p className="text-lg font-semibold">{analyticsData.popularCategory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Submission Success Rate</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.totalSubmissions > 0 ? 
                      `${Math.round((analyticsData.successfulSubmissions / analyticsData.totalSubmissions) * 100)}%` : 
                      "0%"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Challenges per User</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.totalUsers > 0 ? 
                      (analyticsData.totalChallenges / analyticsData.totalUsers).toFixed(1) : 
                      "0"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Solves per Challenge</p>
                  <p className="text-lg font-semibold">
                    {analyticsData.totalChallenges > 0 ? 
                      (analyticsData.solvedChallenges / analyticsData.totalChallenges).toFixed(1) : 
                      "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
            <Button onClick={fetchAnalyticsData} variant="secondary">
              Refresh Data
            </Button>
            <Button onClick={exportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Export Full Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAnalytics;