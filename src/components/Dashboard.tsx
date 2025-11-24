import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, TrendingUp, User, Calendar, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface UserStats {
  totalPoints: number;
  challengesSolved: number;
  currentRank: number;
  timeSpent: string;
  username: string;
  joinDate: string;
}

interface Challenge {
  id: string;
  title: string;
  points: number;
  solvedAt: string;
  category: string;
  difficulty: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  prize: string;
  position: number;
  pointsEarned: number;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  points?: number;
}

const Dashboard = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [solvedChallenges, setSolvedChallenges] = useState<Challenge[]>([]);
  const [eventsParticipated, setEventsParticipated] = useState<Event[]>([]);
  const [userActivity, setUserActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Replace with your actual API endpoints
      const USER_STATS_API = '/api/user/stats';
      const SOLVED_CHALLENGES_API = '/api/user/challenges/solved';
      const EVENTS_API = '/api/user/events/participated';
      const ACTIVITY_API = '/api/user/activity';

      const [statsResponse, challengesResponse, eventsResponse, activityResponse] = await Promise.all([
        fetch(USER_STATS_API),
        fetch(SOLVED_CHALLENGES_API),
        fetch(EVENTS_API),
        fetch(ACTIVITY_API)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUserStats(statsData);
      } else {
        setUserStats(null);
      }

      if (challengesResponse.ok) {
        const challengesData = await challengesResponse.json();
        setSolvedChallenges(challengesData);
      } else {
        setSolvedChallenges([]);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEventsParticipated(eventsData);
      } else {
        setEventsParticipated([]);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setUserActivity(activityData);
      } else {
        setUserActivity([]);
      }

    } catch (err) {
      setUserStats(null);
      setSolvedChallenges([]);
      setEventsParticipated([]);
      setUserActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="dashboard" className="pt-24 pb-16 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section id="dashboard" className="pt-24 pb-16 min-h-screen">
        <div className="container px-4 mx-auto">
          {/* User Welcome Section */}
          <div className="mb-8">
            {userStats ? (
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold">
                    Welcome back, <span className="text-primary">{userStats.username}</span>
                  </h2>
                  <p className="text-muted-foreground">
                    Member since {new Date(userStats.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-4">Your <span className="text-primary">Dashboard</span></h2>
                <p className="text-muted-foreground">Track your progress and performance</p>
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {userStats ? (
              <>
                <Card className="border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Points
                    </CardTitle>
                    <Trophy className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{userStats.totalPoints.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Lifetime points earned</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Challenges Solved
                    </CardTitle>
                    <Target className="w-5 h-5 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{userStats.challengesSolved}</div>
                    <p className="text-xs text-muted-foreground">Total challenges completed</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Current Rank
                    </CardTitle>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">#{userStats.currentRank}</div>
                    <p className="text-xs text-muted-foreground">Global leaderboard position</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Time Spent
                    </CardTitle>
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{userStats.timeSpent}</div>
                    <p className="text-xs text-muted-foreground">Total practice time</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Loading state for stats
              [...Array(4)].map((_, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-24 mb-4"></div>
                      <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Solved Challenges */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Recently Solved Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {solvedChallenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No challenges solved yet</p>
                    <p className="text-sm mt-2">Start practicing to see your progress here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solvedChallenges.slice(0, 5).map((challenge) => (
                      <div key={challenge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{challenge.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{challenge.category}</span>
                            <span>•</span>
                            <span>{challenge.difficulty}</span>
                            <span>•</span>
                            <span>{new Date(challenge.solvedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-primary font-bold">+{challenge.points}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Participated */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Events Participated In
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsParticipated.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events participated yet</p>
                    <p className="text-sm mt-2">Join live events to appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventsParticipated.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{event.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{event.date}</span>
                            {event.position && <span>• Position: #{event.position}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary font-bold">{event.prize}</div>
                          {event.pointsEarned > 0 && (
                            <div className="text-xs text-primary">+{event.pointsEarned} pts</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Activity */}
            <Card className="border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm mt-2">Your activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userActivity.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-sm text-muted-foreground">{activity.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </div>
                          {activity.points && (
                            <div className="text-sm text-primary font-bold">+{activity.points}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Dashboard;