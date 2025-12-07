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
import NotificationDropdown from "./NotificationDropdown";

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

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const showAdminLinks = !loading && (isAdmin || isModerator);
  const showDashboard = !loading && !isAdmin && !isModerator;

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
            
            {/* Dashboard - Show to everyone EXCEPT admins/moderators */}
            {showDashboard && (
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
            
            {/* Practice - Show to everyone */}
            <Link 
              to="/practice" 
              className={`flex items-center gap-2 transition-colors group ${
                isActivePath("/practice") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Practice
            </Link>
            
            {/* LIVE CTF - Show to everyone */}
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
            
            {/* Leaderboard - Show to everyone */}
            <Link 
              to="/leaderboard" 
              className={`flex items-center gap-2 transition-colors group ${
                isActivePath("/leaderboard") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Leaderboard
            </Link>
            
            {/* Writeups - Show to everyone */}
            <Link 
              to="/writeups" 
              className={`flex items-center gap-2 transition-colors group ${
                isActivePath("/writeups") ? "text-green-600" : "text-foreground/80 hover:text-green-600"
              }`}
            >
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Writeups
            </Link>

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
            {/* Search Button - Show to everyone */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications Dropdown - Show to logged-in users */}
            {user && <NotificationDropdown />}

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
            <div className="py-4 space-y-1">
              <Link 
                to="/" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              
              {/* Dashboard - Show to everyone EXCEPT admins/moderators */}
              {showDashboard && (
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                    isActivePath("/dashboard") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Activity className="w-5 h-5" />
                  Dashboard
                </Link>
              )}
              
              <Link 
                to="/practice" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/practice") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy className="w-5 h-5" />
                Practice
              </Link>
              
              <Link 
                to="/live" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/live") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <Flame className="w-5 h-5" />
                LIVE CTF
              </Link>
              
              <Link 
                to="/leaderboard" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/leaderboard") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                Leaderboard
              </Link>
              
              <Link 
                to="/writeups" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/writeups") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen className="w-5 h-5" />
                Writeups
              </Link>
              
              {/* Admin Link - Only show for admins/moderators */}
              {showAdminLinks && (
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                    isActivePath("/admin") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </Link>
              )}
              
              {/* Search Link for Mobile */}
              <Link 
                to="/search" 
                className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                  isActivePath("/search") ? "text-green-600 bg-green-600/10" : "text-foreground/80 hover:text-green-600 hover:bg-green-600/5"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Search className="w-5 h-5" />
                Search
              </Link>
              
              {/* User Info and Logout for Mobile */}
              {user ? (
                <>
                  <div className="px-4 py-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-foreground/60" />
                      <span className="text-sm font-medium">
                        {user.displayName || user.email?.split('@')[0]}
                        {showAdminLinks && " (Admin)"}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                    >
                      {logoutLoading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <LogOut className="w-5 h-5" />
                      )}
                      {logoutLoading ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center gap-3 px-4 py-3 mx-4 mt-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors justify-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;