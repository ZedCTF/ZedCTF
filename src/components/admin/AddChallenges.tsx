// src/components/admin/AddChallenges.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Search, 
  Plus, 
  ArrowLeft,
  CheckCircle,
  Filter,
  Lock,
  LockOpen,
  AlertTriangle
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  solvedBy?: string[];
  isActive: boolean;
  eventIds?: string[]; // Changed from eventId to eventIds array
  createdById?: string;
}

interface Event {
  id: string;
  name: string;
  title?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

interface AddChallengesProps {
  event: Event;
  onBack: () => void;
  onChallengesAdded: (challengeIds: string[]) => void;
  onCreateNewChallenge: () => void;
  onManageChallenges: () => void;
}

const AddChallenges = ({ event, onBack, onChallengesAdded, onCreateNewChallenge, onManageChallenges }: AddChallengesProps) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Check if event is locked (already started or live)
  const isEventLocked = () => {
    try {
      const now = new Date();
      const startDate = new Date(event.startDate);
      return now >= startDate || event.status === 'live';
    } catch {
      return false;
    }
  };

  const [eventLocked, setEventLocked] = useState(isEventLocked());

  useEffect(() => {
    fetchChallenges();
    // Re-check lock status periodically
    const interval = setInterval(() => {
      setEventLocked(isEventLocked());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterChallenges();
  }, [challenges, searchTerm, categoryFilter, difficultyFilter]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      
      // Get all active challenges
      const challengesQuery = query(
        collection(db, "challenges"),
        where("isActive", "==", true)
      );

      const challengesSnapshot = await getDocs(challengesQuery);
      const challengesData: Challenge[] = [];

      challengesSnapshot.forEach(doc => {
        const data = doc.data();
        const challenge = {
          id: doc.id,
          ...data
        } as Challenge;

        challengesData.push(challenge);
      });

      setChallenges(challengesData);
      
      // Pre-select challenges already assigned to this event
      const preSelected = challengesData
        .filter(challenge => challenge.eventIds?.includes(event.id))
        .map(challenge => challenge.id);
      setSelectedChallenges(new Set(preSelected));

    } catch (error: any) {
      console.error("Error fetching challenges:", error);
      setMessage({ type: 'error', text: `Failed to load challenges: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const filterChallenges = () => {
    let filtered = challenges;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(challenge =>
        challenge.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Apply difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(challenge =>
        challenge.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      );
    }

    setFilteredChallenges(filtered);
  };

  const toggleChallengeSelection = (challengeId: string) => {
    if (eventLocked) {
      setMessage({ 
        type: 'error', 
        text: 'Event challenges are locked because the event has started or is live. You cannot modify challenges at this time.' 
      });
      return;
    }

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

  const addChallengesToEvent = async () => {
    if (eventLocked) {
      setMessage({ 
        type: 'error', 
        text: 'Event challenges are locked because the event has started or is live. You cannot modify challenges at this time.' 
      });
      return;
    }

    if (selectedChallenges.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one challenge' });
      return;
    }

    setAdding(true);
    setMessage(null);

    try {
      const selectedChallengeIds = Array.from(selectedChallenges);
      
      // Add event ID to each selected challenge's eventIds array
      const addPromises = selectedChallengeIds.map(challengeId =>
        updateDoc(doc(db, "challenges", challengeId), {
          eventIds: arrayUnion(event.id)
        })
      );

      await Promise.all(addPromises);

      // Remove event ID from challenges that were deselected
      const challengesToRemove = challenges
        .filter(challenge => 
          challenge.eventIds?.includes(event.id) && !selectedChallenges.has(challenge.id)
        )
        .map(challenge => challenge.id);

      const removePromises = challengesToRemove.map(challengeId =>
        updateDoc(doc(db, "challenges", challengeId), {
          eventIds: arrayRemove(event.id)
        })
      );

      await Promise.all(removePromises);

      setMessage({ 
        type: 'success', 
        text: `Successfully updated ${selectedChallengeIds.length} challenge(s) for this event!` 
      });
      
      onChallengesAdded(selectedChallengeIds);

    } catch (error: any) {
      console.error("Error adding challenges to event:", error);
      setMessage({ type: 'error', text: `Failed to add challenges: ${error.message}` });
    } finally {
      setAdding(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-500/20 text-green-600 border-green-200";
      case "medium": return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
      case "hard": return "bg-red-500/20 text-red-600 border-red-200";
      case "expert": return "bg-purple-500/20 text-purple-600 border-purple-200";
      default: return "bg-gray-500/20 text-gray-600 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      web: "bg-blue-500/20 text-blue-600 border-blue-200",
      crypto: "bg-purple-500/20 text-purple-600 border-purple-200",
      forensics: "bg-orange-500/20 text-orange-600 border-orange-200",
      pwn: "bg-red-500/20 text-red-600 border-red-200",
      reversing: "bg-indigo-500/20 text-indigo-600 border-indigo-200",
      misc: "bg-gray-500/20 text-gray-600 border-gray-200"
    };
    return colors[category.toLowerCase()] || "bg-gray-500/20 text-gray-600 border-gray-200";
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const categories = Array.from(new Set(challenges.map(c => c.category)));
  const difficulties = Array.from(new Set(challenges.map(c => c.difficulty)));

  // Navigation handlers
  const handleCreateNewChallenge = () => {
    onCreateNewChallenge();
  };

  const handleManageChallenges = () => {
    onManageChallenges();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Add Challenges to Event</h2>
          <p className="text-muted-foreground">
            Select existing challenges for: <strong>{event.title || event.name}</strong>
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
      </div>

      {/* Event Lock Warning */}
      {eventLocked && (
        <Alert className="bg-amber-500/10 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            <strong>Event Challenges Locked</strong> - This event has started or is live. 
            Challenge modifications are disabled to maintain competition integrity.
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Event Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{event.title || event.name}</h3>
                {eventLocked ? (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Locked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <LockOpen className="w-3 h-3" />
                    Editable
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Starts: {formatDate(event.startDate)}
              </div>
              <div className="text-sm text-muted-foreground">
                Ends: {formatDate(event.endDate)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {eventLocked ? (
                <span className="text-amber-600">Challenges cannot be modified</span>
              ) : (
                <span className="text-green-600">Challenges can be modified</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={handleCreateNewChallenge}
          variant="outline"
          className="gap-2"
          disabled={eventLocked}
        >
          <Plus className="w-4 h-4" />
          Create New Challenge
          {eventLocked && <Lock className="w-3 h-3 ml-1" />}
        </Button>
        
        <Button 
          onClick={handleManageChallenges}
          variant="outline"
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          Manage All Challenges
        </Button>
      </div>

      {/* Selection Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {selectedChallenges.size} challenge(s) selected
              </p>
              {eventLocked && (
                <p className="text-xs text-amber-600">
                  Challenge selection is locked for this event
                </p>
              )}
            </div>
            <Button 
              onClick={addChallengesToEvent} 
              disabled={adding || selectedChallenges.size === 0 || eventLocked}
              className="gap-2"
            >
              {adding ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Update Event Challenges ({selectedChallenges.size})
                  {eventLocked && <Lock className="w-3 h-3 ml-1" />}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Challenges List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading challenges...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">No Challenges Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || categoryFilter !== "all" || difficultyFilter !== "all"
                ? "No challenges match your search criteria."
                : "No active challenges available."}
            </p>
            {!eventLocked && (
              <Button 
                onClick={handleCreateNewChallenge} 
                className="mt-4"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredChallenges.map((challenge) => (
            <Card 
              key={challenge.id}
              className={`transition-all ${
                selectedChallenges.has(challenge.id)
                  ? 'border-primary bg-primary/5'
                  : eventLocked 
                    ? 'opacity-70 cursor-not-allowed' 
                    : 'hover:border-primary/30 cursor-pointer'
              }`}
              onClick={() => !eventLocked && toggleChallengeSelection(challenge.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{challenge.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">
                            {challenge.points} pts
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className={getDifficultyColor(challenge.difficulty)}
                          >
                            {challenge.difficulty}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className={getCategoryColor(challenge.category)}
                          >
                            {challenge.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {selectedChallenges.has(challenge.id) ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className={`w-5 h-5 border-2 rounded-full ${
                            eventLocked ? 'border-gray-200' : 'border-gray-300'
                          }`} />
                        )}
                        {eventLocked && challenge.eventIds?.includes(event.id) && (
                          <Lock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {challenge.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {challenge.solvedBy && challenge.solvedBy.length > 0 && (
                        <span>{challenge.solvedBy.length} solves</span>
                      )}
                      {challenge.eventIds && challenge.eventIds.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Used in {challenge.eventIds.length} event(s)
                          {challenge.eventIds.includes(event.id) && " • Currently in this event"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddChallenges;