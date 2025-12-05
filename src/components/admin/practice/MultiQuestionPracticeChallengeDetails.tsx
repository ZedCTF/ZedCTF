// src/components/practice/MultiQuestionPracticeChallengeDetails.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, updateDoc, arrayUnion, increment, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuthContext } from "../../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, ArrowLeft, Flag, Users, Clock, Star, FileText, Link, 
  CheckCircle, XCircle, Copy, ExternalLink, Lightbulb, Eye, EyeOff 
} from "lucide-react";
import Navbar from "../../Navbar";
import Footer from "../../Footer";

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
  questionIndex?: number;
  questionId?: string;
  questionPoints?: number;
}

interface QuestionState {
  index: number;
  flagInput: string;
  isSubmitting: boolean;
  showHints: boolean[];
  isSolved: boolean;
  pointsEarned: number;
  submissions: Submission[];
}

const MultiQuestionPracticeChallengeDetails = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string, questionIndex?: number } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  const [activeTab, setActiveTab] = useState("description");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showChallengeHints, setShowChallengeHints] = useState<boolean[]>([]);

  useEffect(() => {
    if (challengeId) {
      fetchChallenge();
      fetchSubmissions();
      
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

  useEffect(() => {
    // Initialize question states when challenge loads
    if (challenge?.hasMultipleQuestions && challenge.questions) {
      const initialQuestionStates: QuestionState[] = challenge.questions.map((_, index) => ({
        index,
        flagInput: "",
        isSubmitting: false,
        showHints: new Array(challenge.questions?.[index]?.hints?.length || 0).fill(false),
        isSolved: false,
        pointsEarned: 0,
        submissions: []
      }));
      setQuestionStates(initialQuestionStates);
      
      // Initialize challenge hints visibility
      if (challenge.hints) {
        setShowChallengeHints(new Array(challenge.hints.length).fill(false));
      }
    }
  }, [challenge]);

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

      setAllSubmissions(submissionsData);
      
      // Update question states with their submissions
      if (challenge?.hasMultipleQuestions && challenge.questions) {
        setQuestionStates(prev => prev.map((qState, index) => {
          const question = challenge.questions?.[index];
          const questionSubmissions = submissionsData.filter(sub => 
            (sub.questionIndex === index) || 
            (sub.questionId === question?.id) ||
            (sub.flag === question?.flag)
          );
          
          const isSolved = questionSubmissions.some(sub => sub.isCorrect);
          const pointsEarned = questionSubmissions
            .filter(sub => sub.isCorrect && sub.pointsAwarded)
            .reduce((sum, sub) => sum + (sub.pointsAwarded || 0), 0);
          
          return {
            ...qState,
            isSolved,
            pointsEarned,
            submissions: questionSubmissions
          };
        }));
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const submitFlag = async (questionIndex: number) => {
    if (!challenge || !user) return;
    
    const questionState = questionStates[questionIndex];
    const flagInput = questionState.flagInput;
    
    if (!flagInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter a flag', questionIndex });
      return;
    }

    // Update submitting state for this specific question
    setQuestionStates(prev => prev.map((q, idx) => 
      idx === questionIndex ? { ...q, isSubmitting: true } : q
    ));
    setMessage(null);

    try {
      const question = challenge.questions?.[questionIndex];
      if (!question) {
        throw new Error("Question not found");
      }

      // Check if flag matches
      const isCorrect = question.flag?.trim() === flagInput.trim();
      
      let pointsToAward = 0;
      if (isCorrect) {
        // Check if user has already solved this specific question
        const existingCorrectSubmission = allSubmissions.find(
          sub => sub.isCorrect && 
          ((sub.questionIndex === questionIndex) || 
           (sub.questionId === question.id) ||
           (sub.flag === question.flag))
        );
        
        if (!existingCorrectSubmission) {
          pointsToAward = question.points || 0;
        }
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
        username: user.displayName || user.email?.split('@')[0] || 'User',
        questionIndex: questionIndex,
        questionId: question.id,
        questionPoints: question.points
      };

      await addDoc(collection(db, "submissions"), submissionData);

      if (isCorrect) {
        // Update challenge solvedBy array if not already included
        if (!challenge.solvedBy?.includes(user.uid)) {
          await updateDoc(doc(db, "challenges", challenge.id), {
            solvedBy: arrayUnion(user.uid)
          });
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
            ? `Question ${questionIndex + 1} solved! +${pointsToAward} points!`
            : `Question ${questionIndex + 1} solved! (Already solved)`,
          questionIndex
        });
        
        // Clear input for this question
        setQuestionStates(prev => prev.map((q, idx) => 
          idx === questionIndex ? { 
            ...q, 
            flagInput: "", 
            isSolved: true,
            pointsEarned: pointsToAward > 0 ? pointsToAward : q.pointsEarned
          } : q
        ));
        
        // Refresh submissions
        fetchSubmissions();
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Incorrect flag. Please try again.',
          questionIndex 
        });
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to submit flag. Please try again.',
        questionIndex 
      });
    } finally {
      // Reset submitting state for this question
      setQuestionStates(prev => prev.map((q, idx) => 
        idx === questionIndex ? { ...q, isSubmitting: false } : q
      ));
    }
  };

  const updateQuestionFlagInput = (questionIndex: number, value: string) => {
    setQuestionStates(prev => prev.map((q, idx) => 
      idx === questionIndex ? { ...q, flagInput: value } : q
    ));
  };

  const toggleQuestionHint = (questionIndex: number, hintIndex: number) => {
    setQuestionStates(prev => prev.map((q, idx) => {
      if (idx === questionIndex) {
        const newShowHints = [...q.showHints];
        newShowHints[hintIndex] = !newShowHints[hintIndex];
        return { ...q, showHints: newShowHints };
      }
      return q;
    }));
  };

  const toggleChallengeHint = (hintIndex: number) => {
    const newShowHints = [...showChallengeHints];
    newShowHints[hintIndex] = !newShowHints[hintIndex];
    setShowChallengeHints(newShowHints);
  };

  const navigateToPractice = () => {
    navigate("/practice");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Calculate progress for multi-question challenges
  const questionProgress = challenge?.hasMultipleQuestions 
    ? {
        solved: questionStates.filter(q => q.isSolved).length,
        total: challenge.questions?.length || 0,
        percentage: challenge.questions ? 
          (questionStates.filter(q => q.isSolved).length / challenge.questions.length) * 100 : 0
      }
    : null;

  // Calculate total points earned
  const totalPointsEarned = questionStates.reduce((sum, q) => sum + q.pointsEarned, 0);

  // Check if user has solved the entire challenge
  const isFullySolved = questionProgress?.solved === questionProgress?.total;

  // Function to format date properly
  const formatDate = (date: any) => {
    if (!date) return 'Unknown date';
    
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading multi-question challenge...</p>
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
              {questionProgress && (
                <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {questionProgress.solved}/{questionProgress.total} Questions
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

          {/* Challenge Info */}
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
                {questionProgress && (
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

          {/* Question Selector */}
          <Card className="mb-4 border">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-1">
                {challenge.questions?.map((question, index) => {
                  const qState = questionStates[index] || {
                    isSolved: false,
                    pointsEarned: 0
                  };
                  
                  return (
                    <Button
                      key={index}
                      variant={activeQuestionIndex === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setActiveQuestionIndex(index);
                        setActiveTab("question");
                      }}
                      className={`h-8 px-2 sm:px-3 ${
                        qState.isSolved 
                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs">Q{index + 1}</span>
                        {qState.isSolved && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Main Content - Full width on mobile */}
            <div className="lg:col-span-2 space-y-4">
              {/* Mobile-optimized tabs */}
              <div className="w-full">
                {/* Tabs Header */}
                <div className="flex overflow-x-auto scrollbar-hide mb-4 bg-muted/30 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("description")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "description" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Challenge Description
                  </button>
                  <button
                    onClick={() => setActiveTab("question")}
                    className={`flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeTab === "question" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Question {activeQuestionIndex + 1}
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
                    Files ({(challenge.questions?.[activeQuestionIndex]?.files?.length || 0) + (challenge.files?.length || 0)})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {/* Challenge Description Tab */}
                  {activeTab === "description" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3 break-words">
                          <h3 className="font-bold text-lg mb-4">Challenge Description</h3>
                          
                          <div className="prose prose-sm max-w-none">
                            {challenge.description.split('\n').map((line, i) => (
                              <p key={i} className="mb-2 text-sm leading-relaxed break-words">
                                {line}
                              </p>
                            ))}
                          </div>
                          
                          {challenge.flagFormat && (
                            <div className="p-3 bg-blue-500/10 border border-blue-200 rounded text-xs">
                              <p className="text-blue-600 break-words">
                                <strong>Overall Challenge Flag Format:</strong> {challenge.flagFormat}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Question Tab */}
                  {activeTab === "question" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3 break-words">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Question {activeQuestionIndex + 1}</h3>
                            <Badge variant="outline" className="font-mono font-semibold">
                              {challenge.questions?.[activeQuestionIndex]?.points || 0} pts
                            </Badge>
                          </div>
                          
                          <div className="prose prose-sm max-w-none">
                            {challenge.questions?.[activeQuestionIndex]?.question?.split('\n').map((line, i) => (
                              <p key={i} className="mb-2 text-sm leading-relaxed break-words">
                                {line}
                              </p>
                            ))}
                          </div>
                          
                          {challenge.questions?.[activeQuestionIndex]?.flagFormat && (
                            <div className="p-3 bg-blue-500/10 border border-blue-200 rounded text-xs">
                              <p className="text-blue-600 break-words">
                                <strong>Flag Format for Question {activeQuestionIndex + 1}:</strong> {challenge.questions[activeQuestionIndex].flagFormat}
                              </p>
                            </div>
                          )}
                          
                          {/* Show flag if question is solved */}
                          {questionStates[activeQuestionIndex]?.isSolved && challenge.questions?.[activeQuestionIndex]?.flag && (
                            <div className="p-3 bg-green-500/10 border border-green-200 rounded break-words">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-green-600 font-mono break-all flex-1">
                                  <strong>Flag:</strong> {challenge.questions[activeQuestionIndex].flag}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(challenge.questions![activeQuestionIndex].flag!)}
                                  className="h-6 px-2 flex-shrink-0"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Challenge Hints Tab */}
                  {activeTab === "hints" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                          {/* Challenge Hints */}
                          {challenge.hints && challenge.hints.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-3">Challenge Hints</h4>
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
                                            <span className="font-semibold text-sm">Challenge Hint {index + 1}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleChallengeHint(index)}
                                              className="h-6 px-2 text-xs"
                                            >
                                              {showChallengeHints[index] ? (
                                                <>
                                                  <EyeOff className="w-3 h-3 mr-1" />
                                                  Hide
                                                </>
                                              ) : (
                                                <>
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Reveal
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                          {showChallengeHints[index] && (
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
                            </div>
                          )}
                          
                          {/* Question Hints */}
                          {challenge.questions?.[activeQuestionIndex]?.hints && challenge.questions[activeQuestionIndex].hints.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-3">Question {activeQuestionIndex + 1} Hints</h4>
                              <div className="space-y-3">
                                {challenge.questions[activeQuestionIndex].hints.map((hint, index) => (
                                  <Card key={index} className="border">
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                          <Lightbulb className="w-3 h-3 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-sm">Question Hint {index + 1}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleQuestionHint(activeQuestionIndex, index)}
                                              className="h-6 px-2 text-xs"
                                            >
                                              {questionStates[activeQuestionIndex]?.showHints?.[index] ? (
                                                <>
                                                  <EyeOff className="w-3 h-3 mr-1" />
                                                  Hide
                                                </>
                                              ) : (
                                                <>
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Reveal
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                          {questionStates[activeQuestionIndex]?.showHints?.[index] && (
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
                            </div>
                          )}
                          
                          {(!challenge.hints || challenge.hints.length === 0) && 
                           (!challenge.questions?.[activeQuestionIndex]?.hints || challenge.questions[activeQuestionIndex].hints.length === 0) && (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">No hints available.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Files Tab */}
                  {activeTab === "files" && (
                    <Card className="border">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                          {/* Challenge Files */}
                          {challenge.files && challenge.files.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Challenge Files</h4>
                              <div className="space-y-2">
                                {challenge.files.map((file, index) => (
                                  <a
                                    key={`challenge-${index}`}
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
                            </div>
                          )}
                          
                          {/* Question Files */}
                          {challenge.questions?.[activeQuestionIndex]?.files && challenge.questions[activeQuestionIndex].files.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Question {activeQuestionIndex + 1} Files</h4>
                              <div className="space-y-2">
                                {challenge.questions[activeQuestionIndex].files.map((file, index) => (
                                  <a
                                    key={`question-${index}`}
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
                            </div>
                          )}
                          
                          {(!challenge.files || challenge.files.length === 0) && 
                           (!challenge.questions?.[activeQuestionIndex]?.files || challenge.questions[activeQuestionIndex].files.length === 0) && (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">No files or links available.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Flag Submission */}
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flag className="w-4 h-4" />
                    Submit Flag
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {message?.questionIndex === activeQuestionIndex && (
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

                  {!questionStates[activeQuestionIndex]?.isSolved ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="flag" className="text-xs font-medium">Enter Flag for Question {activeQuestionIndex + 1}</Label>
                        <Input
                          id="flag"
                          placeholder={challenge.questions?.[activeQuestionIndex]?.flagFormat || "Enter flag..."}
                          value={questionStates[activeQuestionIndex]?.flagInput || ""}
                          onChange={(e) => updateQuestionFlagInput(activeQuestionIndex, e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && submitFlag(activeQuestionIndex)}
                          className="font-mono text-sm h-9"
                        />
                      </div>
                      <Button 
                        onClick={() => submitFlag(activeQuestionIndex)} 
                        disabled={questionStates[activeQuestionIndex]?.isSubmitting || !questionStates[activeQuestionIndex]?.flagInput?.trim()}
                        className="w-full h-9"
                        variant="terminal"
                      >
                        {questionStates[activeQuestionIndex]?.isSubmitting ? (
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
                      <p className="text-green-600 font-semibold text-sm">Question Solved!</p>
                      {questionStates[activeQuestionIndex]?.pointsEarned > 0 && (
                        <p className="text-green-600 text-xs mt-1">
                          +{questionStates[activeQuestionIndex].pointsEarned} points earned
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress Summary */}
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Progress Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Questions Solved</span>
                      <span className="font-semibold">{questionProgress?.solved || 0}/{questionProgress?.total || 0}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${questionProgress?.percentage || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points Earned</span>
                      <span className="font-semibold">{totalPointsEarned}/{challenge.totalPoints || challenge.points}</span>
                    </div>
                    {isFullySolved && (
                      <div className="text-center p-2 bg-green-500/10 border border-green-200 rounded mt-2">
                        <p className="text-green-600 font-semibold text-xs">All Questions Solved! 🎉</p>
                        <p className="text-green-600 text-xs mt-1">
                          Total: +{totalPointsEarned} points
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Submission History */}
              {questionStates[activeQuestionIndex]?.submissions && questionStates[activeQuestionIndex].submissions.length > 0 && (
                <Card className="border">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Submission History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {questionStates[activeQuestionIndex].submissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-2 border rounded text-xs">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {submission.isCorrect ? (
                              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                            )}
                            <code className="truncate font-mono text-xs">{submission.flag}</code>
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

export default MultiQuestionPracticeChallengeDetails;