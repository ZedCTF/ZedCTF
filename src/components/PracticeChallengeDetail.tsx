import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, updateDoc, arrayUnion, increment, onSnapshot } from "firebase/firestore";
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
  challengeType?: 'practice';
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
  questionId?: string;
  questionIndex?: number;
}

const PracticeChallengeDetails = () => {
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (challengeId) {
      fetchChallenge();
      fetchSubmissions();
      
      // Real-time listener for challenge updates (solves count)
      const challengeRef = doc(db, "challenges", challengeId);
      const unsubscribe = onSnapshot(challengeRef, (doc) => {
        if (doc.exists()) {
          const challengeData = {
            id: doc.id,
            ...doc.data()
          } as Challenge;
          setChallenge(challengeData);
        }
      });
      
      return () => unsubscribe();
    }
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching challenge:", challengeId);
      
      const challengeDoc = await getDoc(doc(db, "challenges", challengeId!));
      
      if (challengeDoc.exists()) {
        const challengeData = {
          id: challengeDoc.id,
          ...challengeDoc.data()
        } as Challenge;
        console.log("✅ Challenge found:", challengeData);
        setChallenge(challengeData);
        
        // Initialize hints visibility
        if (challengeData.hints) {
          setShowHints(new Array(challengeData.hints.length).fill(false));
        }
      } else {
        console.log("❌ Challenge not found in Firestore");
        setMessage({ type: 'error', text: 'Challenge not found' });
      }
    } catch (error) {
      console.error("💥 Error fetching challenge:", error);
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
      
      // Extract solved question IDs for multi-question challenges
      if (challenge?.hasMultipleQuestions) {
        const solvedQuestionIds = submissionsData
          .filter(sub => sub.isCorrect && sub.questionId)
          .map(sub => sub.questionId)
          .filter(Boolean) as string[];
        
        setSolvedQuestions(solvedQuestionIds);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  // Check if user has already solved this challenge and received points
  const hasUserSolvedAndReceivedPoints = async (userId: string, challengeId: string): Promise<boolean> => {
    try {
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("challengeId", "==", challengeId),
        where("userId", "==", userId),
        where("isCorrect", "==", true),
        where("pointsAwarded", ">", 0)
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      return !submissionsSnapshot.empty;
    } catch (error) {
      console.error("Error checking user solve status:", error);
      return false;
    }
  };

  const submitFlag = async () => {
    if (!challenge || !user || !flagInput.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      let isCorrect = false;
      let matchedQuestionId = null;
      let questionPoints = 0;
      
      // Check if it's a multi-question challenge
      if (challenge.hasMultipleQuestions && challenge.questions) {
        // For multi-question challenges, check each question's flag
        const matchedQuestion = challenge.questions.find(q => 
          q.flag && q.flag.trim() === flagInput.trim()
        );
        
        isCorrect = !!matchedQuestion;
        if (matchedQuestion) {
          matchedQuestionId = matchedQuestion.id;
          questionPoints = matchedQuestion.points || 0;
        }
      } else {
        // For single flag challenges
        isCorrect = challenge.flag?.trim() === flagInput.trim();
      }

      // Check if user has already solved this specific question (for multi-question)
      const alreadySolved = matchedQuestionId 
        ? solvedQuestions.includes(matchedQuestionId)
        : await hasUserSolvedAndReceivedPoints(user.uid, challenge.id);
      
      // Determine points to award
      let pointsToAward = 0;
      if (isCorrect && !alreadySolved) {
        pointsToAward = matchedQuestionId ? questionPoints : (challenge.points || 0);
      }

      // Record submission
      const submissionData: any = {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        userId: user.uid,
        userName: user.displayName || user.email,
        flag: flagInput,
        isCorrect: isCorrect,
        submittedAt: new Date(),
        pointsAwarded: pointsToAward,
        points: pointsToAward,
        username: user.displayName || user.email?.split('@')[0] || 'User'
      };

      // Add question-specific data for multi-question challenges
      if (matchedQuestionId) {
        submissionData.questionId = matchedQuestionId;
        submissionData.questionIndex = challenge.questions?.findIndex(q => q.id === matchedQuestionId);
      }

      await addDoc(collection(db, "submissions"), submissionData);

      if (isCorrect) {
        if (matchedQuestionId) {
          // Update solved questions state
          if (!solvedQuestions.includes(matchedQuestionId)) {
            setSolvedQuestions([...solvedQuestions, matchedQuestionId]);
          }
        } else {
          // Update challenge solvedBy array for single-question challenge
          if (!challenge.solvedBy?.includes(user.uid)) {
            await updateDoc(doc(db, "challenges", challenge.id), {
              solvedBy: arrayUnion(user.uid)
            });
          }
        }

        // Update user's total points if this is their first solve
        if (pointsToAward > 0) {
          await updateDoc(doc(db, "users", user.uid), {
            totalPoints: increment(pointsToAward),
            challengesSolved: arrayUnion(challenge.id)
          });
        }

        setMessage({ 
          type: 'success', 
          text: pointsToAward > 0 
            ? `Congratulations! Flag is correct! +${pointsToAward} points awarded!`
            : 'Congratulations! Flag is correct! (Already solved)'
        });
        setFlagInput("");
        
        // Refresh submissions
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
    navigate("/practice");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const isSolved = challenge?.solvedBy?.includes(user?.uid || '');
  
  // For multi-question challenges, check if all questions are solved
  const isAllQuestionsSolved = challenge?.hasMultipleQuestions && 
    challenge.questions?.every(q => solvedQuestions.includes(q.id));

  // Function to format date properly
  const formatDate = (date: any) => {
    if (!date) return 'Unknown date';
    
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      // Format as "Nov 26, 2024" (current year)
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
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

  // Calculate if user received points for this solve
  const userReceivedPoints = submissions.some(sub => sub.isCorrect && sub.pointsAwarded && sub.pointsAwarded > 0);

  // Calculate total points earned for multi-question challenges
  const totalPointsEarned = challenge?.hasMultipleQuestions 
    ? submissions
        .filter(sub => sub.isCorrect && sub.pointsAwarded)
        .reduce((sum, sub) => sum + (sub.pointsAwarded || 0), 0)
    : (userReceivedPoints ? (challenge?.points || 0) : 0);

  // Calculate progress for multi-question challenges
  const questionProgress = challenge?.hasMultipleQuestions 
    ? {
        solved: solvedQuestions.length,
        total: challenge.questions?.length || 0,
        percentage: challenge.questions ? (solvedQuestions.length / challenge.questions.length) * 100 : 0
      }
    : null;

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
                  The challenge you're looking for doesn't exist or you don't have permission to view it.
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Mobile-optimized header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={navigateToPractice} 
                size="sm" 
                className="h-8 px-2 sm:px-3 -ml-2"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Back to Practice</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{challenge.title}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {isSolved && !challenge.hasMultipleQuestions && (
                <Badge className="bg-green-500/20 text-green-600 border-green-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {userReceivedPoints ? 'Solved + Points' : 'Solved'}
                </Badge>
              )}
              {challenge.hasMultipleQuestions && questionProgress && (
                <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {questionProgress.solved}/{questionProgress.total} Solved
                </Badge>
              )}
              {challenge.featuredOnPractice && (
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-200 text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>

          {/* Mobile-optimized challenge info */}
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
                {challenge.hasMultipleQuestions && questionProgress && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                    {totalPointsEarned}/{challenge.totalPoints || challenge.points} pts earned
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{challenge.solvedBy?.length || 0} solves</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(challenge.createdAt)}</span>
                </div>
              </div>
              
              {/* Creator info - stacked on mobile */}
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

          {/* Mobile-optimized main content - Stack tabs vertically on mobile */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Main Content - Full width on mobile */}
            <div className="lg:col-span-2 space-y-4">
              {/* Mobile-optimized tabs with better spacing */}
              <div className="w-full">
                {/* Tabs Header - Horizontal scroll on mobile if needed */}
                <div className="flex overflow-x-auto scrollbar-hide mb-4 bg-muted/30 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("description")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "description" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab("hints")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "hints" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Hints ({challenge.hints?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("files")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "files" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Files ({(challenge.files?.length || 0)})
                  </button>
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
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Questions</h3>
                                {questionProgress && (
                                  <Badge variant="outline" className="text-xs">
                                    {questionProgress.solved}/{questionProgress.total} Solved
                                  </Badge>
                                )}
                              </div>
                              {challenge.questions.map((question, index) => {
                                const isQuestionSolved = solvedQuestions.includes(question.id);
                                
                                return (
                                  <div key={question.id} className="border rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-sm">Question {index + 1}</h4>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {question.points} points
                                      </Badge>
                                    </div>
                                    <p className="mb-3 text-sm text-muted-foreground break-words">{question.question}</p>
                                    
                                    {question.flagFormat && (
                                      <div className="mb-2 p-2 bg-blue-500/10 border border-blue-200 rounded text-xs">
                                        <p className="text-blue-600 break-words">
                                          <strong>Flag Format:</strong> {question.flagFormat}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {isQuestionSolved ? (
                                      <div className="p-2 bg-green-500/10 border border-green-200 rounded">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-green-600 font-semibold">✓ Solved</span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-xs">
                                              Flag: {question.flag}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => copyToClipboard(question.flag)}
                                              className="h-6 px-2"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="space-y-1">
                                          <Label htmlFor={`flag-${index}`} className="text-xs">Answer for Question {index + 1}</Label>
                                          <Input
                                            id={`flag-${index}`}
                                            placeholder={question.flagFormat || "Enter flag..."}
                                            value={currentQuestionIndex === index ? flagInput : ''}
                                            onChange={(e) => {
                                              setFlagInput(e.target.value);
                                              setCurrentQuestionIndex(index);
                                            }}
                                            onKeyPress={(e) => e.key === 'Enter' && submitFlag()}
                                            className="font-mono text-sm h-8"
                                          />
                                        </div>
                                        <Button 
                                          onClick={submitFlag}
                                          disabled={submitting || !flagInput.trim() || currentQuestionIndex !== index}
                                          className="w-full h-8 text-xs"
                                          variant="terminal"
                                        >
                                          {submitting && currentQuestionIndex === index ? (
                                            <>
                                              <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-2"></div>
                                              Checking...
                                            </>
                                          ) : (
                                            <>
                                              <Flag className="w-3 h-3 mr-1" />
                                              Submit Answer
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-3 break-words">
                              {renderChallengeContent()}
                              
                              {challenge.flagFormat && (
                                <div className="p-3 bg-blue-500/10 border border-blue-200 rounded text-xs">
                                  <p className="text-blue-600 break-words">
                                    <strong>Flag Format:</strong> {challenge.flagFormat}
                                  </p>
                                </div>
                              )}
                              
                              {isSolved && challenge.flag && (
                                <div className="p-3 bg-green-500/10 border border-green-200 rounded break-words">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-green-600 font-mono break-all flex-1">
                                      <strong>Flag:</strong> {challenge.flag}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(challenge.flag!)}
                                      className="h-6 px-2 flex-shrink-0"
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
                  )}

                  {/* Hints Tab */}
                  {activeTab === "hints" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        {challenge.hints && challenge.hints.length > 0 ? (
                          <div className="space-y-3">
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
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleHint(index)}
                                          className="h-6 px-2 text-xs"
                                        >
                                          {showHints[index] ? 'Hide' : 'Reveal'}
                                        </Button>
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
                            <p className="text-sm text-muted-foreground">No hints available.</p>
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
                            {challenge.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 text-sm border rounded hover:bg-accent transition-colors"
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
                </div>
              </div>
            </div>

            {/* Sidebar - Full width on mobile, sticky on desktop */}
            <div className="space-y-4">
              {/* Flag Submission - Only show for single-question challenges */}
              {!challenge.hasMultipleQuestions && (
                <Card className="border lg:sticky lg:top-4">
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
                          {userReceivedPoints 
                            ? `+${challenge.totalPoints || challenge.points} points awarded`
                            : 'Already solved - no additional points'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Progress Summary for Multi-Question Challenges */}
              {challenge.hasMultipleQuestions && questionProgress && (
                <Card className="border lg:sticky lg:top-4">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="w-4 h-4" />
                      Progress Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Questions Solved</span>
                        <span className="font-semibold">{questionProgress.solved}/{questionProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${questionProgress.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Points Earned</span>
                        <span className="font-semibold">{totalPointsEarned}/{challenge.totalPoints || challenge.points}</span>
                      </div>
                      {isAllQuestionsSolved && (
                        <div className="text-center p-2 bg-green-500/10 border border-green-200 rounded">
                          <p className="text-green-600 font-semibold text-xs">All Questions Solved! 🎉</p>
                          <p className="text-green-600 text-xs mt-1">
                            Total: +{totalPointsEarned} points
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submission History - Mobile optimized */}
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
                            <div className="min-w-0 flex-1">
                              <code className="truncate font-mono text-xs block">{submission.flag}</code>
                              {submission.questionIndex !== undefined && (
                                <span className="text-xs text-muted-foreground">Q{submission.questionIndex + 1}</span>
                              )}
                            </div>
                            {submission.pointsAwarded && submission.pointsAwarded > 0 && (
                              <Badge variant="outline" className="ml-1 text-xs bg-green-500/10 text-green-600">
                                +{submission.pointsAwarded}
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground flex-shrink-0 ml-1 text-xs">
                            {submission.submittedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 
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

export default PracticeChallengeDetails;