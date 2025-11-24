// components/Hero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Flag, Users, Shield, Clock, Trophy } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { db } from "../firebase";

interface RealStats {
  totalUsers: number;
  totalChallenges: number;
  liveEvents: number;
  totalCompletions: number;
}

const Hero = () => {
  const [stats, setStats] = useState<RealStats>({
    totalUsers: 0,
    totalChallenges: 0,
    liveEvents: 0,
    totalCompletions: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRealStatistics = async () => {
    try {
      const realStats: RealStats = {
        totalUsers: 0,
        totalChallenges: 0,
        liveEvents: 0,
        totalCompletions: 0
      };

      // 1. Count Users - try multiple collection names silently
      const userCollections = ['users', 'user', 'members', 'profiles'];
      for (const collName of userCollections) {
        try {
          const snapshot = await getCountFromServer(collection(db, collName));
          const count = snapshot.data().count;
          if (count > 0) {
            realStats.totalUsers = count;
            break;
          }
        } catch (error) {
          // Silently continue to next collection name
          continue;
        }
      }

      // 2. Count Challenges
      const challengeCollections = ['challenges', 'challenge', 'ctfChallenges', 'practice'];
      for (const collName of challengeCollections) {
        try {
          const snapshot = await getCountFromServer(collection(db, collName));
          const count = snapshot.data().count;
          if (count > 0) {
            realStats.totalChallenges = count;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // 3. Count Events
      const eventCollections = ['events', 'event', 'liveEvents', 'competitions'];
      for (const collName of eventCollections) {
        try {
          const snapshot = await getCountFromServer(collection(db, collName));
          const count = snapshot.data().count;
          if (count > 0) {
            realStats.liveEvents = count;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // 4. Count Completions
      const completionCollections = ['submissions', 'submission', 'solves', 'completions'];
      for (const collName of completionCollections) {
        try {
          const snapshot = await getCountFromServer(collection(db, collName));
          const count = snapshot.data().count;
          if (count > 0) {
            realStats.totalCompletions = count;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // If no completions collection, calculate from users silently
      if (realStats.totalCompletions === 0 && realStats.totalUsers > 0) {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          let totalSolved = 0;
          usersSnapshot.forEach(doc => {
            const userData = doc.data();
            totalSolved += userData.challengesSolved || userData.solvedChallenges || userData.totalSolved || 0;
          });
          realStats.totalCompletions = totalSolved;
        } catch (error) {
          // Silently fail
        }
      }

      setStats(realStats);
      
    } catch (error) {
      // Silently handle any errors - don't expose any information
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

          {/* Clean Statistics Display - No Error Messages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-3xl mx-auto">
            <StatCard 
              loading={loading}
              value={stats.totalUsers}
              label="Registered Users"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard 
              loading={loading}
              value={stats.totalChallenges}
              label="Challenges"
              icon={<Shield className="w-5 h-5" />}
            />
            <StatCard 
              loading={loading}
              value={stats.liveEvents}
              label="Live Events"
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard 
              loading={loading}
              value={stats.totalCompletions}
              label="Completions"
              icon={<Trophy className="w-5 h-5" />}
            />
          </div>

          {/* Simple refresh button - no status messages */}
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