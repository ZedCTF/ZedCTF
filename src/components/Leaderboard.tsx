import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export interface CTFTeam {
  rank: number;
  team: string;
  captain: string;
  points: number;
  lastActivity: string;
  challenge: string;
}

export interface TopUser {
  rank: number;
  name: string;
  points: number;
  solved: number;
  badge?: string;
}

interface LeaderboardProps {
  eventName?: string;
}

const Leaderboard = ({ eventName = "CTF Competition" }: LeaderboardProps) => {
  const [ctfTeams, setCtfTeams] = useState<CTFTeam[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Real API endpoints - update these with your actual backend URLs
  const fetchLeaderboardData = async () => {
    try {
      // Replace these with your actual API endpoints
      const CTF_LEADERBOARD_API = '/api/ctf/leaderboard';
      const PLATFORM_LEADERBOARD_API = '/api/platform/top-users';

      const [ctfResponse, platformResponse] = await Promise.all([
        fetch(CTF_LEADERBOARD_API, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch(PLATFORM_LEADERBOARD_API)
      ]);

      if (ctfResponse.ok) {
        const ctfData = await ctfResponse.json();
        setCtfTeams(ctfData);
      } else {
        setCtfTeams([]);
      }

      if (platformResponse.ok) {
        const platformData = await platformResponse.json();
        setTopUsers(platformData);
      } else {
        setTopUsers([]);
      }
    } catch (err) {
      // Silent fail - just set empty arrays
      setCtfTeams([]);
      setTopUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(); // Initial fetch
    
    // Silent auto-refresh every 5 seconds
    const interval = setInterval(fetchLeaderboardData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="leaderboard" className="pt-24 pb-16 bg-muted/20 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading leaderboard data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* Live CTF Competition Leaderboard */}
      <section id="ctf-leaderboard" className="pt-24 pb-16 bg-background min-h-screen">
        <div className="container px-4 mx-auto">
          <div className="mb-8 text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {eventName} - <span className="text-primary">Live Scoreboard</span>
            </h2>
          </div>

          <Card className="max-w-6xl mx-auto border-border">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-primary" />
                  Live Competition Rankings
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {ctfTeams.length > 0 ? `${ctfTeams.length} Teams Competing` : 'No active competition'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ctfTeams.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No scores available yet</p>
                  <p className="text-sm">Leaderboard will update when competition starts</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Team</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Captain</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Points</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Activity</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Challenge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ctfTeams.map((team) => (
                        <tr 
                          key={team.rank} 
                          className="hover:bg-muted/20 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-bold ${
                              team.rank <= 3 ? 'text-primary' : 'text-foreground'
                            }`}>
                              {team.rank}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {team.team}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            {team.captain}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-primary">
                              {team.points}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {team.lastActivity}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                            {team.challenge}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Top Platform Performers */}
      <section id="platform-leaderboard" className="py-16 bg-muted/20">
        <div className="container px-4 mx-auto">
          <div className="mb-12 text-center">
            <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-4">
              Global <span className="text-primary">Leaderboard</span>
            </h2>
            <p className="text-muted-foreground">Top performers this month</p>
          </div>

          <Card className="max-w-4xl mx-auto border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-primary" />
                Top Platform Hackers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No platform rankings available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topUsers.map((user) => (
                    <div
                      key={user.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                        user.rank <= 3
                          ? 'bg-primary/10 border-2 border-primary/30 hover:border-primary/50'
                          : 'bg-muted/30 border border-border hover:border-primary/30'
                      }`}
                    >
                      <div className={`text-2xl font-bold w-12 text-center ${
                        user.rank <= 3 ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {user.badge || `#${user.rank}`}
                      </div>
                      
                      <Avatar className="w-12 h-12 border-2 border-primary/30">
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-bold text-lg">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.solved} challenges solved
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {user.points.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Leaderboard;