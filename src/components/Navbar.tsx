import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="ZedCTF" className="w-8 h-8" />
            <span className="text-2xl font-bold neon-text">ZedCTF</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <a href="#dashboard" className="text-foreground/80 hover:text-primary transition-colors">
              Dashboard
            </a>
            <a href="#practice" className="text-foreground/80 hover:text-primary transition-colors">
              Practice
            </a>
            <a href="#live" className="text-foreground/80 hover:text-primary transition-colors">
              LIVE
            </a>
            <a href="#leaderboard" className="text-foreground/80 hover:text-primary transition-colors">
              Leaderboard
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            </Button>
            <Button variant="neon" size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
