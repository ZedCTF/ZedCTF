import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Shield, ArrowLeft, Users, Clock, FileText, Link, Eye, EyeOff, Copy, ExternalLink, Lightbulb, Calendar, Lock } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
  challengeType?: 'practice' | 'live' | 'past_event' | 'upcoming';
  totalPoints?: number;
  eventId?: string;
}

interface Event {
  id: string;
  name: string;
  title?: string;
  status: string;
  startDate: string;
  endDate: string;
}

const UpcomingChallengePreview = () => {
  const { challengeId, eventId } = useParams<{ challengeId: string; eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showHints, setShowHints] = useState<boolean[]>([]);
  const [showFlag, setShowFlag] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    if (challengeId && eventId) {
      fetchChallenge();
      fetchEvent();
    }
  }, [challengeId, eventId]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      
      const challengeDoc = await getDoc(doc(db, "challenges", challengeId!));
      
      if (challengeDoc.exists()) {
        const challengeData = {
          id: challengeDoc.id,
          ...challengeDoc.data()
        } as Challenge;
        setChallenge(challengeData);
        
        // Initialize hints visibility
        if (challengeData.hints) {
          setShowHints(new Array(challengeData.hints.length).fill(false));
        }
      } else {
        setMessage({ type: 'error', text: 'Challenge not found' });
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
      setMessage({ type: 'error', text: 'Failed to load challenge' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvent = async () => {
    if (!eventId) return;

    try {
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
        setEvent(eventData);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    }
  };

  const navigateToEvent = () => {
    navigate(`/event/upcoming/${eventId}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleHint = (index: number) => {
    const newShowHints = [...showHints];
    newShowHints[index] = !newShowHints[index];
    setShowHints(newShowHints);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date/time";
      }
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch {
      return "Invalid date/time";
    }
  };

  const renderChallengeContent = () => {
    if (!challenge?.description) return null;

    const lines = challenge.description.split('\n');
    const content = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('n =') || line.startsWith('e =') || line.startsWith('c =')) {
        // Handle crypto parameters with copy buttons
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        content.push(
          <div key={i} className="mb-3 p-3 bg-muted/30 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-semibold text-xs">{key}=</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(value)}
                className="h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="font-mono text-xs bg-background p-2 rounded border break-all overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words m-0">{value}</pre>
            </div>
          </div>
        );
      } else if (line.includes('=') && line.length > 50) {
        // Handle other long key-value pairs
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        content.push(
          <div key={i} className="mb-2">
            <strong className="text-sm">{key}=</strong>
            <div className="font-mono text-xs bg-muted/30 p-2 rounded border break-all overflow-x-auto mt-1">
              <pre className="whitespace-pre-wrap break-words m-0">{value}</pre>
            </div>
          </div>
        );
      } else if (line) {
        // Regular text
        content.push(
          <p key={i} className="mb-2 text-sm leading-relaxed break-words">
            {line}
          </p>
        );
      } else {
        // Empty line (paragraph break)
        content.push(<div key={i} className="mb-2" />);
      }
    }

    return content;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading challenge preview...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!challenge) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <Card className="max-w-md mx-auto border">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h2 className="text-lg font-bold mb-2">Challenge Not Found</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  The challenge you're looking for doesn't exist.
                </p>
                <Button onClick={navigateToEvent} variant="terminal" size="sm">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Event
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

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
      misc: "bg-gray-500/20 text-gray-600 border-gray-200",
      osint: "bg-pink-500/20 text-pink-600 border-pink-200"
    };
    return colors[category.toLowerCase()] || "bg-gray-500/20 text-gray-600 border-gray-200";
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={navigateToEvent} 
                size="sm" 
                className="h-8 px-2 sm:px-3 -ml-2"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Back to Event</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{challenge.title}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Upcoming Preview
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-200 text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Admin Preview
              </Badge>
              {event && (
                <Badge variant="outline" className="text-xs">
                  {event.title || event.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Event Banner */}
          {event && (
            <Card className="mb-4 border border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Preview for Event: {event.title || event.name}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1 space-y-1">
                  <p>Event starts: {formatDate(event.startDate)}</p>
                  <p>Participants will see this challenge when the event starts.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Challenge info */}
          <Card className="mb-4 border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={`${getDifficultyColor(challenge.difficulty)} text-xs`}>
                  {challenge.difficulty}
                </Badge>
                <Badge className={`${getCategoryColor(challenge.finalCategory || challenge.category)} text-xs`}>
                  {challenge.finalCategory || challenge.category}
                </Badge>
                <Badge variant="outline" className="font-mono font-semibold text-xs">
                  {challenge.totalPoints || challenge.points} pts
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Preview Only</span>
                </div>
              </div>
              
              {/* Creator info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2 text-xs text-muted-foreground">
                <div>By: {challenge.createdByName || 'Unknown'}</div>
                {challenge.originalCreator && (
                  <div className="flex items-center gap-1">
                    <span>Original: </span>
                    {challenge.originalCreator.url ? (
                      <a 
                        href={challenge.originalCreator.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary underline"
                      >
                        {challenge.originalCreator.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span>{challenge.originalCreator.name}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {message && (
            <Alert className={`mb-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
              <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Main Content - Full width on mobile */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="w-full">
                <div className="flex overflow-x-auto scrollbar-hide mb-4 bg-muted/30 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("description")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "description" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground"
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab("hints")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "hints" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground"
                    }`}
                  >
                    Hints ({challenge.hints?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("files")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "files" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground"
                    }`}
                  >
                    Files ({(challenge.files?.length || 0)})
                  </button>
                  {challenge.flag && (
                    <button
                      onClick={() => setActiveTab("flag")}
                      className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        activeTab === "flag" 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground"
                      }`}
                    >
                      Flag
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {/* Description Tab */}
                  {activeTab === "description" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                          {challenge.hasMultipleQuestions && challenge.questions ? (
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold">Questions (Preview)</h3>
                              {challenge.questions.map((question, index) => (
                                <div key={question.id || index} className="border rounded p-3">
                                  <h4 className="font-semibold text-sm mb-1">Question {index + 1}</h4>
                                  <p className="mb-2 text-xs text-muted-foreground break-words">{question.question}</p>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-semibold">{question.points} points</span>
                                    <Badge variant="outline" className="font-mono text-xs bg-green-500/10 text-green-600">
                                      Flag: {question.flag}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3 break-words">
                              <div className="p-2 bg-blue-500/10 border border-blue-200 rounded text-xs text-blue-600 mb-3">
                                <p><strong>Admin Preview:</strong> This is what participants will see when the event starts.</p>
                              </div>
                              
                              {renderChallengeContent()}
                              
                              {challenge.flagFormat && (
                                <div className="p-3 bg-blue-500/10 border border-blue-200 rounded text-xs">
                                  <p className="text-blue-600 break-words">
                                    <strong>Flag Format:</strong> {challenge.flagFormat}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Hints Tab */}
                  {activeTab === "hints" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        {challenge.hints && challenge.hints.length > 0 ? (
                          <div className="space-y-3">
                            <div className="p-2 bg-yellow-500/10 border border-yellow-200 rounded text-xs text-yellow-600 mb-3">
                              <p><strong>Admin Preview:</strong> Participants will need to click "Reveal" to see each hint.</p>
                            </div>
                            
                            {challenge.hints.map((hint, index) => (
                              <Card key={index} className="border">
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                      <Lightbulb className="w-3 h-3 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">Hint {index + 1}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">(Participants click to reveal)</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleHint(index)}
                                            className="h-6 px-2 text-xs"
                                          >
                                            {showHints[index] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            {showHints[index] ? 'Hide' : 'Show'}
                                          </Button>
                                        </div>
                                      </div>
                                      {showHints[index] && (
                                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border break-words">
                                          {hint}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No hints available for this challenge.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Files Tab */}
                  {activeTab === "files" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        {challenge.files && challenge.files.length > 0 ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-green-500/10 border border-green-200 rounded text-xs text-green-600 mb-3">
                              <p><strong>Admin Preview:</strong> Files and links available for download.</p>
                            </div>
                            
                            {challenge.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 text-sm border rounded transition-colors hover:bg-muted/50"
                              >
                                {file.type === 'file' ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <Link className="w-4 h-4" />
                                )}
                                <span className="flex-1 truncate">{file.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No files or links available.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Flag Tab */}
                  {activeTab === "flag" && challenge.flag && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                          <div className="p-3 bg-green-500/10 border border-green-200 rounded text-green-600">
                            <p className="text-sm font-medium mb-1">Admin Flag Preview</p>
                            <p className="text-xs">This is the correct flag that participants need to submit.</p>
                          </div>
                          
                          <div className="p-3 bg-muted/30 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm">Flag</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowFlag(!showFlag)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {showFlag ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  {showFlag ? 'Hide' : 'Show'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(challenge.flag!)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {showFlag && (
                              <div className="font-mono text-sm bg-background p-3 rounded border break-all overflow-x-auto mt-2">
                                <pre className="whitespace-pre-wrap break-words m-0">{challenge.flag}</pre>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-2 bg-blue-500/10 border border-blue-200 rounded text-xs text-blue-600">
                            <p><strong>Note:</strong> Participants will only see this if they have already solved the challenge.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Admin Preview Info */}
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    Admin Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="text-center p-3 bg-blue-500/10 border border-blue-200 rounded">
                    <Lock className="w-8 h-8 text-blue-600 mx-auto mb-1" />
                    <p className="text-blue-600 font-semibold text-sm">Upcoming Challenge Preview</p>
                    <p className="text-blue-600 text-xs mt-1">
                      This challenge is not yet accessible to participants.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                        Upcoming
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Access</span>
                      <Badge className="bg-purple-500/20 text-purple-600 text-xs">
                        Admin Only
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Points</span>
                      <span className="font-semibold">{challenge.totalPoints || challenge.points}</span>
                    </div>
                    {event && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Event Start</span>
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Event End</span>
                          <span>{formatDate(event.endDate)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="p-2 bg-muted/30 rounded border text-xs">
                    <p className="font-medium mb-1">Preview Features:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Full challenge description</li>
                      <li>All hints (with reveal toggle)</li>
                      <li>Downloadable files</li>
                      <li>Flag preview (admin only)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Challenge Details */}
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Challenge Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Difficulty</h4>
                    <Badge className={`${getDifficultyColor(challenge.difficulty)} text-xs mt-1`}>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Category</h4>
                    <Badge className={`${getCategoryColor(challenge.finalCategory || challenge.category)} text-xs mt-1`}>
                      {challenge.finalCategory || challenge.category}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Points</h4>
                    <p className="text-sm font-semibold">{challenge.totalPoints || challenge.points}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Type</h4>
                    <p className="text-sm">{challenge.hasMultipleQuestions ? 'Multi-Question' : 'Single Flag'}</p>
                  </div>
                  {challenge.hints && challenge.hints.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Hints Available</h4>
                      <p className="text-sm">{challenge.hints.length}</p>
                    </div>
                  )}
                  {challenge.files && challenge.files.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Files/Links</h4>
                      <p className="text-sm">{challenge.files.length}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UpcomingChallengePreview;