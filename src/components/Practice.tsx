import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Code, Database, Shield, Globe } from "lucide-react";

const Practice = () => {
  const categories = [
    { name: "Web Exploitation", icon: Globe, count: 24, color: "text-primary" },
    { name: "Cryptography", icon: Lock, count: 18, color: "text-secondary" },
    { name: "Binary Exploitation", icon: Code, count: 15, color: "text-primary" },
    { name: "Forensics", icon: Database, count: 21, color: "text-secondary" }
  ];

  const challenges = [
    {
      title: "SQL Injection Basics",
      difficulty: "Easy",
      points: 100,
      solved: 234,
      category: "Web",
      completed: true
    },
    {
      title: "Buffer Overflow Advanced",
      difficulty: "Hard",
      points: 500,
      solved: 45,
      category: "Binary",
      completed: false
    },
    {
      title: "Caesar Cipher Cracking",
      difficulty: "Medium",
      points: 250,
      solved: 156,
      category: "Crypto",
      completed: true
    },
    {
      title: "Memory Dump Analysis",
      difficulty: "Medium",
      points: 300,
      solved: 89,
      category: "Forensics",
      completed: false
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-primary/20 text-primary border-primary/30";
      case "Medium": return "bg-secondary/20 text-secondary border-secondary/30";
      case "Hard": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted";
    }
  };

  return (
    <section id="practice" className="py-24">
      <div className="container px-4 mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-primary">Practice</span> Arena
          </h2>
          <p className="text-muted-foreground">Sharpen your skills with 70+ challenges</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card 
                key={index}
                className="border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group"
              >
                <CardContent className="pt-6">
                  <Icon className={`w-12 h-12 ${category.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <h3 className="font-bold text-lg mb-2">{category.name}</h3>
                  <p className="text-muted-foreground text-sm">{category.count} challenges</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Featured Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges.map((challenge, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {challenge.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    ) : (
                      <Shield className="w-6 h-6 text-muted-foreground mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg mb-2">{challenge.title}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {challenge.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {challenge.solved} solved
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 md:ml-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {challenge.points}
                      </div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                    <Button variant={challenge.completed ? "outline" : "neon"} size="sm">
                      {challenge.completed ? "Review" : "Start"}
                    </Button>
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

export default Practice;
