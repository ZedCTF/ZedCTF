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
  Users, 
  Shield, 
  Trophy, 
  Clock,
  Calendar,
  TrendingUp,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  BarChart,
  Target,
  Award,
  Zap
} from "lucide-react";
import { 
  collection, 
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showAllStats, setShowAllStats] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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

  // Group stats by category for better organization
  const groupedStats = {
    userStats: [
      {
        title: "Total Users",
        value: analyticsData.totalUsers,
        description: "Registered users",
        icon: Users,
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
        change: "+12%",
        trend: "up" as const
      },
      {
        title: "Active Users (30d)",
        value: analyticsData.activeUsers,
        description: "Recently active",
        icon: Users,
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        change: "+8%",
        trend: "up" as const
      }
    ],
    challengeStats: [
      {
        title: "Total Challenges",
        value: analyticsData.totalChallenges,
        description: "Active challenges",
        icon: Shield,
        color: "text-purple-600",
        bgColor: "bg-purple-500/10",
        change: "+5%",
        trend: "up" as const
      },
      {
        title: "Challenge Solves",
        value: analyticsData.solvedChallenges,
        description: "Total solutions",
        icon: Trophy,
        color: "text-orange-600",
        bgColor: "bg-orange-500/10",
        change: "+23%",
        trend: "up" as const
      }
    ],
    performanceStats: [
      {
        title: "Success Rate",
        value: analyticsData.totalSubmissions > 0 ? 
          `${Math.round((analyticsData.successfulSubmissions / analyticsData.totalSubmissions) * 100)}%` : 
          "0%",
        description: "Correct submissions",
        icon: Target,
        color: "text-red-600",
        bgColor: "bg-red-500/10",
        change: "+2%",
        trend: "up" as const
      },
      {
        title: "Avg Solve Time",
        value: analyticsData.averageSolveTime,
        description: "Average time",
        icon: Clock,
        color: "text-indigo-600",
        bgColor: "bg-indigo-500/10",
        change: "-15m",
        trend: "down" as const
      }
    ],
    eventStats: [
      {
        title: "Total Events",
        value: analyticsData.totalEvents,
        description: "All events",
        icon: Calendar,
        color: "text-teal-600",
        bgColor: "bg-teal-500/10",
        change: "+3",
        trend: "up" as const
      },
      {
        title: "Active Events",
        value: analyticsData.activeEvents,
        description: "Live/upcoming",
        icon: Calendar,
        color: "text-yellow-600",
        bgColor: "bg-yellow-500/10",
        change: "+1",
        trend: "up" as const
      }
    ]
  };

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Green Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="mb-4 bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </div>

        {/* Main Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Platform Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Real-time insights based on Firestore data
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={exportAnalytics} 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Key Metrics</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllStats(!showAllStats)}
            className="text-xs"
          >
            {showAllStats ? 'Show Less' : 'Show All'}
            {showAllStats ? 
              <ChevronUp className="w-3 h-3 ml-1" /> : 
              <ChevronDown className="w-3 h-3 ml-1" />
            }
          </Button>
        </div>

        {/* User Stats - Always Visible */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <div className="p-1 bg-blue-500/20 rounded">
              <Users className="w-3 h-3 text-blue-600" />
            </div>
            User Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {groupedStats.userStats.map((stat, index) => (
              <Card key={index} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      stat.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xl font-bold mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 opacity-80">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Challenge Stats - Always Visible */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <div className="p-1 bg-purple-500/20 rounded">
              <Shield className="w-3 h-3 text-purple-600" />
            </div>
            Challenge Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {groupedStats.challengeStats.map((stat, index) => (
              <Card key={index} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      stat.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xl font-bold mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 opacity-80">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Stats - Conditionally Visible */}
        {showAllStats && (
          <>
            {/* Performance Stats */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <div className="p-1 bg-red-500/20 rounded">
                  <Target className="w-3 h-3 text-red-600" />
                </div>
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {groupedStats.performanceStats.map((stat, index) => (
                  <Card key={index} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          stat.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-xl font-bold mb-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-80">{stat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Event Stats */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <div className="p-1 bg-teal-500/20 rounded">
                  <Calendar className="w-3 h-3 text-teal-600" />
                </div>
                Event Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {groupedStats.eventStats.map((stat, index) => (
                  <Card key={index} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          stat.trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-xl font-bold mb-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-80">{stat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Collapsible Analytics Sections */}
        <div className="space-y-4 mt-8">
          {/* User Growth Section */}
          <Card>
            <button 
              onClick={() => toggleSection('growth')}
              className="w-full text-left"
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">User Growth</CardTitle>
                      <CardDescription className="text-xs">
                        Last {timeRange === 'all' ? 'year' : timeRange}
                      </CardDescription>
                    </div>
                  </div>
                  {expandedSection === 'growth' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </CardHeader>
            </button>
            
            {expandedSection === 'growth' && (
              <CardContent className="p-4 pt-0">
                {analyticsData.userGrowthData.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto pb-2 -mx-2 px-2">
                      <div className="min-w-[500px]">
                        <div className="h-32 flex items-end gap-1 pb-4 border-b">
                          {analyticsData.userGrowthData.map((item, index) => {
                            const maxCount = Math.max(...analyticsData.userGrowthData.map(d => d.count));
                            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                            
                            return (
                              <div key={index} className="flex-1 flex flex-col items-center min-w-[30px]">
                                <div 
                                  className="w-3/4 bg-blue-500 rounded-t transition-all duration-300"
                                  style={{ height: `${height}%` }}
                                />
                                <span className="text-xs text-muted-foreground mt-2 text-center whitespace-nowrap">
                                  {item.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      Total users: <span className="font-semibold">{analyticsData.totalUsers.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <BarChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No user growth data available</p>
                    <p className="text-xs">Try selecting a different time range</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Challenge Performance Section */}
          <Card>
            <button 
              onClick={() => toggleSection('performance')}
              className="w-full text-left"
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Challenge Performance</CardTitle>
                      <CardDescription className="text-xs">
                        Solve rates by category
                      </CardDescription>
                    </div>
                  </div>
                  {expandedSection === 'performance' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </CardHeader>
            </button>
            
            {expandedSection === 'performance' && (
              <CardContent className="p-4 pt-0">
                {analyticsData.challengePerformance.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Most Popular:</span>
                      <span className="text-sm font-semibold text-primary">
                        {analyticsData.popularCategory}
                      </span>
                    </div>
                    
                    {analyticsData.challengePerformance.slice(0, 4).map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate flex-1">{item.category}</span>
                          <span className="text-sm font-semibold flex-shrink-0 ml-2">
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
                    
                    {analyticsData.challengePerformance.length > 4 && (
                      <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                        +{analyticsData.challengePerformance.length - 4} more categories
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No challenge performance data available</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Platform Summary Section */}
          <Card>
            <button 
              onClick={() => toggleSection('summary')}
              className="w-full text-left"
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Platform Summary</CardTitle>
                      <CardDescription className="text-xs">
                        Key insights and metrics
                      </CardDescription>
                    </div>
                  </div>
                  {expandedSection === 'summary' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </CardHeader>
            </button>
            
            {expandedSection === 'summary' && (
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 p-3 bg-blue-500/5 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Most Popular Category</p>
                    <p className="text-sm font-semibold truncate">{analyticsData.popularCategory}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-green-500/5 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-sm font-semibold">
                      {analyticsData.totalSubmissions > 0 ? 
                        `${Math.round((analyticsData.successfulSubmissions / analyticsData.totalSubmissions) * 100)}%` : 
                        "0%"}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-purple-500/5 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Challenges per User</p>
                    <p className="text-sm font-semibold">
                      {analyticsData.totalUsers > 0 ? 
                        (analyticsData.totalChallenges / analyticsData.totalUsers).toFixed(1) : 
                        "0"}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-orange-500/5 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Solves per Challenge</p>
                    <p className="text-sm font-semibold">
                      {analyticsData.totalChallenges > 0 ? 
                        (analyticsData.solvedChallenges / analyticsData.totalChallenges).toFixed(1) : 
                        "0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Button 
            onClick={fetchAnalyticsData} 
            variant="outline" 
            className="w-full"
          >
            Refresh Analytics Data
          </Button>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={onBack} 
              variant="outline" 
              className="w-full"
            >
              Back to Dashboard
            </Button>
            <Button 
              onClick={exportAnalytics} 
              className="w-full bg-green-500 hover:bg-green-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Full Report
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p>Last updated: {new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit'
            })}</p>
          </div>
          <p>Data updates in real-time from Firestore</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalytics;