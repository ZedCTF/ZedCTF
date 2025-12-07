// src/components/AdminDashboard.tsx - FULLY RESPONSIVE
import { useState, useEffect } from "react";
import { useAdminContext } from "../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Shield,
  Calendar, 
  FileText, 
  BarChart3,
  Plus,
  Settings,
  List,
  Edit3,
  RefreshCw,
  UserCheck,
  Bell,
  ChevronLeft,
  Menu,
  Home,
  AlertCircle
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

// Import the components
import UserManagement from "./admin/UserManagement";
import ChallengeCreation from "./admin/ChallengeCreation";
import ChallengeManagement from "./admin/ChallengeManagement";
import ChallengeEdit from "./admin/ChallengeEdit";
import EventScheduling from "./admin/EventScheduling";
import EventManagement from "./admin/EventManagement";
import WriteupReview from "./admin/WriteupReview";
import PlatformAnalytics from "./admin/PlatformAnalytics";
import SystemSettings from "./admin/SystemSettings";
import AddChallenges from "./admin/AddChallenges";
import LeaderboardRecalc from "./admin/LeaderboardRecalc";
import UsernameSync from "./admin/UsernameSync";
import AdminNotifications from "./admin/AdminNotifications";

interface Stats {
  totalUsers: number;
  activeChallenges: number;
  totalChallenges: number;
  liveEvents: number;
  totalEvents: number;
  pendingWriteups: number;
  totalWriteups: number;
}

const AdminDashboard = () => {
  const { isAdmin, isModerator, permissions, loading: adminLoading } = useAdminContext();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeChallenges: 0,
    totalChallenges: 0,
    liveEvents: 0,
    totalEvents: 0,
    pendingWriteups: 0,
    totalWriteups: 0
  });
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real stats from Firestore
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users count
      const usersSnapshot = await getDocs(collection(db, "users"));
      const totalUsers = usersSnapshot.size;

      // Fetch challenges
      const challengesSnapshot = await getDocs(collection(db, "challenges"));
      const totalChallenges = challengesSnapshot.size;
      const activeChallenges = challengesSnapshot.docs.filter(doc => 
        doc.data().isActive === true
      ).length;

      // Fetch events
      const eventsSnapshot = await getDocs(collection(db, "events"));
      const totalEvents = eventsSnapshot.size;
      
      // Calculate live events
      const now = new Date();
      const liveEvents = eventsSnapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.startDate || !data.endDate) return false;
        
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return now >= start && now <= end;
      }).length;

      // Fetch writeups
      const writeupsSnapshot = await getDocs(collection(db, "writeups"));
      const totalWriteups = writeupsSnapshot.size;
      const pendingWriteups = writeupsSnapshot.docs.filter(doc => 
        doc.data().status === 'pending' || !doc.data().status
      ).length;

      setStats({
        totalUsers,
        activeChallenges,
        totalChallenges,
        liveEvents,
        totalEvents,
        pendingWriteups,
        totalWriteups
      });

    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle event creation - redirect to challenge management
  const handleEventCreated = (eventId: string, eventData: any) => {
    setSelectedEvent({ id: eventId, ...eventData });
    setActiveView("challenge-management");
    console.log("Event created, redirecting to challenge management:", eventData);
  };

  // Handle adding challenges to event
  const handleAddChallengesToEvent = (event: any) => {
    setSelectedEvent(event);
    setActiveView("add-challenges");
  };

  // Handle challenges added to event
  const handleChallengesAdded = (challengeIds: string[]) => {
    console.log("Challenges added to event:", challengeIds);
    setActiveView("event-management");
  };

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchStats();
    }
  }, [isAdmin, isModerator]);

  // Redirect if not admin/moderator
  if (!isAdmin && !isModerator) {
    if (adminLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }
    
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="max-w-md mx-auto">
              <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You don't have permission to access the admin dashboard.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  // Render different views based on activeView state
  const renderActiveView = () => {
    switch (activeView) {
      case "users":
        return isAdmin ? <UserManagement onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "event-management":
        return (
          <EventManagement 
            onBack={() => setActiveView("overview")}
            onAddChallenges={handleAddChallengesToEvent}
          />
        );
      case "challenge-management":
        return (
          <ChallengeManagement 
            onBack={() => setActiveView("overview")}
            onCreateNew={() => setActiveView("create-challenge")}
            onEditChallenge={(challenge) => {
              setSelectedChallenge(challenge);
              setActiveView("edit-challenge");
            }}
          />
        );
      case "add-challenges":
        return (
          <AddChallenges
            event={selectedEvent}
            onBack={() => setActiveView("event-management")}
            onChallengesAdded={handleChallengesAdded}
            onCreateNewChallenge={() => setActiveView("create-challenge")}
            onManageChallenges={() => setActiveView("challenge-management")}
          />
        );
      case "create-challenge":
        return (
          <ChallengeCreation 
            onBack={() => {
              // Smart back navigation - check where we came from
              if (selectedEvent) {
                // If we came from AddChallenges, go back there
                setActiveView("add-challenges");
                // Clear the selected event after navigating back
                setSelectedEvent(null);
              } else {
                // Otherwise go to challenge management
                setActiveView("challenge-management");
              }
            }}
            onChallengeCreated={(challengeId) => {
              console.log("Challenge created:", challengeId);
              // Optionally show success message or navigate
              if (selectedEvent) {
                // If created from AddChallenges, go back there
                setActiveView("add-challenges");
                setSelectedEvent(null);
              } else {
                // Otherwise go to challenge management
                setActiveView("challenge-management");
              }
            }}
          />
        );
      case "edit-challenge":
        return (
          <ChallengeEdit 
            challengeId={selectedChallenge.id}
            onBack={() => setActiveView("challenge-management")}
            onSave={() => setActiveView("challenge-management")}
          />
        );
      case "schedule-event":
        return (
          <EventScheduling 
            onBack={() => setActiveView("overview")} 
            userRole={isAdmin ? "admin" : "moderator"}
            onEventCreated={handleEventCreated}
          />
        );
      case "review-writeups":
        return isAdmin ? <WriteupReview onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "analytics":
        return isAdmin ? <PlatformAnalytics onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "settings":
        return isAdmin ? <SystemSettings onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "leaderboard-recalc":
        return isAdmin ? <LeaderboardRecalc onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "username-sync":
        return isAdmin ? <UsernameSync onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "admin-notifications":
        return (isAdmin || isModerator) ? <AdminNotifications onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      default:
        return renderOverview();
    }
  };

  const renderAccessDenied = () => (
    <div className="text-center py-8">
      <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h3 className="text-lg font-bold mb-2">Access Restricted</h3>
      <p className="text-muted-foreground">This feature is only available to administrators.</p>
      <Button onClick={() => setActiveView("overview")} className="mt-4">
        Back to Dashboard
      </Button>
    </div>
  );

  const renderOverview = () => (
    <>
      {/* Quick Stats - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Challenges</CardTitle>
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.activeChallenges}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalChallenges > 0 ? `of ${stats.totalChallenges} total` : 'No challenges yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Live Events</CardTitle>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.liveEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEvents > 0 ? `of ${stats.totalEvents} total` : 'No events yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Write-ups</CardTitle>
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.pendingWriteups}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWriteups > 0 ? `of ${stats.totalWriteups} total` : 'No write-ups yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Content Management</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Create and manage platform content</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            <Button 
              className="w-full justify-start gap-2 text-sm sm:text-base"
              onClick={() => {
                setSelectedEvent(null); // Clear any event context
                setActiveView("create-challenge");
              }}
            >
              <Plus className="w-4 h-4" />
              Create New Challenge
            </Button>
            <Button 
              className="w-full justify-start gap-2 text-sm sm:text-base"
              onClick={() => setActiveView("challenge-management")}
            >
              <List className="w-4 h-4" />
              Manage Challenges
            </Button>
            <Button 
              className="w-full justify-start gap-2 text-sm sm:text-base"
              onClick={() => setActiveView("schedule-event")}
            >
              <Plus className="w-4 h-4" />
              Schedule New Event
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-sm sm:text-base"
              onClick={() => setActiveView("event-management")}
            >
              <Edit3 className="w-4 h-4" />
              Manage Events
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-sm sm:text-base"
                onClick={() => setActiveView("review-writeups")}
              >
                <FileText className="w-4 h-4" />
                Review Write-ups
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">User & System Management</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage users, communications, and system settings</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {isAdmin && (
              <Button 
                className="w-full justify-start gap-2 text-sm sm:text-base"
                onClick={() => setActiveView("users")}
              >
                <Users className="w-4 h-4" />
                View All Users
              </Button>
            )}
            
            {(isAdmin || isModerator) && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-sm sm:text-base bg-blue-50 hover:bg-blue-100 border-blue-200"
                onClick={() => setActiveView("admin-notifications")}
              >
                <Bell className="w-4 h-4 text-blue-600" />
                Send Announcements
              </Button>
            )}
            
            {isAdmin && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-sm sm:text-base"
                  onClick={() => setActiveView("username-sync")}
                >
                  <UserCheck className="w-4 h-4" />
                  Sync Usernames
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-sm sm:text-base"
                  onClick={() => setActiveView("leaderboard-recalc")}
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculate Leaderboard
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-sm sm:text-base"
                  onClick={() => setActiveView("analytics")}
                >
                  <BarChart3 className="w-4 h-4" />
                  Platform Analytics
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-sm sm:text-base"
                  onClick={() => setActiveView("settings")}
                >
                  <Settings className="w-4 h-4" />
                  System Settings
                </Button>
              </>
            )}
            
            {!isAdmin && isModerator && (
              <div className="text-center py-2 sm:py-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Additional administrative features are only available to full administrators.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Get view title for current active view
  const getViewTitle = () => {
    const titles: {[key: string]: {title: string, description: string}} = {
      "overview": { 
        title: "Admin Dashboard", 
        description: `Manage your CTF platform${isAdmin ? ', users, challenges, and events' : ' challenges and events'}`
      },
      "users": { 
        title: "User Management", 
        description: "View and manage all registered users"
      },
      "event-management": { 
        title: "Event Management", 
        description: "View and manage all your created events"
      },
      "challenge-management": { 
        title: "Challenge Management", 
        description: "Create new challenges or add existing ones to your events"
      },
      "add-challenges": { 
        title: "Add Challenges to Event", 
        description: "Add challenges to your event"
      },
      "create-challenge": { 
        title: "Create Challenge", 
        description: "Create a new challenge for your CTF platform"
      },
      "edit-challenge": { 
        title: "Edit Challenge", 
        description: "Edit an existing challenge"
      },
      "schedule-event": { 
        title: "Schedule Event", 
        description: "Create a new CTF event"
      },
      "review-writeups": { 
        title: "Review Write-ups", 
        description: "Review and approve user write-ups"
      },
      "analytics": { 
        title: "Platform Analytics", 
        description: "View platform usage statistics and insights"
      },
      "settings": { 
        title: "System Settings", 
        description: "Configure platform settings"
      },
      "leaderboard-recalc": { 
        title: "Leaderboard Recalculation", 
        description: "Fix missing points and update leaderboard rankings"
      },
      "username-sync": { 
        title: "Username Synchronization", 
        description: "Fix username inconsistencies between users and usernames collections"
      },
      "admin-notifications": { 
        title: "Send Announcements", 
        description: "Send announcements to all users via email or in-app notifications"
      }
    };
    
    return titles[activeView] || { title: "Admin Dashboard", description: "Admin management panel" };
  };

  // Handle back navigation
  const handleBack = () => {
    switch (activeView) {
      case "create-challenge":
      case "edit-challenge":
        setActiveView("challenge-management");
        break;
      case "challenge-management":
      case "event-management":
      case "add-challenges":
      case "admin-notifications":
      case "username-sync":
      case "leaderboard-recalc":
      case "analytics":
      case "settings":
      case "review-writeups":
      case "users":
        setActiveView("overview");
        break;
      default:
        setActiveView("overview");
    }
    // Clear context when going back to overview
    if (activeView === "add-challenges" || activeView === "create-challenge") {
      setSelectedEvent(null);
    }
    if (activeView === "edit-challenge") {
      setSelectedChallenge(null);
    }
  };

  const { title, description } = getViewTitle();

  return (
    <>
      <Navbar />
      <section className="pt-20 sm:pt-24 pb-12 sm:pb-16 min-h-screen bg-background">
        <div className="container px-3 sm:px-4 mx-auto">
          {/* MOBILE HEADER */}
          <div className="sm:hidden mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {activeView !== "overview" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <h1 className="text-lg font-bold">{title}</h1>
                  <p className="text-xs text-muted-foreground">
                    {activeView === "overview" ? `${isAdmin ? 'Administrator' : 'Moderator'} Panel` : description}
                  </p>
                </div>
              </div>
              
              {/* Mobile Stats Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-8 px-2"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Mobile Role Badge */}
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {isAdmin ? 'Administrator' : 'Moderator'}
              </div>
              {(isAdmin || isModerator) && activeView === "admin-notifications" && (
                <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  <span className="flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Announcements
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP HEADER */}
          <div className="hidden sm:block mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                  {title}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {description}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {isAdmin ? 'Administrator' : 'Moderator'}
                  </div>
                  {(isAdmin || isModerator) && activeView === "admin-notifications" && (
                    <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <span className="flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Announcements
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop Back/Home Button */}
              {activeView !== "overview" ? (
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="gap-2 hidden sm:flex"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {activeView === "create-challenge" || activeView === "edit-challenge" 
                    ? "Back to Challenges" 
                    : activeView === "challenge-management" || activeView === "event-management" || activeView === "add-challenges"
                    ? "Back to Dashboard"
                    : "Back to Dashboard"
                  }
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="gap-2 hidden sm:flex"
                >
                  <Home className="w-4 h-4" />
                  Go to Home
                </Button>
              )}
            </div>
          </div>

          {/* MOBILE QUICK NAV */}
          {activeView === "overview" && mobileMenuOpen && (
            <Card className="mb-4 sm:hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm mb-2">Quick Navigation</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setActiveView("create-challenge");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    New Challenge
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setActiveView("challenge-management");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <List className="w-3 h-3 mr-2" />
                    Manage Challenges
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setActiveView("schedule-event");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Calendar className="w-3 h-3 mr-2" />
                    New Event
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setActiveView("admin-notifications");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Bell className="w-3 h-3 mr-2" />
                    Send Announcements
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MOBILE BACK BUTTON FOR NON-OVERVIEW VIEWS */}
          {activeView !== "overview" && (
            <div className="sm:hidden mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBack}
                className="w-full gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {activeView === "create-challenge" || activeView === "edit-challenge" 
                  ? "Back to Challenges" 
                  : "Back to Dashboard"
                }
              </Button>
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className={activeView !== "overview" ? "sm:pt-4" : ""}>
            {loading && activeView === "overview" ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-3 text-sm text-muted-foreground">Loading dashboard...</span>
              </div>
            ) : (
              renderActiveView()
            )}
          </div>

          {/* MOBILE FOOTER NAV */}
          {activeView === "overview" && (
            <div className="sm:hidden mt-8 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/")}
                  className="text-xs"
                >
                  <Home className="w-3 h-3 mr-1" />
                  Home
                </Button>
                <div className="text-xs text-muted-foreground">
                  {stats.totalUsers} users • {stats.activeChallenges} challenges
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={fetchStats}
                  className="text-xs"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default AdminDashboard;