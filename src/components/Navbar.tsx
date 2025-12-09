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
  
  // Show Dashboard to everyone EXCEPT admins/moderators
  const showDashboard = !loading && !isAdmin && !isModerator;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Always visible */}
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <img src={favicon} alt="ZedCTF" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">ZedCTF</span>
          </Link>
          
          {/* Desktop Navigation - Hides on smaller screens */}
          <div className="hidden lg:flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4 flex-1 justify-center mx-4">
            <Link 
              to="/" 
              className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isActivePath("/") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Home</span>
            </Link>
            
            {/* Dashboard - Show to everyone EXCEPT admins/moderators */}
            {showDashboard && (
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  isActivePath("/dashboard") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Activity className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">Dashboard</span>
              </Link>
            )}
            
            {/* Practice - Show to everyone */}
            <Link 
              to="/practice" 
              className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isActivePath("/practice") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Practice</span>
            </Link>
            
            {/* LIVE CTF - Show to everyone */}
            <Link 
              to="/live" 
              className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isActivePath("/live") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <Flame className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm md:text-base">LIVE CTF</span>
            </Link>
            
            {/* Leaderboard - Show to everyone */}
            <Link 
              to="/leaderboard" 
              className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isActivePath("/leaderboard") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Leaderboard</span>
            </Link>
            
            {/* Writeups - Show to everyone */}
            <Link 
              to="/writeups" 
              className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isActivePath("/writeups") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Writeups</span>
            </Link>

            {/* Admin Link - Only show for admins/moderators */}
            {showAdminLinks && (
              <Link 
                to="/admin" 
                className={`flex items-center gap-1 md:gap-2 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  isActivePath("/admin") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
                }`}
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">Admin</span>
              </Link>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0">
            {/* Search Button - Hide on smallest screens */}
            <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></span>
            </Button>

            {/* Mobile Menu Button - Show on medium and below */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Conditional Auth Button */}
            {user ? (
              // Show when user is logged in
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm text-foreground/80 hidden sm:block truncate max-w-[100px] md:max-w-[150px]">
                  {user.displayName || user.email?.split('@')[0]}
                  {showAdminLinks && " (Admin)"}
                </span>
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white gap-1 h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? (
                    <div className="animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden xs:inline">Logout</span>
                </Button>
              </div>
            ) : (
              // Show when user is logged out
              <Link to="/login">
                <Button variant="default" size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1 h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Sign In</span>
                  <span className="xs:hidden">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-lg animate-fade-in">
            <div className="py-3 space-y-2">
              <Link 
                to="/" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActivePath("/") 
                    ? "text-green-600" 
                    : "text-foreground/80 hover:text-green-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span>Home</span>
              </Link>
              
              {/* Dashboard - Show to everyone EXCEPT admins/moderators */}
              {showDashboard && (
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActivePath("/dashboard") 
                      ? "text-green-600" 
                      : "text-foreground/80 hover:text-green-600"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Activity className="w-5 h-5 flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>
              )}
              
              {/* Practice - Show to everyone */}
              <Link 
                to="/practice" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActivePath("/practice") 
                    ? "text-green-600" 
                    : "text-foreground/80 hover:text-green-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy className="w-5 h-5 flex-shrink-0" />
                <span>Practice</span>
              </Link>
              
              {/* LIVE CTF - Show to everyone */}
              <Link 
                to="/live" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActivePath("/live") 
                    ? "text-green-600" 
                    : "text-foreground/80 hover:text-green-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <Flame className="w-5 h-5 flex-shrink-0" />
                <span>LIVE CTF</span>
              </Link>
              
              {/* Leaderboard - Show to everyone */}
              <Link 
                to="/leaderboard" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActivePath("/leaderboard") 
                    ? "text-green-600" 
                    : "text-foreground/80 hover:text-green-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span>Leaderboard</span>
              </Link>
              
              {/* Writeups - Show to everyone */}
              <Link 
                to="/writeups" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActivePath("/writeups") 
                    ? "text-green-600" 
                    : "text-foreground/80 hover:text-green-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <span>Writeups</span>
              </Link>

              {/* Admin Link in Mobile Menu - Only show for admins/moderators */}
              {showAdminLinks && (
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActivePath("/admin") 
                      ? "text-green-600" 
                      : "text-foreground/80 hover:text-green-600"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span>Admin</span>
                </Link>
              )}
              
              {/* Conditional Mobile Auth Button */}
              <div className="pt-3 px-4 border-t border-border">
                {user ? (
                  <Button 
                    variant="default" 
                    className="w-full justify-center gap-2 bg-red-500 hover:bg-red-600 py-3"
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
                    <Button variant="default" className="w-full justify-center gap-2 bg-green-500 hover:bg-green-600 py-3">
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