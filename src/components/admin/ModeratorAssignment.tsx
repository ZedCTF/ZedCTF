// src/components/admin/ModeratorAssignment.tsx
import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  UserPlus, 
  UserMinus, 
  Users, 
  Search,
  CheckCircle,
  XCircle,
  Crown,
  Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Event {
  id: string;
  name: string;
  title?: string;
  createdById?: string;
  assignedModerators?: string[];
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface ModeratorAssignmentProps {
  event: Event;
  allModerators: User[];
  onBack: () => void;
  onModeratorsUpdated: (updatedModerators: string[]) => void;
}

const ModeratorAssignment = ({ event, allModerators, onBack, onModeratorsUpdated }: ModeratorAssignmentProps) => {
  const { user } = useAuthContext();
  const [assignedModerators, setAssignedModerators] = useState<string[]>(event.assignedModerators || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filter moderators based on search
  const filteredModerators = allModerators.filter(moderator =>
    moderator.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    moderator.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle moderator assignment
  const toggleModeratorAssignment = async (moderatorId: string, assigned: boolean) => {
    try {
      setLoading(true);
      
      let updatedModerators;
      if (assigned) {
        // Remove moderator
        updatedModerators = assignedModerators.filter(id => id !== moderatorId);
      } else {
        // Add moderator
        updatedModerators = [...assignedModerators, moderatorId];
      }

      // Update Firestore
      await updateDoc(doc(db, "events", event.id), {
        assignedModerators: updatedModerators
      });

      // Update local state
      setAssignedModerators(updatedModerators);
      
      // Notify parent
      onModeratorsUpdated(updatedModerators);
      
      setMessage({ 
        type: 'success', 
        text: `Moderator ${assigned ? 'removed from' : 'added to'} event successfully` 
      });
    } catch (error: any) {
      console.error("Error updating moderator assignment:", error);
      setMessage({ type: 'error', text: `Failed to update moderator assignment: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Get moderator display info
  const getModeratorDisplayName = (moderator: User) => {
    return moderator.displayName || moderator.email || 'Unknown Moderator';
  };

  // Check if current user is the event creator
  const isEventCreator = event.createdById === user?.uid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Manage Event Moderators</h2>
          <p className="text-muted-foreground">
            Assign moderators to help manage "{event.title || event.name}"
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50">
              <Shield className="w-3 h-3 mr-1" />
              {assignedModerators.length} moderator(s) assigned
            </Badge>
            {isEventCreator && (
              <Badge variant="outline" className="bg-green-50">
                <Crown className="w-3 h-3 mr-1" />
                Event Creator
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Assignment Summary */}
      <Card className="bg-transparent border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Moderator Assignments
          </CardTitle>
          <CardDescription>
            Moderators assigned to this event can manage challenges and event content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedModerators.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No moderators assigned to this event yet.</p>
              <p className="text-sm">Assign moderators below to share management responsibilities.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allModerators
                  .filter(moderator => assignedModerators.includes(moderator.uid))
                  .map(moderator => (
                    <div key={moderator.uid} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {getModeratorDisplayName(moderator)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {moderator.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Assigned
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Moderators */}
      <Card className="bg-transparent border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Available Moderators
          </CardTitle>
          <CardDescription>
            Select moderators to assign them to this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search moderators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Moderators List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredModerators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No moderators found matching your search.</p>
              </div>
            ) : (
              filteredModerators.map(moderator => {
                const isAssigned = assignedModerators.includes(moderator.uid);
                const isCurrentUser = moderator.uid === user?.uid;
                
                return (
                  <div key={moderator.uid} className="flex items-center justify-between p-4 border rounded-lg bg-background hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {getModeratorDisplayName(moderator)}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {moderator.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isAssigned ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Assigned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <XCircle className="w-3 h-3 mr-1" />
                          Not Assigned
                        </Badge>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`moderator-${moderator.uid}`}
                          checked={isAssigned}
                          onCheckedChange={(checked) => toggleModeratorAssignment(moderator.uid, !checked)}
                          disabled={loading}
                        />
                        <Label htmlFor={`moderator-${moderator.uid}`} className="text-sm">
                          {isAssigned ? "Remove" : "Assign"}
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-transparent border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">About Moderator Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Management Permissions</p>
              <p>Assigned moderators can manage challenges, update event details, and moderate content within this event.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <UserPlus className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Assignment Rules</p>
              <p>
                {isEventCreator 
                  ? "As the event creator, you can assign any moderator to help manage this event."
                  : "You can assign moderators to events you created or events assigned to you."
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Event Creator Rights</p>
              <p>The event creator always maintains full management rights and can remove assigned moderators at any time.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        
        <div className="flex gap-3">
          {assignedModerators.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                // Remove all moderators
                assignedModerators.forEach(moderatorId => {
                  toggleModeratorAssignment(moderatorId, true);
                });
              }}
              disabled={loading}
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Remove All Moderators
            </Button>
          )}
          
          <Button onClick={onBack}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModeratorAssignment;