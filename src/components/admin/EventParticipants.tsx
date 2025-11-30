import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  Crown,
  Mail,
  RefreshCw,
  Download
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  title?: string;
  participants: string[];
  registeredUsers?: string[];
  pendingApprovals?: string[];
  maxParticipants?: number;
  participationType?: "individual" | "team";
  createdBy?: "admin" | "user";
  createdById?: string;
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface EventParticipantsProps {
  event: Event;
  onBack: () => void;
  onParticipantsUpdated: () => void;
}

const EventParticipants = ({ event, onBack, onParticipantsUpdated }: EventParticipantsProps) => {
  const { user } = useAuthContext();
  const [participants, setParticipants] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [event]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));

      // Filter participants
      const participantUsers = allUsers.filter(user => 
        event.participants?.includes(user.uid)
      );

      // Filter pending approvals
      const pendingUsers = allUsers.filter(user => 
        event.pendingApprovals?.includes(user.uid)
      );

      setParticipants(participantUsers);
      setPendingApprovals(pendingUsers);

    } catch (error: any) {
      console.error("Error fetching participants:", error);
      setMessage({ type: 'error', text: `Failed to load participants: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const approveParticipant = async (userId: string) => {
    setActionLoading(`approve-${userId}`);
    setMessage(null);

    try {
      const eventRef = doc(db, "events", event.id);
      
      // Remove from pending approvals and add to participants
      await updateDoc(eventRef, {
        pendingApprovals: arrayRemove(userId),
        participants: arrayUnion(userId),
        totalParticipants: event.participants ? event.participants.length + 1 : 1
      });

      setMessage({ type: 'success', text: 'Participant approved successfully!' });
      onParticipantsUpdated();
      fetchParticipants();
      
    } catch (error: any) {
      console.error("Error approving participant:", error);
      setMessage({ type: 'error', text: `Failed to approve participant: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectParticipant = async (userId: string) => {
    setActionLoading(`reject-${userId}`);
    setMessage(null);

    try {
      const eventRef = doc(db, "events", event.id);
      
      // Remove from pending approvals
      await updateDoc(eventRef, {
        pendingApprovals: arrayRemove(userId)
      });

      setMessage({ type: 'success', text: 'Participant request rejected!' });
      onParticipantsUpdated();
      fetchParticipants();
      
    } catch (error: any) {
      console.error("Error rejecting participant:", error);
      setMessage({ type: 'error', text: `Failed to reject participant: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const removeParticipant = async (userId: string) => {
    setActionLoading(`remove-${userId}`);
    setMessage(null);

    try {
      const eventRef = doc(db, "events", event.id);
      
      // Remove from participants
      await updateDoc(eventRef, {
        participants: arrayRemove(userId),
        totalParticipants: event.participants ? Math.max(0, event.participants.length - 1) : 0
      });

      setMessage({ type: 'success', text: 'Participant removed successfully!' });
      onParticipantsUpdated();
      fetchParticipants();
      
    } catch (error: any) {
      console.error("Error removing participant:", error);
      setMessage({ type: 'error', text: `Failed to remove participant: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const getParticipantCount = (): number => {
    return participants.length;
  };

  const getPendingCount = (): number => {
    return pendingApprovals.length;
  };

  const isEventFull = (): boolean => {
    return event.maxParticipants ? getParticipantCount() >= event.maxParticipants : false;
  };

  const filteredParticipants = participants.filter(participant =>
    participant.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPending = pendingApprovals.filter(pending =>
    pending.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pending.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading participants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Manage Participants</h2>
          <p className="text-muted-foreground">
            {event.title || event.name} - {event.participationType === 'team' ? 'Team Management' : 'Participant Management'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50 border-blue-200">
              <Users className="w-3 h-3 mr-1" />
              {getParticipantCount()} approved
            </Badge>
            {getPendingCount() > 0 && (
              <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                <UserCheck className="w-3 h-3 mr-1" />
                {getPendingCount()} pending
              </Badge>
            )}
            {isEventFull() && (
              <Badge variant="outline" className="bg-red-50 border-red-200">
                Event Full
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

      {/* Search */}
      <Card className="bg-transparent border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search participants by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Section */}
      {filteredPending.length > 0 && (
        <Card className="bg-transparent border-yellow-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5 text-yellow-600" />
              Pending Approvals ({getPendingCount()})
            </CardTitle>
            <CardDescription>
              Users waiting for approval to join this event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredPending.map((pendingUser) => (
              <div key={pendingUser.uid} className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{pendingUser.displayName || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {pendingUser.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveParticipant(pendingUser.uid)}
                    disabled={isEventFull() || actionLoading !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading === `approve-${pendingUser.uid}` ? (
                      <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectParticipant(pendingUser.uid)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === `reject-${pendingUser.uid}` ? (
                      <div className="animate-spin w-4 h-4 border border-primary border-t-transparent rounded-full"></div>
                    ) : (
                      <XCircle className="w-4 h-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approved Participants Section */}
      <Card className="bg-transparent border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-green-600" />
            Approved Participants ({getParticipantCount()})
            {event.maxParticipants && (
              <span className="text-sm text-muted-foreground font-normal">
                ({getParticipantCount()}/{event.maxParticipants})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Users who are currently registered for this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No participants found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParticipants.map((participant) => (
                <div key={participant.uid} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{participant.displayName || 'Unknown User'}</p>
                        {participant.role === 'admin' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {participant.role === 'moderator' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                            <Crown className="w-3 h-3 mr-1" />
                            Moderator
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {participant.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeParticipant(participant.uid)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === `remove-${participant.uid}` ? (
                      <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <UserX className="w-4 h-4 mr-1" />
                    )}
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Management Section (if team event) */}
      {event.participationType === 'team' && (
        <Card className="bg-transparent border-blue-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-600" />
              Team Management
            </CardTitle>
            <CardDescription>
              Organize participants into teams for this team-based event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">Team management features coming soon</p>
              <Button variant="outline" disabled>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Teams
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-transparent border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchParticipants}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh List
            </Button>
            <Button variant="outline" disabled>
              <Download className="w-4 h-4 mr-2" />
              Export Participants
            </Button>
            <Button variant="outline" disabled>
              <Mail className="w-4 h-4 mr-2" />
              Email Participants
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventParticipants;