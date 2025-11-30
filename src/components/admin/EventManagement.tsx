// src/components/admin/EventManagement.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAdminContext } from "../../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Clock,
  Zap,
  Crown,
  Shield,
  Lock,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  Settings
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the components
import EditEvent from "./EditEvent";
import AddChallenges from "./AddChallenges";
import ModeratorAssignment from "./ModeratorAssignment";

interface Event {
  id: string;
  name: string;
  title?: string;
  description?: string;
  startDate: string;
  endDate: string;
  participants: string[];
  totalParticipants?: number;
  maxParticipants?: number;
  challengeCount?: number;
  registeredUsers?: string[];
  createdBy?: "admin" | "user";
  createdById?: string;
  location?: string;
  rules?: string;
  prizes?: string;
  status?: string;
  hostingFee?: number;
  hostingPaymentStatus?: string;
  participationType?: "individual" | "team";
  requiresParticipantPayment?: boolean;
  individualPrice?: number;
  currency?: string;
  assignedModerators?: string[]; // Array of moderator UIDs
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface EventManagementProps {
  onBack: () => void;
  onAddChallenges?: (event: Event) => void;
}

const EventManagement = ({ onBack, onAddChallenges }: EventManagementProps) => {
  const { user } = useAuthContext();
  const { isAdmin, isModerator } = useAdminContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [allModerators, setAllModerators] = useState<User[]>([]);
  const [loadingModerators, setLoadingModerators] = useState(false);
  
  // State for component navigation
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [addingChallengesToEvent, setAddingChallengesToEvent] = useState<Event | null>(null);
  const [managingModeratorsForEvent, setManagingModeratorsForEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
    if (isAdmin) {
      fetchAllModerators();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("startDate", "desc")
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const allEventsData: Event[] = [];

      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        const event = {
          id: doc.id,
          ...data
        } as Event;

        allEventsData.push(event);
      });

      // Filter events based on user role and permissions
      let filteredEvents = allEventsData;
      if (isModerator && user && !isAdmin) {
        // Moderators can only see events they created OR events they're assigned to by admin
        filteredEvents = allEventsData.filter(event => 
          canManageEvent(event)
        );
      }

      setEvents(filteredEvents);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      setMessage({ type: 'error', text: `Failed to load events: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllModerators = async () => {
    try {
      setLoadingModerators(true);
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const moderators = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(user => user.role === 'moderator');
      setAllModerators(moderators);
    } catch (error: any) {
      console.error("Error fetching moderators:", error);
    } finally {
      setLoadingModerators(false);
    }
  };

  // Check if user can manage a specific event
  const canManageEvent = (event: Event): boolean => {
    if (isAdmin) return true;
    if (isModerator && user) {
      // Moderators can only manage events they created OR events they're assigned to by admin
      return (
        event.createdById === user.uid || 
        (event.assignedModerators && event.assignedModerators.includes(user.uid))
      );
    }
    return false;
  };

  // Check if user can assign moderators to a specific event
  const canAssignModerators = (event: Event): boolean => {
    if (isAdmin) return true;
    if (isModerator && user) {
      // Moderators can assign other moderators only to events they created
      return event.createdById === user.uid;
    }
    return false;
  };

  // Check if user can delete a specific event
  const canDeleteEvent = (event: Event): boolean => {
    if (isAdmin) return true;
    if (isModerator && user) {
      // Moderators can only delete events they created (not admin-assigned events)
      return event.createdById === user.uid;
    }
    return false;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid time";
      }
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return "Invalid time";
    }
  };

  const getEventStatus = (startDate: string, endDate: string): "UPCOMING" | "LIVE" | "ENDED" => {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "UPCOMING";
      }

      if (now < start) return "UPCOMING";
      if (now > end) return "ENDED";
      return "LIVE";
    } catch {
      return "UPCOMING";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE": return "bg-green-500/20 text-green-600 border-green-200";
      case "UPCOMING": return "bg-blue-500/20 text-blue-600 border-blue-200";
      case "ENDED": return "bg-gray-500/20 text-gray-600 border-gray-200";
      default: return "bg-gray-500/20 text-gray-600 border-gray-200";
    }
  };

  const deleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (!canDeleteEvent(event)) {
      setMessage({ type: 'error', text: 'You do not have permission to delete this event' });
      return;
    }

    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "events", eventId));
      setMessage({ type: 'success', text: 'Event deleted successfully' });
      fetchEvents(); // Refresh the list
    } catch (error: any) {
      console.error("Error deleting event:", error);
      setMessage({ type: 'error', text: `Failed to delete event: ${error.message}` });
    }
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (!canManageEvent(event)) {
      setMessage({ type: 'error', text: 'You do not have permission to update this event' });
      return;
    }

    try {
      await updateDoc(doc(db, "events", eventId), {
        status: status.toLowerCase()
      });
      setMessage({ type: 'success', text: `Event status updated to ${status}` });
      fetchEvents(); // Refresh the list
    } catch (error: any) {
      console.error("Error updating event status:", error);
      setMessage({ type: 'error', text: `Failed to update event status: ${error.message}` });
    }
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    if (!canManageEvent(event)) {
      setMessage({ type: 'error', text: 'You do not have permission to edit this event' });
      return;
    }
    setEditingEvent(event);
  };

  // Handle add challenges
  const handleAddChallenges = (event: Event) => {
    if (!canManageEvent(event)) {
      setMessage({ type: 'error', text: 'You do not have permission to manage challenges for this event' });
      return;
    }

    if (onAddChallenges) {
      onAddChallenges(event);
    } else {
      setAddingChallengesToEvent(event);
    }
  };

  // Handle manage moderators
  const handleManageModerators = (event: Event) => {
    if (!canAssignModerators(event)) {
      setMessage({ type: 'error', text: 'You do not have permission to assign moderators to this event' });
      return;
    }
    setManagingModeratorsForEvent(event);
  };

  // Handle save event
  const handleSaveEvent = (eventId: string, updatedEvent: Partial<Event>) => {
    setEditingEvent(null);
    fetchEvents();
  };

  // Handle challenges added
  const handleChallengesAdded = (challengeIds: string[]) => {
    setAddingChallengesToEvent(null);
    fetchEvents();
  };

  // Handle moderators updated
  const handleModeratorsUpdated = (updatedModerators: string[]) => {
    setManagingModeratorsForEvent(null);
    fetchEvents();
    setMessage({ type: 'success', text: 'Moderators updated successfully' });
  };

  // Handle navigation to create new challenge
  const handleCreateNewChallenge = () => {
    onBack();
  };

  // Handle navigation to manage challenges
  const handleManageChallenges = () => {
    onBack();
  };

  // Filter events based on search and status
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const eventStatus = getEventStatus(event.startDate, event.endDate);
    const matchesStatus = statusFilter === "all" || eventStatus === statusFilter.toUpperCase();
    
    return matchesSearch && matchesStatus;
  });

  // Calculate participant count
  const getParticipantCount = (event: Event): number => {
    if (event.participants && Array.isArray(event.participants)) {
      return event.participants.length;
    }
    if (event.registeredUsers && Array.isArray(event.registeredUsers)) {
      return event.registeredUsers.length;
    }
    return event.totalParticipants || 0;
  };

  // Get event ownership/assignment badge
  const getEventAccessBadge = (event: Event) => {
    if (isAdmin) {
      if (event.createdById === user?.uid) {
        return <Badge variant="outline" className="bg-blue-50 border-blue-200">Your Event</Badge>;
      } else {
        return <Badge variant="outline" className="bg-purple-50 border-purple-200"><Crown className="w-3 h-3 mr-1" />Admin Event</Badge>;
      }
    }
    
    if (isModerator && user) {
      if (event.createdById === user.uid) {
        return <Badge variant="outline" className="bg-blue-50 border-blue-200">Your Event</Badge>;
      } else if (event.assignedModerators?.includes(user.uid)) {
        return <Badge variant="outline" className="bg-green-50 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Assigned to You</Badge>;
      }
    }
    
    return null;
  };

  // Get assigned moderators count badge
  const getModeratorsBadge = (event: Event) => {
    if (event.assignedModerators && event.assignedModerators.length > 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          <UserPlus className="w-3 h-3 mr-1" />
          {event.assignedModerators.length} moderator(s)
        </Badge>
      );
    }
    return null;
  };

  // Render EditEvent component if editing
  if (editingEvent) {
    return (
      <EditEvent 
        event={editingEvent}
        onBack={() => setEditingEvent(null)}
        onSave={handleSaveEvent}
      />
    );
  }

  // Render AddChallenges component if adding challenges
  if (addingChallengesToEvent) {
    return (
      <AddChallenges 
        event={addingChallengesToEvent}
        onBack={() => setAddingChallengesToEvent(null)}
        onChallengesAdded={handleChallengesAdded}
        onCreateNewChallenge={handleCreateNewChallenge}
        onManageChallenges={handleManageChallenges}
      />
    );
  }

  // Render ModeratorAssignment component if managing moderators
  if (managingModeratorsForEvent) {
    return (
      <ModeratorAssignment
        event={managingModeratorsForEvent}
        allModerators={allModerators}
        onBack={() => setManagingModeratorsForEvent(null)}
        onModeratorsUpdated={handleModeratorsUpdated}
      />
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage all events and their challenges" 
              : "Manage your events and assigned admin events"
            }
          </p>
          {!isAdmin && (
            <Badge variant="outline" className="mt-1 bg-blue-50 border-blue-200">
              <Lock className="w-3 h-3 mr-1" />
              {isModerator ? "Can manage your events and assigned admin events" : "Restricted access"}
            </Badge>
          )}
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-transparent border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="bg-transparent border-border/50">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">
              {events.length === 0 ? "No Events Found" : "No Matching Events"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "No events match your search criteria." 
                : isAdmin 
                  ? "There are no events in the system yet." 
                  : "You don't have any events or assigned events to manage."
              }
            </p>
            <Button onClick={onBack}>
              {isAdmin ? "Create Your First Event" : "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => {
            const eventStatus = getEventStatus(event.startDate, event.endDate);
            const participantCount = getParticipantCount(event);
            const canManage = canManageEvent(event);
            const canDelete = canDeleteEvent(event);
            const canAssign = canAssignModerators(event);
            const isOwnEvent = event.createdById === user?.uid;
            
            return (
              <Card key={event.id} className={`bg-transparent border-border/50 hover:border-primary/50 transition-colors ${
                !canManage ? 'opacity-70' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{event.title || event.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(eventStatus)}>
                              {eventStatus}
                            </Badge>
                            {getEventAccessBadge(event)}
                            {getModeratorsBadge(event)}
                            {event.createdBy === 'user' && (
                              <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200">
                                <Crown className="w-3 h-3 mr-1" />
                                Community Hosted
                              </Badge>
                            )}
                            {event.requiresParticipantPayment && (
                              <Badge variant="secondary" className="text-xs">
                                Paid Event
                              </Badge>
                            )}
                            {event.participationType && (
                              <Badge variant="outline" className="text-xs capitalize bg-background">
                                {event.participationType}
                              </Badge>
                            )}
                            {!canManage && (
                              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Read Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Ends: {formatDate(event.endDate)} at {formatTime(event.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{participantCount} participants</span>
                          {event.maxParticipants && (
                            <span> / {event.maxParticipants} max</span>
                          )}
                        </div>
                        {event.challengeCount !== undefined && event.challengeCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4" />
                            <span>{event.challengeCount} challenges</span>
                          </div>
                        )}
                      </div>

                      {/* Additional Event Details */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <span>📍 {event.location}</span>
                          </div>
                        )}
                        {event.requiresParticipantPayment && event.individualPrice && (
                          <div className="flex items-center gap-1">
                            <span>💰 {event.individualPrice} {event.currency || 'ZMW'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                      {canManage && (
                        <>
                          <TooltipProvider>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => handleEditEvent(event)}
                                    className="gap-2 flex-1"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit event details</p>
                                </TooltipContent>
                              </Tooltip>

                              {eventStatus === "UPCOMING" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAddChallenges(event)}
                                      className="gap-2 flex-1"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Challenges
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Manage event challenges</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canAssign && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleManageModerators(event)}
                                      className="gap-2 flex-1"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                      Moderators
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Assign moderators to this event</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </>
                      )}
                      
                      {canDelete && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteEvent(event.id)}
                                className="gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this event</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {!canManage && (
                        <div className="text-center py-2">
                          <Badge variant="outline" className="bg-gray-100 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            No Management Access
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Status Update for Users with Management Access */}
                  {canManage && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Event Status Control:</span>
                        <div className="flex gap-2 flex-wrap">
                          {["upcoming", "live", "ended"].map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={event.status === status ? "default" : "outline"}
                              onClick={() => updateEventStatus(event.id, status)}
                              className="capitalize text-xs"
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {filteredEvents.length > 0 && (
        <Card className="bg-transparent border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-600">
                    UPCOMING
                  </Badge>
                  <span>{filteredEvents.filter(e => getEventStatus(e.startDate, e.endDate) === "UPCOMING").length} events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-600">
                    LIVE
                  </Badge>
                  <span>{filteredEvents.filter(e => getEventStatus(e.startDate, e.endDate) === "LIVE").length} events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-500/20 text-gray-600">
                    ENDED
                  </Badge>
                  <span>{filteredEvents.filter(e => getEventStatus(e.startDate, e.endDate) === "ENDED").length} events</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                Total: {filteredEvents.length} events
                {!isAdmin && " (events you can manage)"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventManagement;