// components/Hero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Flag, Users, Shield, Clock } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

interface RealStats {
  totalUsers: number;
  totalChallenges: number;
  liveEvents: number;
}

const Hero = () => {
  const [stats, setStats] = useState<RealStats>({
    totalUsers: 0,
    totalChallenges: 0,
    liveEvents: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRealStatistics = async () => {
    try {
      const realStats: RealStats = {
        totalUsers: 0,
        totalChallenges: 0,
        liveEvents: 0
      };

      // 1. Count Users - publicly readable
      try {
        const snapshot = await getCountFromServer(collection(db, 'users'));
        realStats.totalUsers = snapshot.data().count;
      } catch (error) {
        console.log("Could not count users");
      }

      // 2. Count Active Challenges - now publicly readable
      try {
        // Count only active challenges
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('isActive', '==', true)
        );
        const snapshot = await getCountFromServer(challengesQuery);
        realStats.totalChallenges = snapshot.data().count;
      } catch (error) {
        console.log("Could not count challenges");
      }

      // 3. Count Events - now publicly readable
      try {
        const snapshot = await getCountFromServer(collection(db, 'events'));
        realStats.liveEvents = snapshot.data().count;
      } catch (error) {
        console.log("Could not count events");
      }

      setStats(realStats);
      
    } catch (error) {
      console.log("Stats loading completed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealStatistics();
  }, []);

  const handleStartPracticing = () => {
    navigate('/practice');
  };

  const handleJoinLiveEvent = () => {
    navigate('/live');
  };

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

          {/* Real Statistics Display */}
          <div className="grid grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto">
            <StatCard 
              loading={loading}
              value={stats.totalUsers}
              label="Registered Users"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard 
              loading={loading}
              value={stats.totalChallenges}
              label="Active Challenges"
              icon={<Shield className="w-5 h-5" />}
            />
            <StatCard 
              loading={loading}
              value={stats.liveEvents}
              label="Events"
              icon={<Clock className="w-5 h-5" />}
            />
          </div>

          {/* Simple refresh button */}
          {!loading && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchRealStatistics}
              >
                Refresh Stats
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

// Stat Card Component
const StatCard = ({ loading, value, label, icon }: { 
  loading: boolean; 
  value: number; 
  label: string; 
  icon: React.ReactNode;
}) => {
  if (loading) {
    return (
      <div className="text-center animate-pulse">
        <div className="h-8 bg-muted rounded w-16 mx-auto mb-2"></div>
        <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="text-center group">
      <div className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-bold text-primary mb-1">
        {icon}
        {value.toLocaleString()}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

export default Hero;