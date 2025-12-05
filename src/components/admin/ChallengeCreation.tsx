// src/components/admin/ChallengeCreation.tsx
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  X, Plus, Upload, Link, FileText, User, ExternalLink, 
  Star, Shield, Calendar, Users, Eye, EyeOff, Lightbulb, 
  ChevronDown, ChevronUp, ArrowLeft, Flag 
} from "lucide-react";

interface ChallengeCreationProps {
  onBack: () => void;
  onChallengeCreated: (challengeId: string) => void;
  eventId?: string; // Pre-selected event ID
  eventName?: string; // Pre-selected event name
}

interface Question {
  id: string;
  question: string;
  points: number;
  flag: string;
  flagFormat?: string;
  hints: string[];
  files: FileAttachment[];
  expanded?: boolean;
}

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
}

interface ExternalSource {
  ctfName: string;
  ctfUrl: string;
  originalAuthor: string;
  authorUrl: string;
  license: string;
}

interface Event {
  id: string;
  name: string;
  title?: string;
  startDate: string;
  endDate: string;
  status?: string;
  participants?: string[];
}

const ChallengeCreation = ({ onBack, onChallengeCreated, eventId, eventName }: ChallengeCreationProps) => {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "web",
    customCategory: "",
    difficulty: "easy",
    points: 100,
    flag: "",
    flagFormat: "CTF{.*}",
    hasMultipleQuestions: false,
    isExternalChallenge: false,
    hints: [""],
    files: [] as FileAttachment[],
    creator: "",
    creatorUrl: "",
    externalSource: {
      ctfName: "",
      ctfUrl: "",
      originalAuthor: "",
      authorUrl: "",
      license: "unknown"
    } as ExternalSource,
    // Event assignment fields
    eventAssignment: "practice" as "practice" | "specific_event",
    selectedEventId: eventId || "",
    // Practice-related fields
    featuredOnPractice: false,
    availableInPractice: true,
    challengeType: 'practice' as 'practice' | 'live' | 'past_event'
  });

  const [questions, setQuestions] = useState<Question[]>([
    { 
      id: "1", 
      question: "", 
      points: 10, 
      flag: "", 
      flagFormat: "",
      hints: [],
      files: [],
      expanded: true
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Calculate total points for multi-question challenges
  const totalPoints = formData.hasMultipleQuestions 
    ? questions.reduce((sum, q) => sum + q.points, 0)
    : formData.points;

  // Auto-adjust difficulty based on total points for multi-question challenges
  useEffect(() => {
    if (formData.hasMultipleQuestions) {
      let suggestedDifficulty = "easy";
      
      if (totalPoints > 300) {
        suggestedDifficulty = "hard";
      } else if (totalPoints > 100) {
        suggestedDifficulty = "medium";
      } else {
        suggestedDifficulty = "easy";
      }

      // Only auto-update if the current difficulty doesn't match the suggested one
      const currentDifficultyPoints = {
        easy: { min: 1, max: 100 },
        medium: { min: 101, max: 300 },
        hard: { min: 301, max: 1000 }
      }[formData.difficulty];

      if (totalPoints < currentDifficultyPoints.min || totalPoints > currentDifficultyPoints.max) {
        setFormData(prev => ({ ...prev, difficulty: suggestedDifficulty }));
      }
    }
  }, [totalPoints, formData.hasMultipleQuestions]);

  // Fetch available events
  useEffect(() => {
    fetchEvents();
    
    // If eventId is provided, pre-select that event
    if (eventId) {
      setFormData(prev => ({
        ...prev,
        eventAssignment: "specific_event",
        selectedEventId: eventId
      }));
    }
  }, [eventId]);

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      
      // Get upcoming and live events that the user can assign challenges to
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("startDate", "desc")
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData: Event[] = [];

      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        const event = {
          id: doc.id,
          ...data
        } as Event;

        eventsData.push(event);
      });

      setEvents(eventsData);
    } catch (error: any) {
      console.error("Error fetching events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  // File upload function
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      // Create a unique file name
      const fileName = `challenge-files/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, fileName);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log("=== STARTING CHALLENGE CREATION ===");
      
      // Check user permissions
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const userRole = userData?.role;
        
        console.log("User role:", userRole);
        
        if (userRole !== 'admin' && userRole !== 'moderator') {
          alert("You need admin or moderator permissions to create challenges.");
          setLoading(false);
          return;
        }
      }

      // Validate form
      if (!formData.title.trim()) {
        alert("Please enter a challenge title");
        return;
      }

      if (!formData.description.trim()) {
        alert("Please enter a challenge description");
        return;
      }

      if (showCustomCategory && !formData.customCategory.trim()) {
        alert("Please enter a custom category name");
        return;
      }

      // Validate based on challenge type
      if (formData.hasMultipleQuestions) {
        console.log("Validating multi-question challenge...");
        // Validate multi-question challenge
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          console.log(`Validating question ${i + 1}:`, question);
          
          if (!question.question.trim()) {
            alert(`Please enter text for question ${i + 1}`);
            return;
          }
          if (!question.flag.trim()) {
            alert(`Please enter a flag for question ${i + 1}`);
            return;
          }
          if (question.points <= 0) {
            alert(`Please enter valid points for question ${i + 1} (must be greater than 0)`);
            return;
          }
        }
      } else {
        console.log("Validating single-flag challenge...");
        // Validate single-flag challenge
        if (!formData.flag.trim()) {
          alert("Please enter a flag for the challenge");
          return;
        }
      }

      // Determine event assignment
      const eventIdToAssign = formData.eventAssignment === "specific_event" 
        ? formData.selectedEventId 
        : null;

      // Determine challenge type based on event assignment
      let challengeType = formData.challengeType;
      if (eventIdToAssign) {
        challengeType = 'live'; // If assigned to an event, it's a live challenge
      } else if (formData.challengeType === 'live') {
        challengeType = 'practice'; // Can't have live challenge without event
      }

      // Prepare challenge data
      const challengeData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        finalCategory: showCustomCategory ? formData.customCategory.trim() : formData.category,
        difficulty: formData.difficulty,
        points: formData.hasMultipleQuestions ? totalPoints : formData.points,
        totalPoints: totalPoints,
        hasMultipleQuestions: formData.hasMultipleQuestions,
        isExternalChallenge: formData.isExternalChallenge,
        hints: formData.hints.filter(hint => hint.trim() !== ""),
        files: formData.files.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type
        })),
        createdAt: new Date(),
        isActive: true,
        solvedBy: [],
        // Event assignment
        eventId: eventIdToAssign,
        // Creator information
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email || "Unknown",
        // Practice fields
        featuredOnPractice: formData.featuredOnPractice,
        availableInPractice: formData.availableInPractice,
        challengeType: challengeType,
      };

      // CRITICAL FIX: Only add flag and flagFormat for single-question challenges
      // For multi-question challenges, don't include these fields
      if (!formData.hasMultipleQuestions) {
        challengeData.flag = formData.flag.trim();
        challengeData.flagFormat = formData.flagFormat.trim();
      }
      // For multi-question challenges, flag and flagFormat are not included

      // Add questions for multi-question challenges
      if (formData.hasMultipleQuestions) {
        challengeData.questions = questions.map(q => ({
          id: q.id,
          question: q.question.trim(),
          points: Number(q.points) || 0,
          flag: q.flag.trim(),
          flagFormat: q.flagFormat?.trim() || "",
          hints: q.hints.filter(hint => hint.trim() !== ""),
          files: q.files.map(file => ({
            id: file.id,
            name: file.name,
            url: file.url,
            type: file.type
          }))
        }));
        
        console.log("Prepared questions:", challengeData.questions);
      }

      // Add external challenge attribution if applicable
      if (formData.isExternalChallenge) {
        challengeData.attribution = {
          ctfName: formData.externalSource.ctfName.trim(),
          ctfUrl: formData.externalSource.ctfUrl.trim(),
          originalAuthor: formData.externalSource.originalAuthor.trim(),
          authorUrl: formData.externalSource.authorUrl.trim(),
          license: formData.externalSource.license,
          importedBy: user?.displayName || user?.email,
          importedById: user?.uid,
          importedAt: new Date()
        };
      }

      // Add original creator if specified
      if (formData.creator.trim()) {
        challengeData.originalCreator = {
          name: formData.creator.trim(),
          url: formData.creatorUrl.trim()
        };
      }

      console.log("Final challenge data to submit:", challengeData);

      // Try to create the challenge
      console.log("Attempting to add document to 'challenges' collection...");
      const docRef = await addDoc(collection(db, "challenges"), challengeData);
      console.log("Challenge created successfully! Document ID:", docRef.id);
      
      // Show success message with assignment info
      const assignedEvent = events.find(e => e.id === eventIdToAssign);
      const successMessage = assignedEvent 
        ? `Challenge created successfully and assigned to "${assignedEvent.title || assignedEvent.name}"!`
        : "Challenge created successfully for practice!";
      
      alert(successMessage);
      onChallengeCreated(docRef.id);
      resetForm();
    } catch (error: any) {
      console.error("=== ERROR CREATING CHALLENGE ===");
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        alert("Permission denied. You don't have permission to create challenges.");
      } else if (error.code === 'invalid-argument') {
        alert(`Invalid data: ${error.message}. Please check all fields and try again.`);
      } else {
        alert(`Error creating challenge: ${error.message}. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "web",
      customCategory: "",
      difficulty: "easy",
      points: 100,
      flag: "",
      flagFormat: "CTF{.*}",
      hasMultipleQuestions: false,
      isExternalChallenge: false,
      hints: [""],
      files: [],
      creator: "",
      creatorUrl: "",
      externalSource: {
        ctfName: "",
        ctfUrl: "",
        originalAuthor: "",
        authorUrl: "",
        license: "unknown"
      },
      eventAssignment: eventId ? "specific_event" : "practice",
      selectedEventId: eventId || "",
      featuredOnPractice: false,
      availableInPractice: true,
      challengeType: 'practice'
    });
    setQuestions([{ 
      id: "1", 
      question: "", 
      points: 10, 
      flag: "", 
      flagFormat: "",
      hints: [],
      files: [],
      expanded: true
    }]);
    setShowCustomCategory(false);
    setUploadingFiles(new Set());
  };

  const addHint = () => {
    setFormData({
      ...formData,
      hints: [...formData.hints, ""]
    });
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...formData.hints];
    newHints[index] = value;
    setFormData({ ...formData, hints: newHints });
  };

  const removeHint = (index: number) => {
    const newHints = formData.hints.filter((_, i) => i !== index);
    setFormData({ ...formData, hints: newHints });
  };

  // Question Management Functions
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      points: 10,
      flag: "",
      flagFormat: "",
      hints: [],
      files: [],
      expanded: true
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number | boolean | string[] | FileAttachment[]) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const toggleQuestionExpanded = (id: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, expanded: !q.expanded } : q
    ));
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  // Question Hints Management
  const addQuestionHint = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, hints: [...q.hints, ""] } : q
    ));
  };

  const updateQuestionHint = (questionId: string, hintIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newHints = [...q.hints];
        newHints[hintIndex] = value;
        return { ...q, hints: newHints };
      }
      return q;
    }));
  };

  const removeQuestionHint = (questionId: string, hintIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { 
        ...q, 
        hints: q.hints.filter((_, i) => i !== hintIndex) 
      } : q
    ));
  };

  // Question Files Management
  const addQuestionFile = async (questionId: string, type: 'file' | 'link') => {
    if (type === 'link') {
      const url = prompt("Enter the URL for this question:");
      if (url) {
        try {
          new URL(url);
        } catch {
          alert("Please enter a valid URL");
          return;
        }

        const newFile: FileAttachment = {
          id: Date.now().toString(),
          name: `Link - ${new Date().toLocaleDateString()}`,
          url: url,
          type: 'link'
        };
        
        setQuestions(questions.map(q => 
          q.id === questionId ? { ...q, files: [...q.files, newFile] } : q
        ));
      }
    } else {
      // For file uploads
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ".zip,.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.py,.js,.html,.css,.xml,.json";
      
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          
          try {
            // Create temporary file entry
            const tempFile: FileAttachment = {
              id: fileId,
              name: file.name,
              url: "uploading...",
              type: 'file'
            };
            
            setQuestions(prev => prev.map(q => 
              q.id === questionId ? { ...q, files: [...q.files, tempFile] } : q
            ));

            // Upload file to storage
            const fileUrl = await uploadFileToStorage(file);
            
            // Update file with actual URL
            setQuestions(prev => prev.map(q => 
              q.id === questionId ? { 
                ...q, 
                files: q.files.map(f => 
                  f.id === fileId ? { ...f, url: fileUrl } : f
                ) 
              } : q
            ));
            
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            alert(`Failed to upload ${file.name}. Please try again.`);
            
            // Remove failed upload
            setQuestions(prev => prev.map(q => 
              q.id === questionId ? { 
                ...q, 
                files: q.files.filter(f => f.id !== fileId) 
              } : q
            ));
          }
        }
      };
      input.click();
    }
  };

  const removeQuestionFile = (questionId: string, fileId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { 
        ...q, 
        files: q.files.filter(file => file.id !== fileId) 
      } : q
    ));
  };

  // Main Files Management
  const addFileAttachment = async (type: 'file' | 'link') => {
    if (type === 'link') {
      const url = prompt("Enter the URL:");
      if (url) {
        // Basic URL validation
        try {
          new URL(url);
        } catch {
          alert("Please enter a valid URL");
          return;
        }

        const newFile: FileAttachment = {
          id: Date.now().toString(),
          name: `Link - ${new Date().toLocaleDateString()}`,
          url: url,
          type: 'link'
        };
        setFormData({
          ...formData,
          files: [...formData.files, newFile]
        });
      }
    } else {
      // For file uploads
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true; // Allow multiple files
      input.accept = ".zip,.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.py,.js,.html,.css,.xml,.json";
      
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          for (const file of Array.from(files)) {
            const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            
            // Add to uploading files set
            setUploadingFiles(prev => new Set(prev).add(fileId));
            
            try {
              // Create temporary file entry
              const tempFile: FileAttachment = {
                id: fileId,
                name: file.name,
                url: "uploading...",
                type: 'file'
              };
              
              setFormData(prev => ({
                ...prev,
                files: [...prev.files, tempFile]
              }));

              // Upload file to storage
              const fileUrl = await uploadFileToStorage(file);
              
              // Update file with actual URL
              setFormData(prev => ({
                ...prev,
                files: prev.files.map(f => 
                  f.id === fileId ? { ...f, url: fileUrl } : f
                )
              }));
              
            } catch (error) {
              console.error(`Error uploading file ${file.name}:`, error);
              alert(`Failed to upload ${file.name}. Please try again.`);
              
              // Remove failed upload
              setFormData(prev => ({
                ...prev,
                files: prev.files.filter(f => f.id !== fileId)
              }));
            } finally {
              // Remove from uploading files set
              setUploadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
              });
            }
          }
        }
      };
      input.click();
    }
  };

  const removeFile = (id: string) => {
    setFormData({
      ...formData,
      files: formData.files.filter(file => file.id !== id)
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === "custom") {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: "custom" });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const updateExternalSource = (field: keyof ExternalSource, value: string) => {
    setFormData({
      ...formData,
      externalSource: {
        ...formData.externalSource,
        [field]: value
      }
    });
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

  const getEventStatus = (startDate: string, endDate: string): string => {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (now < start) return "UPCOMING";
      if (now > end) return "ENDED";
      return "LIVE";
    } catch {
      return "UPCOMING";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE": return "bg-green-500/20 text-green-600";
      case "UPCOMING": return "bg-blue-500/20 text-blue-600";
      case "ENDED": return "bg-gray-500/20 text-gray-600";
      default: return "bg-gray-500/20 text-gray-600";
    }
  };

  const getDifficultyDescription = () => {
    if (formData.hasMultipleQuestions) {
      return `Overall challenge difficulty based on ${questions.length} questions (${totalPoints} total points)`;
    }
    
    switch (formData.difficulty) {
      case "easy": return "Easy (1-100 points)";
      case "medium": return "Medium (101-300 points)";
      case "hard": return "Hard (301-500 points)";
      default: return "Select difficulty";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Challenge</CardTitle>
        <CardDescription>
          Add a new CTF challenge to the platform. Assign to an event or keep it for practice.
          {eventName && (
            <Badge variant="secondary" className="ml-2">
              Pre-selected: {eventName}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Assignment Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <Label className="text-base text-blue-900">Event Assignment</Label>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="practice"
                    name="eventAssignment"
                    checked={formData.eventAssignment === "practice"}
                    onChange={() => setFormData({...formData, eventAssignment: "practice"})}
                    className="text-blue-600"
                  />
                  <Label htmlFor="practice" className="text-sm font-medium">
                    Practice Challenge (No Event)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="specific_event"
                    name="eventAssignment"
                    checked={formData.eventAssignment === "specific_event"}
                    onChange={() => setFormData({...formData, eventAssignment: "specific_event"})}
                    className="text-blue-600"
                  />
                  <Label htmlFor="specific_event" className="text-sm font-medium">
                    Assign to Specific Event
                  </Label>
                </div>
              </div>

              {formData.eventAssignment === "specific_event" && (
                <div className="space-y-3">
                  <Label htmlFor="eventSelect">Select Event</Label>
                  {loadingEvents ? (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span>Loading events...</span>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 border rounded bg-white">
                      No events available for assignment.
                    </div>
                  ) : (
                    <Select 
                      value={formData.selectedEventId} 
                      onValueChange={(value) => setFormData({...formData, selectedEventId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => {
                          const status = getEventStatus(event.startDate, event.endDate);
                          return (
                            <SelectItem key={event.id} value={event.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{event.title || event.name}</span>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <Badge className={getStatusColor(status)}>
                                    {status}
                                  </Badge>
                                  <span>{formatDate(event.startDate)}</span>
                                  {event.participants && (
                                    <span className="flex items-center">
                                      <Users className="w-3 h-3 mr-1" />
                                      {event.participants.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {formData.selectedEventId && (
                    <div className="p-3 bg-blue-100 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> This challenge will be exclusively available during the selected event.
                        It will not appear in the practice section.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {formData.eventAssignment === "practice" && (
                <div className="p-3 bg-green-100 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Practice Challenge:</strong> This challenge will be available in the practice section 
                    for all users to solve at any time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Challenge Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter challenge title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="crypto">Cryptography</SelectItem>
                    <SelectItem value="forensics">Forensics</SelectItem>
                    <SelectItem value="pwn">Pwn</SelectItem>
                    <SelectItem value="reversing">Reverse Engineering</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                    <SelectItem value="custom">Custom Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomCategory && (
                <div>
                  <Label htmlFor="customCategory">Custom Category Name *</Label>
                  <Input
                    id="customCategory"
                    value={formData.customCategory}
                    onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
                    placeholder="Enter your custom category name"
                    required
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  {formData.hasMultipleQuestions && (
                    <Badge variant="outline" className="text-xs">
                      {totalPoints} total points
                    </Badge>
                  )}
                </div>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      Easy {formData.hasMultipleQuestions ? "(1-100 total points)" : "(1-100 points)"}
                    </SelectItem>
                    <SelectItem value="medium">
                      Medium {formData.hasMultipleQuestions ? "(101-300 total points)" : "(101-300 points)"}
                    </SelectItem>
                    <SelectItem value="hard">
                      Hard {formData.hasMultipleQuestions ? "(301-500 total points)" : "(301-500 points)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {getDifficultyDescription()}
                </p>
              </div>

              {!formData.hasMultipleQuestions && (
                <div>
                  <Label htmlFor="points">Points *</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                    min="1"
                    max="1000"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter detailed challenge description, requirements, and any setup instructions..."
                  rows={8}
                  required
                />
              </div>
            </div>
          </div>

          {/* Practice Visibility - Only show for practice challenges */}
          {formData.eventAssignment === "practice" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <Label className="text-base">Practice Visibility</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="availableInPractice"
                    checked={formData.availableInPractice}
                    onCheckedChange={(checked) => setFormData({...formData, availableInPractice: checked})}
                  />
                  <Label htmlFor="availableInPractice" className="text-sm">
                    Available in Practice
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featuredOnPractice"
                    checked={formData.featuredOnPractice}
                    onCheckedChange={(checked) => setFormData({...formData, featuredOnPractice: checked})}
                  />
                  <Label htmlFor="featuredOnPractice" className="text-sm">
                    <Star className="w-4 h-4 inline mr-1" />
                    Featured on Practice
                  </Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="challengeType">Challenge Type</Label>
                <Select 
                  value={formData.challengeType} 
                  onValueChange={(value: 'practice' | 'live' | 'past_event') => setFormData({...formData, challengeType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice Challenge</SelectItem>
                    <SelectItem value="past_event">Past Event Challenge</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  "Practice" challenges are regular practice content. "Past Event" challenges are from previous competitions.
                </p>
              </div>
            </div>
          )}

          {/* Creator Information */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <Label className="text-base">Creator Information</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator">Original Creator (Optional)</Label>
                <Input
                  id="creator"
                  value={formData.creator}
                  onChange={(e) => setFormData({...formData, creator: e.target.value})}
                  placeholder="Name of the original challenge creator"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use this if the challenge was created by someone else in your community
                </p>
              </div>

              <div>
                <Label htmlFor="creatorUrl">Creator Profile URL</Label>
                <Input
                  id="creatorUrl"
                  value={formData.creatorUrl}
                  onChange={(e) => setFormData({...formData, creatorUrl: e.target.value})}
                  placeholder="https://github.com/username"
                />
              </div>
            </div>
          </div>

          {/* External Challenge Attribution */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5" />
                <Label className="text-base">External CTF Challenge</Label>
              </div>
              <Switch
                checked={formData.isExternalChallenge}
                onCheckedChange={(checked) => setFormData({...formData, isExternalChallenge: checked})}
              />
            </div>
            
            {formData.isExternalChallenge && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Provide attribution for challenges downloaded from other CTF platforms
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ctfName">Original CTF Name *</Label>
                    <Input
                      id="ctfName"
                      value={formData.externalSource.ctfName}
                      onChange={(e) => updateExternalSource('ctfName', e.target.value)}
                      placeholder="e.g., HackTheBox, TryHackMe, CTFtime"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctfUrl">CTF Website URL</Label>
                    <Input
                      id="ctfUrl"
                      value={formData.externalSource.ctfUrl}
                      onChange={(e) => updateExternalSource('ctfUrl', e.target.value)}
                      placeholder="https://example.com/challenge"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="originalAuthor">Original Author</Label>
                    <Input
                      id="originalAuthor"
                      value={formData.externalSource.originalAuthor}
                      onChange={(e) => updateExternalSource('originalAuthor', e.target.value)}
                      placeholder="Name of the original challenge author"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="authorUrl">Author URL</Label>
                    <Input
                      id="authorUrl"
                      value={formData.externalSource.authorUrl}
                      onChange={(e) => updateExternalSource('authorUrl', e.target.value)}
                      placeholder="https://github.com/original-author"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="license">License</Label>
                    <Select 
                      value={formData.externalSource.license} 
                      onValueChange={(value) => updateExternalSource('license', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="creative-commons">Creative Commons</SelectItem>
                        <SelectItem value="mit">MIT License</SelectItem>
                        <SelectItem value="apache">Apache License</SelectItem>
                        <SelectItem value="gpl">GPL</SelectItem>
                        <SelectItem value="custom">Custom License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Challenge Type Selection */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <Label className="text-base">Challenge Type</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.hasMultipleQuestions}
                  onCheckedChange={(checked) => {
                    setFormData({...formData, hasMultipleQuestions: checked});
                    if (checked && questions.length === 0) {
                      setQuestions([{ 
                        id: "1", 
                        question: "", 
                        points: 10, 
                        flag: "", 
                        flagFormat: "",
                        hints: [],
                        files: [],
                        expanded: true
                      }]);
                    }
                  }}
                />
                <Label>Multi-Question Challenge</Label>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {formData.hasMultipleQuestions 
                ? "This challenge will contain multiple questions with individual flags and points."
                : "This challenge will have a single flag to solve."
              }
            </p>
          </div>

          {/* Single Flag Section */}
          {!formData.hasMultipleQuestions && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Flag className="w-5 h-5" />
                <Label className="text-base">Flag Configuration</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flag">Flag *</Label>
                  <Input
                    id="flag"
                    value={formData.flag}
                    onChange={(e) => setFormData({...formData, flag: e.target.value})}
                    placeholder="CTF{example_flag}"
                    className="font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The exact flag users need to submit to solve the challenge
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="flagFormat">Flag Format (Optional)</Label>
                  <Input
                    id="flagFormat"
                    value={formData.flagFormat}
                    onChange={(e) => setFormData({...formData, flagFormat: e.target.value})}
                    placeholder="CTF{.*} or flag format hint"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Regex or description to help users understand the flag format
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Question Section */}
          {formData.hasMultipleQuestions && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <Label className="text-base">Questions ({questions.length})</Label>
                  <Badge variant="outline" className="ml-2">
                    Total Points: {totalPoints}
                  </Badge>
                </div>
                <Button type="button" onClick={addQuestion} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Each question can have its own description, flag, points, hints, and files
              </p>
              
              <div className="space-y-4">
                {questions.map((question, qIndex) => (
                  <Card key={question.id} className="border">
                    <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => toggleQuestionExpanded(question.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary" className="h-6 w-6 flex items-center justify-center p-0">
                            {qIndex + 1}
                          </Badge>
                          <CardTitle className="text-base">
                            Question {qIndex + 1}
                            {question.question && (
                              <span className="text-sm text-muted-foreground ml-2">
                                - {question.question.substring(0, 50)}...
                              </span>
                            )}
                          </CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="font-mono">
                            {question.points} pts
                          </Badge>
                          {questions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQuestion(question.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuestionExpanded(question.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            {question.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {question.expanded && (
                      <CardContent className="p-4 pt-0 space-y-4">
                        {/* Question Description */}
                        <div>
                          <Label htmlFor={`question-${question.id}`}>Question Text *</Label>
                          <Textarea
                            id={`question-${question.id}`}
                            value={question.question}
                            onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                            placeholder="Enter the question text or description..."
                            rows={3}
                            required
                          />
                        </div>
                        
                        {/* Points and Flag */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`points-${question.id}`}>Points *</Label>
                            <Input
                              id={`points-${question.id}`}
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 0)}
                              min="1"
                              max="1000"
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`flag-${question.id}`}>Flag *</Label>
                            <Input
                              id={`flag-${question.id}`}
                              value={question.flag}
                              onChange={(e) => updateQuestion(question.id, 'flag', e.target.value)}
                              placeholder="CTF{question_flag}"
                              className="font-mono"
                              required
                            />
                          </div>
                        </div>
                        
                        {/* Flag Format */}
                        <div>
                          <Label htmlFor={`flagFormat-${question.id}`}>Flag Format (Optional)</Label>
                          <Input
                            id={`flagFormat-${question.id}`}
                            value={question.flagFormat || ''}
                            onChange={(e) => updateQuestion(question.id, 'flagFormat', e.target.value)}
                            placeholder="CTF{.*} or flag format hint"
                            className="font-mono"
                          />
                        </div>
                        
                        {/* Question Hints */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Question Hints ({question.hints.length})</Label>
                            <Button
                              type="button"
                              onClick={() => addQuestionHint(question.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Hint
                            </Button>
                          </div>
                          
                          {question.hints.map((hint, hintIndex) => (
                            <div key={hintIndex} className="flex items-center space-x-2">
                              <div className="flex-1">
                                <Input
                                  value={hint}
                                  onChange={(e) => updateQuestionHint(question.id, hintIndex, e.target.value)}
                                  placeholder={`Hint ${hintIndex + 1}...`}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={() => removeQuestionHint(question.id, hintIndex)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Question Files */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Question Files ({question.files.length})</Label>
                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                onClick={() => addQuestionFile(question.id, 'link')}
                                variant="outline"
                                size="sm"
                              >
                                <Link className="w-3 h-3 mr-1" />
                                Add Link
                              </Button>
                              <Button
                                type="button"
                                onClick={() => addQuestionFile(question.id, 'file')}
                                variant="outline"
                                size="sm"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Upload File
                              </Button>
                            </div>
                          </div>
                          
                          {question.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                {file.type === 'file' ? (
                                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Link className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={() => removeQuestionFile(question.id, file.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
              
              <div className="text-center">
                <Button type="button" onClick={addQuestion} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Question
                </Button>
              </div>
            </div>
          )}

          {/* Global Hints Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5" />
              <Label className="text-base">Challenge Hints ({formData.hints.filter(h => h.trim()).length})</Label>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Add hints that apply to the entire challenge. {formData.hasMultipleQuestions && "For per-question hints, add them in each question section above."}
            </p>
            
            <div className="space-y-3">
              {formData.hints.map((hint, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      value={hint}
                      onChange={(e) => updateHint(index, e.target.value)}
                      placeholder={`Hint ${index + 1}...`}
                    />
                  </div>
                  {formData.hints.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeHint(index)}
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <Button type="button" onClick={addHint} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Hint
            </Button>
          </div>

          {/* Global Files Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <Label className="text-base">
                Challenge Files ({formData.files.length})
                {uploadingFiles.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    Uploading {uploadingFiles.size}...
                  </Badge>
                )}
              </Label>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Add files or links that apply to the entire challenge. {formData.hasMultipleQuestions && "For per-question files, add them in each question section above."}
            </p>
            
            <div className="space-y-2">
              {formData.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {file.type === 'file' ? (
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Link className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.url === "uploading..." ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <p className="text-xs text-muted-foreground">Uploading...</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    disabled={file.url === "uploading..."}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Button type="button" onClick={() => addFileAttachment('link')} variant="outline" className="flex-1">
                <Link className="w-4 h-4 mr-2" />
                Add Link
              </Button>
              <Button type="button" onClick={() => addFileAttachment('file')} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button type="button" onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="space-x-2">
              <Button type="button" onClick={resetForm} variant="outline">
                Reset Form
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creating Challenge...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Challenge
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="p-4 bg-muted/50 border rounded-lg">
            <h4 className="font-medium mb-2">Challenge Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Title:</span>
                <p className="font-medium truncate">{formData.title || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium">
                  {showCustomCategory ? formData.customCategory : formData.category}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Difficulty:</span>
                <p className="font-medium capitalize">{formData.difficulty}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points:</span>
                <p className="font-medium">{totalPoints}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">
                  {formData.hasMultipleQuestions ? "Multi-Question" : "Single Flag"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Questions:</span>
                <p className="font-medium">{questions.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hints:</span>
                <p className="font-medium">{formData.hints.filter(h => h.trim()).length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Files:</span>
                <p className="font-medium">{formData.files.length}</p>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChallengeCreation;