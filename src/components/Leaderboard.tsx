import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Leaderboard = () => {
  const topUsers = [
    { rank: 1, name: "CyberNinja", points: 8450, solved: 124, badge: "🥇" },
    { rank: 2, name: "H4ck3rZ", points: 7920, solved: 118, badge: "🥈" },
    { rank: 3, name: "SecurityPro", points: 7350, solved: 112, badge: "🥉" },
    { rank: 4, name: "CodeBreaker", points: 6890, solved: 105 },
    { rank: 5, name: "BinaryMaster", points: 6420, solved: 98 },
    { rank: 6, name: "ExploitKing", points: 5980, solved: 92 },
    { rank: 7, name: "CryptoHawk", points: 5650, solved: 87 },
    { rank: 8, name: "WebSlinger", points: 5210, solved: 81 }
  ];

  return (
    <section id="leaderboard" className="py-24 bg-muted/20">
      <div className="container px-4 mx-auto">
        <div className="mb-12 text-center">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-4xl font-bold mb-4">
            Global <span className="text-primary">Leaderboard</span>
          </h2>
          <p className="text-muted-foreground">Top performers this month</p>
        </div>

        <Card className="max-w-4xl mx-auto border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" />
              Top 8 Hackers
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Leaderboard;
