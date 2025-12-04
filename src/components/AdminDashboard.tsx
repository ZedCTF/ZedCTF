// src/components/AdminDashboard.tsx
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
  RefreshCw
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
import LeaderboardRecalc from "./admin/LeaderboardRecalc"; // NEW IMPORT

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
  const { isAdmin, isModerator } = useAdminContext();
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
            userRole={isAdmin ? "admin" : "user"}
            onEventCreated={handleEventCreated}
          />
        );
      case "review-writeups":
        return isAdmin ? <WriteupReview onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "analytics":
        return isAdmin ? <PlatformAnalytics onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "settings":
        return isAdmin ? <SystemSettings onBack={() => setActiveView("overview")} /> : renderAccessDenied();
      case "leaderboard-recalc": // NEW CASE
        return isAdmin ? <LeaderboardRecalc onBack={() => setActiveView("overview")} /> : renderAccessDenied();
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
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChallenges}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalChallenges > 0 ? `of ${stats.totalChallenges} total` : 'No challenges yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live Events</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEvents > 0 ? `of ${stats.totalEvents} total` : 'No events yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Write-ups</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingWriteups}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWriteups > 0 ? `of ${stats.totalWriteups} total` : 'No write-ups yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>Create and manage platform content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => {
                setSelectedEvent(null); // Clear any event context
                setActiveView("create-challenge");
              }}
            >
              <Plus className="w-4 h-4" />
              Create New Challenge
            </Button>
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => setActiveView("challenge-management")}
            >
              <List className="w-4 h-4" />
              Manage Challenges
            </Button>
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => setActiveView("schedule-event")}
            >
              <Plus className="w-4 h-4" />
              Schedule New Event
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setActiveView("event-management")}
            >
              <Edit3 className="w-4 h-4" />
              Manage Events
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setActiveView("review-writeups")}
              >
                <FileText className="w-4 h-4" />
                Review Write-ups
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <Button 
                className="w-full justify-start gap-2"
                onClick={() => setActiveView("users")}
              >
                <Users className="w-4 h-4" />
                View All Users
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setActiveView("leaderboard-recalc")}
              >
                <RefreshCw className="w-4 h-4" />
                Recalculate Leaderboard
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setActiveView("analytics")}
              >
                <BarChart3 className="w-4 h-4" />
                Platform Analytics
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setActiveView("settings")}
              >
                <Settings className="w-4 h-4" />
                System Settings
              </Button>
            )}
            {!isAdmin && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  User management features are only available to administrators.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {activeView === "overview" ? "Admin Dashboard" : 
                   activeView === "users" ? "User Management" :
                   activeView === "event-management" ? "Event Management" :
                   activeView === "challenge-management" ? "Challenge Management" :
                   activeView === "add-challenges" ? "Add Challenges to Event" :
                   activeView === "create-challenge" ? "Create Challenge" :
                   activeView === "edit-challenge" ? "Edit Challenge" :
                   activeView === "schedule-event" ? "Schedule Event" :
                   activeView === "review-writeups" ? "Review Write-ups" :
                   activeView === "analytics" ? "Platform Analytics" :
                   activeView === "settings" ? "System Settings" :
                   activeView === "leaderboard-recalc" ? "Leaderboard Recalculation" : // NEW TITLE
                   "Admin Dashboard"}
                </h1>
                <p className="text-muted-foreground">
                  {activeView === "overview" 
                    ? `Manage your CTF platform${isAdmin ? ', users, challenges, and events' : ' challenges and events'}`
                    : activeView === "event-management"
                    ? "View and manage all your created events"
                    : activeView === "challenge-management"
                    ? "Create new challenges or add existing ones to your events"
                    : activeView === "add-challenges"
                    ? "Add challenges to your event"
                    : activeView === "leaderboard-recalc"
                    ? "Fix missing points and update leaderboard rankings" // NEW DESCRIPTION
                    : isAdmin ? "Admin management panel" : "Moderator management panel"
                  }
                </p>
              </div>
              
              {activeView !== "overview" && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (activeView === "create-challenge" || activeView === "edit-challenge") {
                      setActiveView("challenge-management");
                    } else if (activeView === "challenge-management" || activeView === "event-management" || activeView === "add-challenges") {
                      setActiveView("overview");
                    } else {
                      setActiveView("overview");
                    }
                    // Clear context when going back to overview
                    if (activeView === "add-challenges" || activeView === "create-challenge") {
                      setSelectedEvent(null);
                    }
                  }}
                >
                  {activeView === "create-challenge" || activeView === "edit-challenge" 
                    ? "Back to Challenges" 
                    : activeView === "challenge-management" || activeView === "event-management" || activeView === "add-challenges"
                    ? "Back to Dashboard"
                    : "Back to Dashboard"
                  }
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {isAdmin ? 'Administrator' : 'Moderator'}
              </div>
            </div>
          </div>

          {renderActiveView()}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default AdminDashboard;