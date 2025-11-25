// src/components/Navbar.tsx
import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, Trophy, BookOpen, Home, Users, Activity, Flame, User, LogOut, Shield } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import favicon from "/favicon.png";
import { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useAdminContext } from "../contexts/AdminContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthContext();
  const { isAdmin, isModerator, loading } = useAdminContext();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Check if current path is active for styling
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  // Don't show admin links while loading
  const showAdminLinks = !loading && (isAdmin || isModerator);
  
  // Hide user-facing navigation for admins/moderators
  const showUserNavigation = !loading && !isAdmin && !isModerator;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={favicon} alt="ZedCTF" className="w-8 h-8" />
            <span className="text-2xl font-bold text-green-600">ZedCTF</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 transition-colors group ${
                isActivePath("/") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Home
            </Link>
            
            {/* Only show Dashboard for regular users */}
            {showUserNavigation && (
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/dashboard") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Dashboard
              </Link>
            )}
            
            {/* Only show Practice for regular users */}
            {showUserNavigation && (
              <Link 
                to="/practice" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/practice") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Practice
              </Link>
            )}
            
            {/* Only show LIVE CTF for regular users */}
            {showUserNavigation && (
              <Link 
                to="/live" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/live") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <Flame className="w-4 h-4 group-hover:scale-110 transition-transform" />
                LIVE CTF
              </Link>
            )}
            
            {/* Only show Leaderboard for regular users */}
            {showUserNavigation && (
              <Link 
                to="/leaderboard" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/leaderboard") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Leaderboard
              </Link>
            )}
            
            {/* Only show Writeups for regular users */}
            {showUserNavigation && (
              <Link 
                to="/writeups" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/writeups") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Writeups
              </Link>
            )}

            {/* Admin Link - Only show for admins/moderators */}
            {showAdminLinks && (
              <Link 
                to="/admin" 
                className={`flex items-center gap-2 transition-colors group ${
                  isActivePath("/admin") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Admin
              </Link>
            )}
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button - Only show for regular users */}
            {showUserNavigation && (
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="w-5 h-5" />
              </Button>
            )}

            {/* Notifications - Only show for regular users */}
            {showUserNavigation && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </Button>
            )}

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
                  {showAdminLinks && " (Admin)"}
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
                <Button variant="default" size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-2">
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
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                  isActivePath("/") 
                    ? "text-green-600 bg-green-50" 
                    : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              
              {/* Only show Dashboard for regular users */}
              {showUserNavigation && (
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/dashboard") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Activity className="w-5 h-5" />
                  Dashboard
                </Link>
              )}
              
              {/* Only show Practice for regular users */}
              {showUserNavigation && (
                <Link 
                  to="/practice" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/practice") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Trophy className="w-5 h-5" />
                  Practice
                </Link>
              )}
              
              {/* Only show LIVE CTF for regular users */}
              {showUserNavigation && (
                <Link 
                  to="/live" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/live") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <Flame className="w-5 h-5" />
                  LIVE CTF
                </Link>
              )}
              
              {/* Only show Leaderboard for regular users */}
              {showUserNavigation && (
                <Link 
                  to="/leaderboard" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/leaderboard") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  Leaderboard
                </Link>
              )}
              
              {/* Only show Writeups for regular users */}
              {showUserNavigation && (
                <Link 
                  to="/writeups" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/writeups") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BookOpen className="w-5 h-5" />
                  Writeups
                </Link>
              )}

              {/* Admin Link in Mobile Menu - Only show for admins/moderators */}
              {showAdminLinks && (
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActivePath("/admin") 
                      ? "text-green-600 bg-green-50" 
                      : "text-foreground/80 hover:text-green-600 hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </Link>
              )}
              
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