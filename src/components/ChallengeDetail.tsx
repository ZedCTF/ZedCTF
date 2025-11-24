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
import { Shield, ArrowLeft, Flag, Users, Clock, Star, FileText, Link, Eye, EyeOff, CheckCircle, XCircle, Copy } from "lucide-react";
import Navbar from "./Navbar"; // Add this import
import Footer from "./Footer"; // Add this import

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
    navigate('/practice');
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
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading challenge...</p>
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
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Challenge Not Found</h3>
                <p className="text-muted-foreground mb-6">
                  The challenge you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Button onClick={navigateToPractice}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
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
      case "easy": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard": return "bg-red-100 text-red-800 border-red-200";
      case "expert": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      web: "bg-blue-100 text-blue-800 border-blue-200",
      crypto: "bg-purple-100 text-purple-800 border-purple-200",
      forensics: "bg-orange-100 text-orange-800 border-orange-200",
      pwn: "bg-red-100 text-red-800 border-red-200",
      reversing: "bg-indigo-100 text-indigo-800 border-indigo-200",
      misc: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
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
          <div key={i} className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-sm">{key}=</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(value)}
                className="h-8 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="font-mono text-sm bg-white p-3 rounded border break-all">
              {value}
            </div>
          </div>
        );
      } else if (line.includes('=') && line.length > 50) {
        // Handle other long key-value pairs
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        content.push(
          <div key={i} className="mb-3">
            <strong>{key}=</strong>
            <div className="font-mono text-sm bg-gray-50 p-2 rounded border break-all mt-1">
              {value}
            </div>
          </div>
        );
      } else if (line) {
        // Regular text
        content.push(
          <p key={i} className="mb-3 leading-relaxed">
            {line}
          </p>
        );
      } else {
        // Empty line (paragraph break)
        content.push(<div key={i} className="mb-3" />);
      }
    }

    return content;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={navigateToPractice}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Practice
            </Button>
            
            <div className="flex items-center gap-2">
              {isSolved && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Solved
                </Badge>
              )}
              {challenge.featuredOnPractice && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>

          {/* Challenge Header */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <CardTitle className="text-3xl font-bold">{challenge.title}</CardTitle>
                  <CardDescription className="text-lg text-muted-foreground">
                    {challenge.description.split('\n')[0]} {/* Show first line as subtitle */}
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Badge className={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                  <Badge className={getCategoryColor(challenge.finalCategory || challenge.category)}>
                    {challenge.finalCategory || challenge.category}
                  </Badge>
                  <Badge variant="outline" className="font-mono font-semibold">
                    {challenge.totalPoints || challenge.points} pts
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-4 border-t mt-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{challenge.solvedBy?.length || 0} solves</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                     new Date(challenge.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Created by: {challenge.createdByName || 'Unknown'}</span>
                </div>
                {challenge.originalCreator && (
                  <div className="flex items-center gap-1">
                    <span>Original creator: {challenge.originalCreator.name}</span>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="hints">Hints</TabsTrigger>
                  <TabsTrigger value="files">Files & Links</TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {challenge.hasMultipleQuestions && challenge.questions ? (
                          <div className="space-y-6">
                            <h3 className="text-xl font-semibold">Questions</h3>
                            {challenge.questions.map((question, index) => (
                              <div key={question.id} className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-2">Question {index + 1}</h4>
                                <p className="mb-3 text-muted-foreground">{question.question}</p>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-mono font-semibold">{question.points} points</span>
                                  {challenge.solvedBy?.includes(user?.uid || '') && (
                                    <Badge variant="outline" className="font-mono">
                                      Flag: {question.flag}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {renderChallengeContent()}
                            
                            {challenge.flagFormat && (
                              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Flag Format:</strong> {challenge.flagFormat}
                                </p>
                              </div>
                            )}
                            
                            {isSolved && challenge.flag && (
                              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-green-800 font-mono break-all">
                                    <strong>Flag:</strong> {challenge.flag}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(challenge.flag!)}
                                    className="h-8 px-2"
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
                
                <TabsContent value="hints" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      {challenge.hints && challenge.hints.length > 0 ? (
                        <div className="space-y-4">
                          {challenge.hints.map((hint, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-lg">Hint {index + 1}</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleHint(index)}
                                  className="flex items-center gap-2"
                                >
                                  {showHints[index] ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                  {showHints[index] ? 'Hide' : 'Reveal'}
                                </Button>
                              </div>
                              {showHints[index] && (
                                <p className="text-muted-foreground leading-relaxed p-3 bg-gray-50 rounded border">
                                  {hint}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No hints available for this challenge.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="files" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      {challenge.files && challenge.files.length > 0 ? (
                        <div className="space-y-3">
                          {challenge.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                {file.type === 'file' ? (
                                  <FileText className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Link className="w-5 h-5 text-green-600" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{file.name}</p>
                                  {file.type === 'link' && (
                                    <a 
                                      href={file.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline break-all"
                                    >
                                      {file.url}
                                    </a>
                                  )}
                                </div>
                              </div>
                              {file.type === 'file' && (
                                <Button variant="outline" size="sm">
                                  Download
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No files or links available for this challenge.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Flag Submission */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flag className="w-5 h-5" />
                    Submit Flag
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {message && (
                    <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                      {message.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {message.text}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isSolved ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="flag" className="text-sm font-medium">Enter Flag</Label>
                        <Input
                          id="flag"
                          placeholder="CTF{...} or flag content"
                          value={flagInput}
                          onChange={(e) => setFlagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && submitFlag()}
                          className="font-mono"
                        />
                      </div>
                      <Button 
                        onClick={submitFlag} 
                        disabled={submitting || !flagInput.trim()}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? "Submitting..." : "Submit Flag"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-semibold text-lg">Challenge Solved!</p>
                      <p className="text-green-700 text-sm mt-1">
                        You earned {challenge.totalPoints || challenge.points} points
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submission History */}
              {submissions.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Submission History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {submission.isCorrect ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <code className="text-sm truncate font-mono">{submission.flag}</code>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {submission.submittedAt?.toDate?.()?.toLocaleTimeString() || 
                             new Date(submission.submittedAt).toLocaleTimeString()}
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