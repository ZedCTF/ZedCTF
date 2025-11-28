// src/components/admin/ChallengeManagement.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Edit, Trash2, Eye, Plus, Filter, Calendar, Zap, Shield, Users, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChallengeManagementProps {
  onBack: () => void;
  onCreateNew: () => void;
  onEditChallenge: (challenge: any) => void;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  solvedBy: string[];
  finalCategory?: string;
  hasMultipleQuestions?: boolean;
  questions?: any[];
  flag?: string;
  flagFormat?: string;
  hints?: string[];
  files?: any[];
  originalCreator?: {
    name: string;
    url: string;
  };
  attribution?: any;
  // Enhanced fields for event and practice management
  challengeType?: 'practice' | 'live' | 'past_event' | 'upcoming';
  eventId?: string;
  eventName?: string;
  eventDate?: any;
  isArchived?: boolean;
  isFeatured?: boolean;
  featuredOnPractice?: boolean;
  availableInPractice?: boolean;
}

interface Event {
  id: string;
  title: string;
  name: string;
  status: 'LIVE' | 'UPCOMING' | 'ENDED';
  startTime: any;
  endTime: any;
  startDate?: string;
  endDate?: string;
  participants: number;
  participantCount?: number;
  registeredUsers?: string[];
}

const ChallengeManagement = ({ onBack, onCreateNew, onEditChallenge }: ChallengeManagementProps) => {
  const { user } = useAuthContext();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChallengeType, setFilterChallengeType] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEventForAssignment, setSelectedEventForAssignment] = useState<string>("");
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChallenges();
    fetchEvents();
  }, []);

  useEffect(() => {
    filterChallenges();
  }, [searchTerm, filterCategory, filterDifficulty, filterStatus, filterChallengeType, challenges]);

  const fetchChallenges = async () => {
    try {
      const challengesQuery = query(
        collection(db, "challenges"),
        orderBy("createdAt", "desc")
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      const challengesData = challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];
      setChallenges(challengesData);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      // Fetch all events (including ended ones for context)
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("startDate", "desc")
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Calculate participant count
          participantCount: data.participants?.length || data.registeredUsers?.length || 0
        };
      }) as Event[];
      
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const filterChallenges = () => {
    let filtered = challenges;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (challenge.finalCategory || challenge.category).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(challenge => 
        (challenge.finalCategory || challenge.category) === filterCategory
      );
    }

    // Difficulty filter
    if (filterDifficulty !== "all") {
      filtered = filtered.filter(challenge => challenge.difficulty === filterDifficulty);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(challenge => 
        filterStatus === "active" ? challenge.isActive : !challenge.isActive
      );
    }

    // Challenge type filter
    if (filterChallengeType !== "all") {
      filtered = filtered.filter(challenge => {
        switch (filterChallengeType) {
          case "practice":
            return challenge.challengeType === 'practice' || 
                   challenge.featuredOnPractice || 
                   challenge.availableInPractice;
          case "live":
            return challenge.challengeType === 'live';
          case "upcoming":
            return challenge.challengeType === 'upcoming';
          case "past":
            return challenge.challengeType === 'past_event';
          case "featured":
            return challenge.featuredOnPractice;
          case "unassigned":
            return !challenge.eventId && challenge.availableInPractice;
          case "assigned":
            return !!challenge.eventId;
          default:
            return true;
        }
      });
    }

    setFilteredChallenges(filtered);
  };

  const toggleChallengeSelection = (challengeId: string) => {
    if (!bulkAssignmentMode) return; // Only allow selection in bulk mode
    
    setSelectedChallenges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(challengeId)) {
        newSet.delete(challengeId);
      } else {
        newSet.add(challengeId);
      }
      return newSet;
    });
  };

  const toggleDescription = (challengeId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(challengeId)) {
        newSet.delete(challengeId);
      } else {
        newSet.add(challengeId);
      }
      return newSet;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredChallenges.map(ch => ch.id));
    setSelectedChallenges(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedChallenges(new Set());
  };

  const bulkAssignToEvent = async () => {
    if (!selectedEventForAssignment) {
      setMessage({ type: 'error', text: 'Please select an event first' });
      return;
    }

    if (selectedChallenges.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one challenge' });
      return;
    }

    const event = events.find(e => e.id === selectedEventForAssignment);
    if (!event) {
      setMessage({ type: 'error', text: 'Selected event not found' });
      return;
    }

    try {
      const updatePromises = Array.from(selectedChallenges).map(challengeId =>
        updateDoc(doc(db, "challenges", challengeId), {
          eventId: selectedEventForAssignment,
          eventName: event.title || event.name,
          challengeType: event.status === 'LIVE' ? 'live' : 'upcoming',
          availableInPractice: false,
          featuredOnPractice: false
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      setChallenges(challenges.map(challenge =>
        selectedChallenges.has(challenge.id) ? {
          ...challenge,
          eventId: selectedEventForAssignment,
          eventName: event.title || event.name,
          challengeType: event.status === 'LIVE' ? 'live' : 'upcoming',
          availableInPractice: false,
          featuredOnPractice: false
        } : challenge
      ));

      setMessage({ 
        type: 'success', 
        text: `Successfully assigned ${selectedChallenges.size} challenge(s) to "${event.title || event.name}"` 
      });
      
      // Reset selection and mode
      setSelectedChallenges(new Set());
      setBulkAssignmentMode(false);
      setSelectedEventForAssignment("");

    } catch (error) {
      console.error("Error in bulk assignment:", error);
      setMessage({ type: 'error', text: 'Failed to assign challenges to event' });
    }
  };

  const bulkRemoveFromEvents = async () => {
    if (selectedChallenges.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one challenge' });
      return;
    }

    try {
      const updatePromises = Array.from(selectedChallenges).map(challengeId =>
        updateDoc(doc(db, "challenges", challengeId), {
          eventId: null,
          eventName: null,
          challengeType: 'practice',
          availableInPractice: true,
          featuredOnPractice: false
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      setChallenges(challenges.map(challenge =>
        selectedChallenges.has(challenge.id) ? {
          ...challenge,
          eventId: undefined,
          eventName: undefined,
          challengeType: 'practice',
          availableInPractice: true,
          featuredOnPractice: false
        } : challenge
      ));

      setMessage({ 
        type: 'success', 
        text: `Successfully removed ${selectedChallenges.size} challenge(s) from events` 
      });
      
      setSelectedChallenges(new Set());

    } catch (error) {
      console.error("Error in bulk removal:", error);
      setMessage({ type: 'error', text: 'Failed to remove challenges from events' });
    }
  };

  const handleEditChallenge = (challenge: Challenge, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bulk selection when clicking edit
    onEditChallenge(challenge);
  };

  const handleToggleChallengeStatus = async (challengeId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bulk selection when clicking deactivate/activate
    
    try {
      await updateDoc(doc(db, "challenges", challengeId), {
        isActive: !currentStatus
      });
      setChallenges(challenges.map(challenge =>
        challenge.id === challengeId ? { ...challenge, isActive: !currentStatus } : challenge
      ));
      setMessage({ 
        type: 'success', 
        text: `Challenge ${!currentStatus ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      console.error("Error updating challenge status:", error);
      setMessage({ type: 'error', text: 'Failed to update challenge status' });
    }
  };

  const handleDeleteChallenge = async (challengeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bulk selection when clicking delete
    
    if (confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "challenges", challengeId));
        setChallenges(challenges.filter(challenge => challenge.id !== challengeId));
        setMessage({ type: 'success', text: 'Challenge deleted successfully' });
      } catch (error) {
        console.error("Error deleting challenge:", error);
        setMessage({ type: 'error', text: 'Failed to delete challenge' });
      }
    }
  };

  const toggleFeaturedOnPractice = async (challengeId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId), {
        featuredOnPractice: !currentStatus,
        availableInPractice: true, // Ensure it's available in practice when featured
        challengeType: !currentStatus ? 'practice' : undefined // Set as practice when featured
      });
      setChallenges(challenges.map(challenge =>
        challenge.id === challengeId ? { 
          ...challenge, 
          featuredOnPractice: !currentStatus,
          availableInPractice: true,
          challengeType: !currentStatus ? 'practice' : challenge.challengeType
        } : challenge
      ));
    } catch (error) {
      console.error("Error updating featured status:", error);
    }
  };

  const assignToEvent = async (challengeId: string, eventId: string, eventName: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      await updateDoc(doc(db, "challenges", challengeId), {
        eventId,
        eventName,
        challengeType: event?.status === 'LIVE' ? 'live' : 'upcoming',
        availableInPractice: false, // Remove from practice when assigned to event
        featuredOnPractice: false   // Remove from featured when assigned to event
      });
      setChallenges(challenges.map(challenge =>
        challenge.id === challengeId ? { 
          ...challenge, 
          eventId,
          eventName,
          challengeType: event?.status === 'LIVE' ? 'live' : 'upcoming',
          availableInPractice: false,
          featuredOnPractice: false
        } : challenge
      ));
    } catch (error) {
      console.error("Error assigning challenge to event:", error);
    }
  };

  const removeFromEvent = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId), {
        eventId: null,
        eventName: null,
        challengeType: 'practice',
        availableInPractice: true,
        featuredOnPractice: false
      });
      setChallenges(challenges.map(challenge =>
        challenge.id === challengeId ? { 
          ...challenge, 
          eventId: undefined,
          eventName: undefined,
          challengeType: 'practice',
          availableInPractice: true,
          featuredOnPractice: false
        } : challenge
      ));
    } catch (error) {
      console.error("Error removing challenge from event:", error);
    }
  };

  const makeAvailableInPractice = async (challengeId: string, available: boolean) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId), {
        availableInPractice: available,
        challengeType: available ? 'practice' : undefined,
        featuredOnPractice: available ? false : undefined // Remove featured status if making unavailable
      });
      setChallenges(challenges.map(challenge =>
        challenge.id === challengeId ? { 
          ...challenge, 
          availableInPractice: available,
          challengeType: available ? 'practice' : challenge.challengeType,
          featuredOnPractice: available ? challenge.featuredOnPractice : false
        } : challenge
      ));
    } catch (error) {
      console.error("Error updating practice availability:", error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      case "expert": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      web: "bg-blue-100 text-blue-800",
      crypto: "bg-purple-100 text-purple-800",
      forensics: "bg-orange-100 text-orange-800",
      pwn: "bg-red-100 text-red-800",
      reversing: "bg-indigo-100 text-indigo-800",
      misc: "bg-gray-100 text-gray-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getChallengeTypeBadge = (challenge: Challenge) => {
    if (challenge.challengeType === 'live') {
      return <Badge className="bg-red-100 text-red-800"><Zap className="w-3 h-3 mr-1" />Live Event</Badge>;
    }
    if (challenge.challengeType === 'upcoming') {
      return <Badge className="bg-yellow-100 text-yellow-800"><Calendar className="w-3 h-3 mr-1" />Upcoming</Badge>;
    }
    if (challenge.challengeType === 'past_event') {
      return <Badge className="bg-gray-100 text-gray-800">Past Event</Badge>;
    }
    if (challenge.featuredOnPractice) {
      return <Badge className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Featured</Badge>;
    }
    if (challenge.availableInPractice) {
      return <Badge className="bg-green-100 text-green-800">Practice</Badge>;
    }
    return null;
  };

  const getUniqueCategories = () => {
    const categories = challenges.map(challenge => challenge.finalCategory || challenge.category);
    return Array.from(new Set(categories)).filter(Boolean);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Function to truncate and format description
  const formatDescription = (description: string, challengeId: string, maxLength: number = 150) => {
    const isExpanded = expandedDescriptions.has(challengeId);
    
    if (isExpanded || description.length <= maxLength) {
      return (
        <div className="whitespace-pre-wrap break-words">
          {description}
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap break-words">
        {description.substring(0, maxLength)}...
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading challenges...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Challenge Management</h2>
          <p className="text-muted-foreground">
            Manage challenges, assign to events, and feature on practice page ({challenges.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </Button>
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Bulk Event Assignment
          </CardTitle>
          <CardDescription>
            Quickly assign multiple challenges to events or remove them from events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulk-event-select">Select Event</Label>
                <Select 
                  value={selectedEventForAssignment} 
                  onValueChange={setSelectedEventForAssignment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.filter(event => event.status !== 'ENDED').map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{event.title || event.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge className={
                              event.status === 'LIVE' ? 'bg-green-100 text-green-800' : 
                              event.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }>
                              {event.status}
                            </Badge>
                            <span>{formatDate(event.startDate || event.startTime?.toDate?.() || '')}</span>
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {event.participantCount}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={() => {
                    setBulkAssignmentMode(!bulkAssignmentMode);
                    setSelectedChallenges(new Set()); // Clear selection when toggling mode
                  }}
                  variant={bulkAssignmentMode ? "default" : "outline"}
                  className="w-full"
                >
                  {bulkAssignmentMode ? "Exit Bulk Mode" : "Enter Bulk Mode"}
                </Button>
              </div>
            </div>
          </div>

          {bulkAssignmentMode && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">Bulk Selection Mode</h4>
                  <p className="text-sm text-blue-700">
                    {selectedChallenges.size} challenge(s) selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    Select All ({filteredChallenges.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={bulkAssignToEvent}
                  disabled={!selectedEventForAssignment || selectedChallenges.size === 0}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Assign {selectedChallenges.size} to Event
                </Button>

                <Button
                  variant="outline"
                  onClick={bulkRemoveFromEvents}
                  disabled={selectedChallenges.size === 0}
                >
                  Remove {selectedChallenges.size} from Events
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getUniqueCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Challenge Type Filter */}
            <div>
              <Select value={filterChallengeType} onValueChange={setFilterChallengeType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="live">Live Event</SelectItem>
                  <SelectItem value="upcoming">Upcoming Event</SelectItem>
                  <SelectItem value="past">Past Event</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="assigned">Assigned to Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenges List */}
      <Card>
        <CardHeader>
          <CardTitle>Challenges</CardTitle>
          <CardDescription>
            {filteredChallenges.length} of {challenges.length} challenges shown
            {events.length > 0 && ` • ${events.length} events available`}
            {bulkAssignmentMode && ` • ${selectedChallenges.size} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredChallenges.map((challenge) => (
              <div 
                key={challenge.id} 
                className={`border rounded-lg p-4 transition-colors ${
                  bulkAssignmentMode ? 'cursor-pointer hover:bg-gray-50' : ''
                } ${
                  selectedChallenges.has(challenge.id) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => bulkAssignmentMode && toggleChallengeSelection(challenge.id)}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Challenge Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {bulkAssignmentMode && (
                        <div 
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                            selectedChallenges.has(challenge.id) 
                              ? 'bg-blue-500 border-blue-500 text-white' 
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedChallenges.has(challenge.id) && '✓'}
                        </div>
                      )}
                      <h3 className="font-semibold text-lg break-words">{challenge.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={challenge.isActive ? "default" : "secondary"}>
                          {challenge.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                        <Badge className={getCategoryColor(challenge.finalCategory || challenge.category)}>
                          {challenge.finalCategory || challenge.category}
                        </Badge>
                        <Badge variant="outline">
                          {challenge.points} pts
                        </Badge>
                        {getChallengeTypeBadge(challenge)}
                      </div>
                    </div>
                    
                    {/* Description with expand/collapse */}
                    <div className="text-sm text-muted-foreground">
                      {formatDescription(challenge.description, challenge.id)}
                      {challenge.description.length > 150 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs mt-1"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent bulk selection
                            toggleDescription(challenge.id);
                          }}
                        >
                          {expandedDescriptions.has(challenge.id) ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Show More
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Created by: {challenge.createdByName}</span>
                      <span>•</span>
                      <span>
                        {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                         new Date(challenge.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{challenge.solvedBy?.length || 0} solves</span>
                      {challenge.eventName && (
                        <>
                          <span>•</span>
                          <span>Event: {challenge.eventName}</span>
                        </>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {!bulkAssignmentMode && (
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        {/* Featured on Practice Toggle */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`featured-${challenge.id}`}
                            checked={challenge.featuredOnPractice || false}
                            onCheckedChange={(checked) => toggleFeaturedOnPractice(challenge.id, challenge.featuredOnPractice || false)}
                          />
                          <Label htmlFor={`featured-${challenge.id}`} className="text-sm whitespace-nowrap">
                            Featured on Practice
                          </Label>
                        </div>

                        {/* Available in Practice Toggle */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`practice-${challenge.id}`}
                            checked={challenge.availableInPractice || false}
                            onCheckedChange={(checked) => makeAvailableInPractice(challenge.id, checked)}
                          />
                          <Label htmlFor={`practice-${challenge.id}`} className="text-sm whitespace-nowrap">
                            Available in Practice
                          </Label>
                        </div>

                        {/* Event Assignment */}
                        {!challenge.eventId && events.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Select
                              value=""
                              onValueChange={(eventId) => {
                                const event = events.find(e => e.id === eventId);
                                if (event) {
                                  assignToEvent(challenge.id, eventId, event.title || event.name);
                                }
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Assign to Event" />
                              </SelectTrigger>
                              <SelectContent>
                                {events.filter(event => event.status !== 'ENDED').map(event => (
                                  <SelectItem key={event.id} value={event.id}>
                                    {event.title || event.name} ({event.status})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Remove from Event */}
                        {challenge.eventId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromEvent(challenge.id)}
                            className="whitespace-nowrap"
                          >
                            Remove from Event
                          </Button>
                        )}

                        {events.length === 0 && (
                          <Badge variant="outline" className="text-xs">
                            No events available
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Main Actions - Fixed positioning */}
                  {!bulkAssignmentMode && (
                    <div className="flex gap-2 flex-shrink-0 lg:flex-col lg:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEditChallenge(challenge, e)}
                        className="whitespace-nowrap"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleToggleChallengeStatus(challenge.id, challenge.isActive, e)}
                        className="whitespace-nowrap"
                      >
                        {challenge.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteChallenge(challenge.id, e)}
                        className="whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredChallenges.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {challenges.length === 0 ? (
                  <div className="space-y-2">
                    <p>No challenges created yet.</p>
                    <Button onClick={onCreateNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Challenge
                    </Button>
                  </div>
                ) : (
                  "No challenges match your filters."
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChallengeManagement;