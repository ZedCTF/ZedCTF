// src/components/ChallengeDetail.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, Flag, Users, Clock, Star, FileText, Link, Eye, EyeOff, CheckCircle, XCircle, Copy, ExternalLink, Lightbulb } from "lucide-react";
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
  featuredOnPractice?: boolean;
  availableInPractice?: boolean;
  challengeType?: 'practice' | 'live' | 'past_event';
  totalPoints?: number;
}

interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  flag: string;
  isCorrect: boolean;
  submittedAt: any;
  pointsAwarded?: number;
}

const ChallengeDetail = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showHints, setShowHints] = useState<boolean[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState("description");

  // Base URL for navigation
  const baseUrl = "/ZedCTF";

  useEffect(() => {
    if (challengeId) {
      fetchChallenge();
      fetchSubmissions();
    }
  }, [challengeId]);

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

  const fetchSubmissions = async () => {
    if (!user || !challengeId) return;

    try {
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("challengeId", "==", challengeId),
        where("userId", "==", user.uid),
        orderBy("submittedAt", "desc")
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionsData = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const submitFlag = async () => {
    if (!challenge || !user || !flagInput.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      let isCorrect = false;
      
      // Check if it's a multi-question challenge
      if (challenge.hasMultipleQuestions && challenge.questions) {
        // For multi-question challenges, check each question's flag
        const matchedQuestion = challenge.questions.find(q => 
          q.flag && q.flag.trim() === flagInput.trim()
        );
        isCorrect = !!matchedQuestion;
      } else {
        // For single flag challenges
        isCorrect = challenge.flag?.trim() === flagInput.trim();
      }

      // Record submission
      const submissionData = {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        userId: user.uid,
        userName: user.displayName || user.email,
        flag: flagInput,
        isCorrect: isCorrect,
        submittedAt: new Date(),
        pointsAwarded: isCorrect ? (challenge.points || 0) : 0
      };

      await addDoc(collection(db, "submissions"), submissionData);

      if (isCorrect) {
        setMessage({ type: 'success', text: 'Congratulations! Flag is correct!' });
        setFlagInput("");
        
        // Refresh challenge to update solved status
        fetchChallenge();
        fetchSubmissions();
      } else {
        setMessage({ type: 'error', text: 'Incorrect flag. Please try again.' });
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      setMessage({ type: 'error', text: 'Failed to submit flag. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleHint = (index: number) => {
    const newShowHints = [...showHints];
    newShowHints[index] = !newShowHints[index];
    setShowHints(newShowHints);
  };

  const navigateToPractice = () => {
    navigate(`${baseUrl}/practice`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const isSolved = challenge?.solvedBy?.includes(user?.uid || '');

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading challenge...</p>
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
                <Button onClick={navigateToPractice} variant="terminal" size="sm">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Practice
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
    switch (difficulty) {
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
    return colors[category] || "bg-gray-500/20 text-gray-600 border-gray-200";
  };

  // Function to render challenge content with proper formatting
  const renderChallengeContent = () => {
    if (!challenge.description) return null;

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
            <div className="font-mono text-xs bg-background p-2 rounded border break-all">
              {value}
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
            <div className="font-mono text-xs bg-muted/30 p-2 rounded border break-all mt-1">
              {value}
            </div>
          </div>
        );
      } else if (line) {
        // Regular text
        content.push(
          <p key={i} className="mb-2 text-sm leading-relaxed">
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Header - Only show challenge name */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={navigateToPractice} size="sm" className="-ml-3">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Practice
              </Button>
              <h1 className="text-xl font-bold">{challenge.title}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {isSolved && (
                <Badge className="bg-green-500/20 text-green-600 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Solved
                </Badge>
              )}
              {challenge.featuredOnPractice && (
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-200">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>

          {/* Challenge Info Bar */}
          <Card className="mb-4 border">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Badge className={getDifficultyColor(challenge.difficulty)}>
                  {challenge.difficulty}
                </Badge>
                <Badge className={getCategoryColor(challenge.finalCategory || challenge.category)}>
                  {challenge.finalCategory || challenge.category}
                </Badge>
                <Badge variant="outline" className="font-mono font-semibold">
                  {challenge.totalPoints || challenge.points} pts
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{challenge.solvedBy?.length || 0} solves</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                     new Date(challenge.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  By: {challenge.createdByName || 'Unknown'}
                </div>
                {challenge.originalCreator && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Original: </span>
                    {challenge.originalCreator.url ? (
                      <a 
                        href={challenge.originalCreator.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
                  <TabsTrigger value="hints" className="text-xs">Hints ({challenge.hints?.length || 0})</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">
                    Files & Links ({(challenge.files?.length || 0)})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="space-y-3 mt-3">
                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {challenge.hasMultipleQuestions && challenge.questions ? (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Questions</h3>
                            {challenge.questions.map((question, index) => (
                              <div key={question.id} className="border rounded p-3">
                                <h4 className="font-semibold text-sm mb-1">Question {index + 1}</h4>
                                <p className="mb-2 text-xs text-muted-foreground">{question.question}</p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-semibold">{question.points} points</span>
                                  {challenge.solvedBy?.includes(user?.uid || '') && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      Flag: {question.flag}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {renderChallengeContent()}
                            
                            {challenge.flagFormat && (
                              <div className="p-3 bg-blue-500/10 border border-blue-200 rounded text-xs">
                                <p className="text-blue-600">
                                  <strong>Flag Format:</strong> {challenge.flagFormat}
                                </p>
                              </div>
                            )}
                            
                            {isSolved && challenge.flag && (
                              <div className="p-3 bg-green-500/10 border border-green-200 rounded">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-green-600 font-mono break-all">
                                    <strong>Flag:</strong> {challenge.flag}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(challenge.flag!)}
                                    className="h-6 px-2"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="hints" className="mt-3">
                  <Card className="border">
                    <CardContent className="p-4">
                      {challenge.hints && challenge.hints.length > 0 ? (
                        <div className="space-y-2">
                          {challenge.hints.map((hint, index) => (
                            <Card key={index} className="border">
                              <CardContent className="p-3">
                                <Button
                                  variant="ghost"
                                  onClick={() => toggleHint(index)}
                                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                                >
                                  <div className="flex items-center gap-2">
                                    <Lightbulb className="w-3 h-3" />
                                    <span className="text-sm">Hint {index + 1}</span>
                                  </div>
                                  <div className={`transform transition-transform ${showHints[index] ? 'rotate-180' : ''}`}>
                                    ↓
                                  </div>
                                </Button>
                                {showHints[index] && (
                                  <p className="mt-2 text-xs text-muted-foreground pl-5">
                                    {hint}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">No hints available.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="files" className="mt-3">
                  <Card className="border">
                    <CardContent className="p-4">
                      {challenge.files && challenge.files.length > 0 ? (
                        <div className="space-y-2">
                          {challenge.files.map((file, index) => (
                            <a
                              key={index}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 text-sm border rounded hover:bg-accent transition-colors"
                            >
                              {file.type === 'file' ? (
                                <FileText className="w-3 h-3" />
                              ) : (
                                <Link className="w-3 h-3" />
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
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Flag Submission */}
              <Card className="border sticky top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flag className="w-4 h-4" />
                    Submit Flag
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {message && (
                    <Alert className={`text-sm ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
                      {message.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                        {message.text}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isSolved ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="flag" className="text-xs font-medium">Enter Flag</Label>
                        <Input
                          id="flag"
                          placeholder="CTF{...} or flag content"
                          value={flagInput}
                          onChange={(e) => setFlagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && submitFlag()}
                          className="font-mono text-sm h-9"
                        />
                      </div>
                      <Button 
                        onClick={submitFlag} 
                        disabled={submitting || !flagInput.trim()}
                        className="w-full h-9"
                        variant="terminal"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-2"></div>
                            Checking...
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Submit Flag
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-green-500/10 border border-green-200 rounded">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
                      <p className="text-green-600 font-semibold text-sm">Challenge Solved!</p>
                      <p className="text-green-600 text-xs mt-1">
                        +{challenge.totalPoints || challenge.points} points
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submission History */}
              {submissions.length > 0 && (
                <Card className="border">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Submission History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-2 border rounded text-xs">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {submission.isCorrect ? (
                              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                            )}
                            <code className="truncate font-mono">{submission.flag}</code>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0 ml-1 text-xs">
                            {submission.submittedAt?.toDate?.()?.toLocaleTimeString() || 
                             new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChallengeDetail;