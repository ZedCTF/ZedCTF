// Navbar.tsx
import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, Trophy, BookOpen, Home, Users, Activity, Flame, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import favicon from "/favicon.png";
import { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      navigate("/");
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={favicon} alt="ZedCTF" className="w-8 h-8" />
            <span className="text-2xl font-bold text-green-600 animate-pulse-glow">ZedCTF</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Home
            </Link>
            
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Dashboard
            </Link>
            
            <Link 
              to="/practice" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Practice
            </Link>
            
            <Link 
              to="/live" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <Flame className="w-4 h-4 group-hover:scale-110 transition-transform" />
              LIVE CTF
            </Link>
            
            <Link 
              to="/leaderboard" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Leaderboard
            </Link>
            
            <Link 
              to="/writeups" 
              className="flex items-center gap-2 text-foreground/80 hover:text-green-600 transition-colors group"
            >
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Writeups
            </Link>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </Button>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Conditional Auth Button */}
            {user ? (
              // Show when user is logged in
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/80 hidden sm:block">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-red-500 hover:bg-red-600 text-white gap-2"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {logoutLoading ? "..." : "Logout"}
                </Button>
              </div>
            ) : (
              // Show when user is logged out
              <Link to="/login">
                <Button variant="default" size="sm" className="bg-green-500 hover:bg-green-600 text-white animate-glow gap-2">
                  <User className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg animate-fade-in">
            <div className="py-4 space-y-4">
              <Link 
                to="/" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              
              <Link 
                to="/dashboard" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Activity className="w-5 h-5" />
                Dashboard
              </Link>
              
              <Link 
                to="/practice" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy className="w-5 h-5" />
                Practice
              </Link>
              
              <Link 
                to="/live" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <Flame className="w-5 h-5" />
                LIVE CTF
              </Link>
              
              <Link 
                to="/leaderboard" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                Leaderboard
              </Link>
              
              <Link 
                to="/writeups" 
                className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-green-600 hover:bg-accent rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen className="w-5 h-5" />
                Writeups
              </Link>
              
              {/* Conditional Mobile Auth Button */}
              <div className="px-4 pt-2 border-t border-border">
                {user ? (
                  <Button 
                    variant="default" 
                    className="w-full justify-start gap-2 bg-red-500 hover:bg-red-600"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    {logoutLoading ? "Signing out..." : "Logout"}
                  </Button>
                ) : (
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="default" className="w-full justify-start gap-2 bg-green-500 hover:bg-green-600">
                      <User className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;