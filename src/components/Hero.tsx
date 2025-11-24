import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Flag, Users, Shield, Clock } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PlatformStats {
  activeUsers: number;
  totalChallenges: number;
  liveEvents: number;
  completedChallenges: number;
}

const Hero = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch real platform statistics
  const fetchPlatformStats = async () => {
    try {
      // Replace with your actual API endpoint
      const STATS_API = '/api/platform/stats';
      
      const response = await fetch(STATS_API);
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
        setStats(null);
      }
    } catch (err) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPracticing = () => {
    navigate('/practice');
  };

  const handleJoinLiveEvent = () => {
    navigate('/live');
  };

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 cyber-grid opacity-10" />
      
      <div className="container relative z-10 px-4 py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-4">
            <Flag className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-mono">Zambia's Premier CTF Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Master Cybersecurity
            <br />
            <span className="neon-text animate-pulse-glow">Capture The Flag</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sharpen your hacking skills, compete in real-time challenges, and climb the leaderboard. 
            From beginner to expert, ZedCTF is your gateway to cybersecurity mastery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              onClick={handleStartPracticing}
              variant="neon" 
              size="lg" 
              className="group"
            >
              Start Practicing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              onClick={handleJoinLiveEvent}
              variant="terminal" 
              size="lg"
            >
              <Code2 className="w-5 h-5" />
              Join LIVE Event
            </Button>
          </div>

          {/* Real Statistics Grid */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            {/* Active Users */}
            <div className="text-center">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
                </div>
              ) : stats ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-1">
                    <Users className="w-6 h-6" />
                    {stats.activeUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-muted-foreground mb-1">-</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </>
              )}
            </div>

            {/* Challenges */}
            <div className="text-center">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
                </div>
              ) : stats ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-1">
                    <Shield className="w-6 h-6" />
                    {stats.totalChallenges}
                  </div>
                  <div className="text-sm text-muted-foreground">Challenges</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-muted-foreground mb-1">-</div>
                  <div className="text-sm text-muted-foreground">Challenges</div>
                </>
              )}
            </div>

            {/* Live Events */}
            <div className="text-center">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
                </div>
              ) : stats ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-1">
                    <Clock className="w-6 h-6" />
                    {stats.liveEvents}
                  </div>
                  <div className="text-sm text-muted-foreground">Live Events</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-muted-foreground mb-1">-</div>
                  <div className="text-sm text-muted-foreground">Live Events</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;