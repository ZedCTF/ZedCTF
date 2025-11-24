// src/components/AdminDashboard.tsx
import { useState } from "react";
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
  List
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

// Import the new components we'll create
import UserManagement from "./admin/UserManagement";
import ChallengeCreation from "./admin/ChallengeCreation";
import ChallengeManagement from "./admin/ChallengeManagement";
import ChallengeEdit from "./admin/ChallengeEdit";
import EventScheduling from "./admin/EventScheduling";
import WriteupReview from "./admin/WriteupReview";
import PlatformAnalytics from "./admin/PlatformAnalytics";
import SystemSettings from "./admin/SystemSettings";

const AdminDashboard = () => {
  const { isAdmin, isModerator } = useAdminContext();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);

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
        return <UserManagement onBack={() => setActiveView("overview")} />;
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
      case "create-challenge":
        return <ChallengeCreation onBack={() => setActiveView("challenge-management")} />;
      case "edit-challenge":
        return (
          <ChallengeEdit 
            challengeId={selectedChallenge.id}
            onBack={() => setActiveView("challenge-management")}
            onSave={() => setActiveView("challenge-management")}
          />
        );
      case "schedule-event":
        return <EventScheduling onBack={() => setActiveView("overview")} />;
      case "review-writeups":
        return <WriteupReview onBack={() => setActiveView("overview")} />;
      case "analytics":
        return <PlatformAnalytics onBack={() => setActiveView("overview")} />;
      case "settings":
        return <SystemSettings onBack={() => setActiveView("overview")} />;
      default:
        return renderOverview();
    }
  };

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
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No challenges yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live Events</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No events yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Write-ups</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No write-ups yet</p>
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
              onClick={() => setActiveView("create-challenge")}
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
              onClick={() => setActiveView("review-writeups")}
            >
              <FileText className="w-4 h-4" />
              Review Write-ups
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => setActiveView("users")}
            >
              <Users className="w-4 h-4" />
              View All Users
            </Button>
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
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setActiveView("settings")}
            >
              <Settings className="w-4 h-4" />
              System Settings
            </Button>
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
                   activeView === "challenge-management" ? "Challenge Management" :
                   activeView === "create-challenge" ? "Create Challenge" :
                   activeView === "edit-challenge" ? "Edit Challenge" :
                   activeView === "schedule-event" ? "Schedule Event" :
                   activeView === "review-writeups" ? "Review Write-ups" :
                   activeView === "analytics" ? "Platform Analytics" :
                   activeView === "settings" ? "System Settings" : "Admin Dashboard"}
                </h1>
                <p className="text-muted-foreground">
                  {activeView === "overview" 
                    ? "Manage your CTF platform, users, challenges, and events"
                    : "Admin management panel"
                  }
                </p>
              </div>
              
              {activeView !== "overview" && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (activeView === "create-challenge" || activeView === "edit-challenge") {
                      setActiveView("challenge-management");
                    } else {
                      setActiveView("overview");
                    }
                  }}
                >
                  {activeView === "create-challenge" || activeView === "edit-challenge" 
                    ? "Back to Challenges" 
                    : "Back to Dashboard"
                  }
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
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