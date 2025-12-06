import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, arrayUnion, increment, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useAdminContext } from "../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Calendar, Users, Zap, Clock, MapPin, Trophy, Shield, ArrowLeft, CheckCircle, XCircle, Crown, UserPlus, Lock, Eye, Award, BookOpen, Settings, Edit, Medal, RotateCcw } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  solvedBy?: string[];
  isActive: boolean;
  eventId?: string;
  challengeType?: 'practice' | 'live' | 'past_event' | 'upcoming';
  finalCategory?: string;
  flag?: string;
  hasMultipleQuestions?: boolean;
  questions?: any[];
}

interface UserScore {
  userId: string;
  username: string;
  score: number;
  solvedChallenges: number;
  rank: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const LiveEventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin, isModerator } = useAdminContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solvedChallenges, setSolvedChallenges] = useState<Set<string>>(new Set());
  const [eventSolvedChallenges, setEventSolvedChallenges] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [processingSolve, setProcessingSolve] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      console.log("❌ No eventId in URL parameters");
      setMessage({ type: 'error', text: 'Invalid event URL' });
      setLoading(false);
      return;
    }

    console.log("🎯 Loading live event:", eventId);
    
    const fetchData = async () => {
      await fetchEventData();
      await fetchEventChallenges();
      await fetchSolvedChallenges();
      await fetchEventSolvedChallenges();
      await fetchLeaderboard();
    };

    fetchData();
    
    // Real-time listener for event updates
    const eventRef = doc(db, "events", eventId);
    const unsubscribeEvent = onSnapshot(eventRef, 
      (doc) => {
        if (doc.exists()) {
          const eventData = {
            id: doc.id,
            ...doc.data()
          } as Event;
          console.log("📡 Real-time event update:", eventData);
          setEvent(eventData);
          
          if (user) {
            const userRegistered = 
              eventData.participants?.includes(user.uid) || 
              eventData.registeredUsers?.includes(user.uid);
            setIsRegistered(!!userRegistered);
            
            const isOwner = eventData.createdById === user.uid;
            const hasAdminAccess = isAdmin || isModerator;
            setIsEventOwner(isOwner || hasAdminAccess);
          }
        }
      },
      (error) => {
        console.error("💥 Real-time event listener error:", error);
      }
    );

    // Real-time listener for leaderboard updates
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("eventId", "==", eventId),
      where("isCorrect", "==", true)
    );
    
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, 
      () => {
        console.log("📡 Real-time submissions update - refreshing leaderboard");
        fetchLeaderboard();
        fetchEventSolvedChallenges();
      },
      (error) => {
        console.error("💥 Real-time submissions listener error:", error);
      }
    );
    
    return () => {
      unsubscribeEvent();
      unsubscribeSubmissions();
    };
  }, [eventId, user, isAdmin, isModerator]);

  // Countdown timer for live event
  useEffect(() => {
    if (!event) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(event.endDate).getTime();
      
      const difference = end - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [event]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const eventRef = doc(db, "events", eventId!);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
        setEvent(eventData);
        
        if (user) {
          const userRegistered = 
            eventData.participants?.includes(user.uid) || 
            eventData.registeredUsers?.includes(user.uid);
          setIsRegistered(!!userRegistered);
          
          const isOwner = eventData.createdById === user.uid;
          const hasAdminAccess = isAdmin || isModerator;
          setIsEventOwner(isOwner || hasAdminAccess);
        }
      } else {
        setMessage({ type: 'error', text: 'Event not found' });
      }
    } catch (error: any) {
      console.error("💥 Error fetching event:", error);
      setMessage({ type: 'error', text: `Failed to load event: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventChallenges = async () => {
    if (!eventId) return;

    try {
      console.log("🔍 Fetching challenges for event:", eventId);
      
      let challengesData: Challenge[] = [];

      // Query for active challenges
      try {
        const challengesQuery = query(
          collection(db, "challenges"),
          where("eventId", "==", eventId),
          where("isActive", "==", true),
          orderBy("points", "asc")
        );
        const challengesSnapshot = await getDocs(challengesQuery);
        
        challengesSnapshot.forEach(doc => {
          const data = doc.data();
          challengesData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            category: data.finalCategory || data.category,
            points: data.points,
            difficulty: data.difficulty,
            solvedBy: data.solvedBy,
            isActive: data.isActive,
            eventId: data.eventId,
            challengeType: data.challengeType,
            flag: data.flag,
            hasMultipleQuestions: data.hasMultipleQuestions || false,
            questions: data.questions || []
          });
        });
        console.log("✅ Found active challenges:", challengesData.length);
      } catch (queryError) {
        console.log("❌ Active challenges query failed:", queryError);
      }

      // If admin/owner, try to fetch all challenges
      if ((isAdmin || isModerator || isEventOwner) && challengesData.length === 0) {
        try {
          const allChallengesQuery = query(
            collection(db, "challenges"),
            where("eventId", "==", eventId),
            orderBy("points", "asc")
          );
          const allChallengesSnapshot = await getDocs(allChallengesQuery);
          
          const adminChallenges: Challenge[] = [];
          allChallengesSnapshot.forEach(doc => {
            const data = doc.data();
            adminChallenges.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              category: data.finalCategory || data.category,
              points: data.points,
              difficulty: data.difficulty,
              solvedBy: data.solvedBy,
              isActive: data.isActive,
              eventId: data.eventId,
              challengeType: data.challengeType,
              flag: data.flag,
              hasMultipleQuestions: data.hasMultipleQuestions || false,
              questions: data.questions || []
            });
          });
          console.log("👑 Admin found challenges:", adminChallenges.length);
          challengesData = adminChallenges;
        } catch (adminError) {
          console.log("❌ Admin challenges query failed:", adminError);
        }
      }

      setChallenges(challengesData);
      setChallengesLoaded(true);

      // Set up real-time listener for challenges
      setupChallengesListener();

    } catch (error) {
      console.error("❌ Error fetching challenges:", error);
      setChallenges([]);
      setChallengesLoaded(true);
    }
  };

  const fetchSolvedChallenges = async () => {
    if (!user || !eventId) return;

    try {
      console.log("🔍 Fetching ALL solved challenges for user (including practice):", user.uid);
      
      // Get ALL challenges that belong to this event
      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId)
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      const eventChallengeIds = new Set<string>();
      
      challengesSnapshot.forEach(doc => {
        eventChallengeIds.add(doc.id);
      });
      
      console.log("🎯 Challenges in event:", Array.from(eventChallengeIds));

      // Get ALL correct submissions by this user - INCLUDING PRACTICE SOLVES
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("userId", "==", user.uid),
        where("isCorrect", "==", true)
      );
      
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const solvedIds = new Set<string>();
      
      console.log("📊 All correct submissions found:", submissionsSnapshot.size);

      // Check each submission to see if it's for a challenge in this event
      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const challengeId = submission.challengeId;
        
        if (challengeId && eventChallengeIds.has(challengeId)) {
          console.log(`✅ Found solved challenge in event: ${challengeId}`);
          solvedIds.add(challengeId);
        }
      });

      console.log("✅ User has solved challenges in this event:", Array.from(solvedIds));
      setSolvedChallenges(solvedIds);
    } catch (error) {
      console.error("❌ Error fetching solved challenges:", error);
    }
  };

  const fetchEventSolvedChallenges = async () => {
    if (!user || !eventId) return;

    try {
      console.log("🔍 Fetching event-specific solved challenges for user:", user.uid);
      
      // Get event-specific submissions
      const eventSubmissionsQuery = query(
        collection(db, "submissions"),
        where("userId", "==", user.uid),
        where("eventId", "==", eventId),
        where("isCorrect", "==", true)
      );
      
      const eventSubmissionsSnapshot = await getDocs(eventSubmissionsQuery);
      const eventSolvedIds = new Set<string>();
      const challengeQuestionCounts: Record<string, Set<number>> = {};
      
      console.log("📊 Event-specific correct submissions found:", eventSubmissionsSnapshot.size);

      eventSubmissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const challengeId = submission.challengeId;
        const questionIndex = submission.questionIndex;
        
        if (challengeId) {
          if (questionIndex !== undefined && questionIndex !== null) {
            // This is a question submission for a multi-question challenge
            if (!challengeQuestionCounts[challengeId]) {
              challengeQuestionCounts[challengeId] = new Set<number>();
            }
            challengeQuestionCounts[challengeId].add(questionIndex);
          } else {
            // This is a regular single-question challenge or overall completion
            console.log(`✅ Found event-specific solved challenge: ${challengeId}`);
            eventSolvedIds.add(challengeId);
          }
        }
      });

      // Check multi-question challenges to see if all questions are solved
      for (const [challengeId, solvedQuestions] of Object.entries(challengeQuestionCounts)) {
        // Get the challenge to know how many questions it has
        const challengeRef = doc(db, "challenges", challengeId);
        const challengeDoc = await getDoc(challengeRef);
        
        if (challengeDoc.exists()) {
          const challengeData = challengeDoc.data();
          const totalQuestions = challengeData.questions?.length || 0;
          
          if (totalQuestions > 0 && solvedQuestions.size >= totalQuestions) {
            console.log(`✅ Fully solved multi-question challenge: ${challengeId} (${solvedQuestions.size}/${totalQuestions} questions)`);
            eventSolvedIds.add(challengeId);
          } else {
            console.log(`🟡 Partially solved multi-question challenge: ${challengeId} (${solvedQuestions.size}/${totalQuestions} questions)`);
          }
        }
      }

      console.log("✅ User has event-specific solved challenges:", Array.from(eventSolvedIds));
      setEventSolvedChallenges(eventSolvedIds);
    } catch (error) {
      console.error("❌ Error fetching event solved challenges:", error);
    }
  };

  const setupChallengesListener = () => {
    if (!eventId) return;

    try {
      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId),
        where("isActive", "==", true)
      );
      
      const unsubscribeChallenges = onSnapshot(challengesQuery,
        (snapshot) => {
          const challengesData: Challenge[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            challengesData.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              category: data.finalCategory || data.category,
              points: data.points,
              difficulty: data.difficulty,
              solvedBy: data.solvedBy,
              isActive: data.isActive,
              eventId: data.eventId,
              challengeType: data.challengeType,
              flag: data.flag,
              hasMultipleQuestions: data.hasMultipleQuestions || false,
              questions: data.questions || []
            });
          });
          console.log("📡 Real-time challenges update:", challengesData.length);
          setChallenges(challengesData);
        },
        (error) => {
          console.error("💥 Real-time challenges listener error:", error);
        }
      );

      return unsubscribeChallenges;
    } catch (error) {
      console.error("❌ Error setting up challenges listener:", error);
    }
  };

  const fetchLeaderboard = async () => {
    if (!eventId) return;

    try {
      console.log("🏆 Fetching leaderboard for event:", eventId);
      
      // Get ALL event-specific submissions
      const eventSubmissionsQuery = query(
        collection(db, "submissions"),
        where("eventId", "==", eventId),
        where("isCorrect", "==", true)
      );
      
      const eventSubmissionsSnapshot = await getDocs(eventSubmissionsQuery);
      console.log("📊 Total correct submissions in event:", eventSubmissionsSnapshot.size);
      
      // Group submissions by user
      const userScoresMap: { [key: string]: UserScore } = {};
      const userChallengeMap: { [key: string]: Map<string, { points: number, questionIndices: Set<number> }> } = {};
      
      eventSubmissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const userId = submission.userId;
        const challengeId = submission.challengeId;
        const questionIndex = submission.questionIndex;
        const isOverallFlag = submission.isOverallFlag;
        
        if (!userId) return;
        
        // Initialize user data if not exists
        if (!userScoresMap[userId]) {
          userScoresMap[userId] = {
            userId: userId,
            username: "Loading...",
            score: 0,
            solvedChallenges: 0,
            rank: 0
          };
          userChallengeMap[userId] = new Map();
        }
        
        if (!userChallengeMap[userId].has(challengeId)) {
          userChallengeMap[userId].set(challengeId, { 
            points: 0, 
            questionIndices: new Set<number>() 
          });
        }
        
        const challengeData = userChallengeMap[userId].get(challengeId)!;
        const points = submission.pointsAwarded || submission.points || 0;
        
        // For multi-question challenges
        if (questionIndex !== undefined && questionIndex !== null) {
          // Only add points if this question hasn't been counted before
          if (!challengeData.questionIndices.has(questionIndex)) {
            challengeData.points += points;
            challengeData.questionIndices.add(questionIndex);
            console.log(`✅ ${userId} solved question ${questionIndex} of ${challengeId}: +${points}pts`);
          }
        } 
        // For overall flag submission (multi-question completion bonus or regular challenge)
        else if (isOverallFlag === true) {
          // This is the overall completion for multi-question challenge
          challengeData.points = points; // Use the overall points
          console.log(`🏆 ${userId} completed multi-question challenge ${challengeId}: +${points}pts`);
        }
        // For regular single-question challenges
        else {
          challengeData.points = points; // Just set the points
          console.log(`✅ ${userId} solved single challenge ${challengeId}: +${points}pts`);
        }
      });
      
      // Calculate total scores
      Object.keys(userScoresMap).forEach(userId => {
        let totalScore = 0;
        let solvedCount = 0;
        
        userChallengeMap[userId].forEach((challengeData, challengeId) => {
          totalScore += challengeData.points;
          solvedCount += 1; // Count each challenge as solved if it has any points
        });
        
        userScoresMap[userId].score = totalScore;
        userScoresMap[userId].solvedChallenges = solvedCount;
      });
      
      // Fetch usernames for all users
      const userIds = Object.keys(userScoresMap);
      console.log("👥 Users with submissions:", userIds);
      
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userScoresMap[userId].username = 
              userData.username || 
              userData.displayName || 
              userData.email?.split('@')[0] || 
              "User";
          }
        } catch (userError) {
          console.log("❌ Could not fetch user data for:", userId);
          userScoresMap[userId].username = "User";
        }
      }
      
      // Convert to array, sort, and assign ranks
      let leaderboardData = Object.values(userScoresMap)
        .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));
      
      console.log("🏅 Final event leaderboard:", leaderboardData);
      setLeaderboard(leaderboardData);
      
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      setLeaderboard([]);
    }
  };

  // Create event-specific submission for already solved challenges
  const solveForEvent = async (challenge: Challenge) => {
    if (!user || !eventId || !challenge.flag) return;

    // For multi-question challenges, navigate to the challenge page instead
    if (challenge.hasMultipleQuestions) {
      navigateToChallenge(challenge);
      return;
    }

    setProcessingSolve(challenge.id);
    setMessage(null);

    try {
      console.log(`🎯 Creating event submission for challenge: ${challenge.id}`);

      // Check if user already has an event-specific submission for this challenge
      const existingSubmissionQuery = query(
        collection(db, "submissions"),
        where("userId", "==", user.uid),
        where("challengeId", "==", challenge.id),
        where("eventId", "==", eventId),
        where("isCorrect", "==", true)
      );

      const existingSubmissionSnapshot = await getDocs(existingSubmissionQuery);
      
      if (!existingSubmissionSnapshot.empty) {
        setMessage({ type: 'error', text: 'You have already solved this challenge for the event.' });
        setProcessingSolve(null);
        return;
      }

      // Create event-specific submission
      const submissionData = {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        userId: user.uid,
        userName: user.displayName || user.email,
        flag: challenge.flag,
        isCorrect: true,
        submittedAt: new Date(),
        pointsAwarded: challenge.points,
        points: challenge.points,
        username: user.displayName || user.email?.split('@')[0] || 'User',
        eventId: eventId
      };

      await addDoc(collection(db, "submissions"), submissionData);

      // Update challenge solvedBy array if not already included
      if (!challenge.solvedBy?.includes(user.uid)) {
        await updateDoc(doc(db, "challenges", challenge.id), {
          solvedBy: arrayUnion(user.uid)
        });
      }

      // Update user's total points
      await updateDoc(doc(db, "users", user.uid), {
        totalPoints: increment(challenge.points),
        challengesSolved: arrayUnion(challenge.id)
      });

      setMessage({ 
        type: 'success', 
        text: `Challenge marked as solved for event! +${challenge.points} points awarded!` 
      });

      // Refresh data
      await fetchEventSolvedChallenges();
      await fetchLeaderboard();
      
    } catch (error) {
      console.error("Error creating event submission:", error);
      setMessage({ type: 'error', text: 'Failed to mark challenge as solved for event. Please try again.' });
    } finally {
      setProcessingSolve(null);
    }
  };

  const formatDateTime = (dateString: string): string => {
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

  const navigateToEvents = () => {
    navigate("/live");
  };

  // Handle navigation based on challenge type (single vs multi-question)
  const handleChallengeClick = (challenge: Challenge) => {
    if (!user) {
      setMessage({ 
        type: 'error', 
        text: 'Please log in to access challenges.' 
      });
      return;
    }
    
    // Event owners can always access challenges without registration
    if (isEventOwner) {
      navigateToChallenge(challenge);
      return;
    }
    
    // Check if user is registered (for non-event owners)
    if (!isRegistered) {
      setMessage({ 
        type: 'error', 
        text: 'You need to be registered for this event to access challenges. Please register during the upcoming event phase.' 
      });
      return;
    }
    
    // For multi-question challenges, always allow access (even if partially solved)
    if (challenge.hasMultipleQuestions) {
      navigateToChallenge(challenge);
      return;
    }
    
    // For single-question challenges, check if already solved
    const isSolvedInEvent = isChallengeSolvedInEvent(challenge.id);
    if (isSolvedInEvent) {
      setMessage({ 
        type: 'error', 
        text: 'You have already solved this challenge in the event.' 
      });
      return;
    }
    
    // Registered non-owners can access challenges
    navigateToChallenge(challenge);
  };

  // Handle navigation to appropriate challenge type
  const navigateToChallenge = (challenge: Challenge) => {
    // Check if it's a multi-question challenge
    if (challenge.hasMultipleQuestions) {
      // Route to multi-question live event component
      navigate(`/live-event/${eventId}/multi/${challenge.id}`);
    } else {
      // Route to single question live event component
      navigate(`/live-event/${eventId}/challenge/${challenge.id}`);
    }
  };

  const manageEvent = () => {
    navigate(`/admin?tab=events&event=${event?.id}`);
  };

  const viewFullLeaderboard = () => {
    // Navigate to the live leaderboard with event ID
    navigate(`/leaderboard/live?event=${eventId}`);
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

  const getParticipantCount = (event: Event): number => {
    if (event.participants && Array.isArray(event.participants)) {
      return event.participants.length;
    }
    if (event.registeredUsers && Array.isArray(event.registeredUsers)) {
      return event.registeredUsers.length;
    }
    return event.totalParticipants || 0;
  };

  const getCurrencyDisplay = (event: Event): string => {
    return event.currency || 'ZMW';
  };

  const getChallengeAccessStatus = (challenge: Challenge) => {
    if (isEventOwner) {
      return { accessible: true, message: "Event Owner Access" };
    }
    
    if (isRegistered && user) {
      return { accessible: true, message: "Access Granted" };
    }
    
    if (!user) {
      return { accessible: false, message: "Login Required" };
    }
    
    return { accessible: false, message: "Event Registration Required" };
  };

  const isChallengeSolved = (challengeId: string) => {
    return solvedChallenges.has(challengeId);
  };

  const isChallengeSolvedInEvent = (challengeId: string) => {
    // Check if the challenge is in the solved set
    const isInSet = eventSolvedChallenges.has(challengeId);
    
    // Also check if it's a multi-question challenge that might be fully solved
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge?.hasMultipleQuestions && isInSet) {
      // For multi-question challenges, we need to check if ALL questions are solved
      return true; // The set will only contain fully solved multi-question challenges
    }
    
    return isInSet;
  };

  const renderCountdown = () => {
    if (!timeLeft) return null;

    return (
      <Card className="mb-4 border border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">Event ends in</span>
            </div>
            <div className="flex items-center gap-3 text-center">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-primary">{timeLeft.days}</span>
                  <span className="text-xs text-primary">days</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-primary">{timeLeft.hours}</span>
                <span className="text-xs text-primary">hours</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-primary">{timeLeft.minutes}</span>
                <span className="text-xs text-primary">mins</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-primary">{timeLeft.seconds}</span>
                <span className="text-xs text-primary">secs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLeaderboard = () => {
    console.log("🎯 Current leaderboard state:", leaderboard);

    if (leaderboard.length === 0) {
      return (
        <Card className="border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Medal className="w-4 h-4 text-yellow-600" />
              Event Leaderboard
              <Badge variant="outline" className="text-xs">
                0 players
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center py-4">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No scores yet. Be the first to solve challenges!</p>
              <p className="text-xs text-muted-foreground mt-2">
                Solve challenges to appear on the leaderboard
              </p>
            </div>
            <Button 
              onClick={viewFullLeaderboard} 
              variant="outline" 
              className="w-full mt-2"
            >
              View Full Leaderboard
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="w-4 h-4 text-yellow-600" />
            Event Leaderboard
            <Badge variant="outline" className="text-xs">
              {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {leaderboard.map((player) => (
              <div key={player.userId} className={`flex items-center justify-between p-3 rounded-lg ${
                player.userId === user?.uid 
                  ? 'bg-blue-500/10 border border-blue-200' 
                  : 'bg-muted/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    player.rank === 1 ? 'bg-yellow-500' :
                    player.rank === 2 ? 'bg-gray-400' :
                    player.rank === 3 ? 'bg-orange-700' : 'bg-blue-500'
                  }`}>
                    {player.rank}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${
                      player.userId === user?.uid ? 'text-blue-600' : ''
                    }`}>
                      {player.username}
                      {player.userId === user?.uid && (
                        <span className="ml-1 text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.solvedChallenges} challenge{player.solvedChallenges !== 1 ? 's' : ''} solved
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{player.score} pts</p>
                </div>
              </div>
            ))}
          </div>
          <Button 
            onClick={viewFullLeaderboard} 
            variant="outline" 
            className="w-full mt-4"
          >
            View Full Leaderboard
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading live event details...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-6">
            <Card className="max-w-md mx-auto border">
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h2 className="text-lg font-bold mb-2">Live Event Not Found</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  The live event doesn't exist or has ended.
                </p>
                <Button onClick={navigateToEvents} variant="terminal" size="sm">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Live Events
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const participantCount = getParticipantCount(event);
  const currency = getCurrencyDisplay(event);

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
                onClick={navigateToEvents} 
                size="sm" 
                className="h-8 px-2 sm:px-3 -ml-2"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Back to Live Events</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{event.name}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground">
                LIVE
              </Badge>
              {event.createdBy === 'user' && (
                <Badge variant="outline" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Community Hosted
                </Badge>
              )}
              {isRegistered && user && (
                <Badge className="bg-green-500/20 text-green-600 border-green-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registered
                </Badge>
              )}
              {isEventOwner && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Event Owner
                </Badge>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {renderCountdown()}

          {/* Event Info */}
          <Card className="mb-4 border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Started: {formatDateTime(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDateTime(event.endDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{participantCount} active player{participantCount !== 1 ? 's' : ''}{event.maxParticipants && ` / ${event.maxParticipants} max`}</span>
                </div>
              </div>
              
              {event.description && (
                <div className="mb-3">
                  <h3 className="font-semibold text-sm mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.description}
                  </p>
                </div>
              )}

              {event.prizes && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <h3 className="font-semibold text-sm">Prizes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.prizes}
                  </p>
                </div>
              )}

              {event.rules && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-sm">Rules & Guidelines</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {event.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          {event.requiresParticipantPayment && event.individualPrice && (
            <Card className="mb-4 border border-yellow-200 bg-yellow-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Paid Event
                  </Badge>
                  <span className="text-sm text-yellow-800">
                    Registration fee: {event.individualPrice} {currency}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons - Only show Manage Event for owners */}
          {(isEventOwner) && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <Button 
                onClick={manageEvent}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Event
              </Button>
            </div>
          )}

          {message && (
            <Alert className={`mb-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                  {message.text}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Main Content Grid */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            {/* Challenges Section */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    Live Challenges ({challenges.length})
                    <Badge variant="outline" className="text-xs">
                      {isEventOwner ? "Event Owner Access" : 
                       isRegistered ? "Access Granted" : 
                       user ? "Event Registration Required" : "Login Required"}
                    </Badge>
                  </CardTitle>
                  {!challengesLoaded && (
                    <CardDescription className="text-xs">
                      Loading challenges...
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {challenges.length === 0 ? (
                    <div className="text-center py-4">
                      <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No challenges available for this event yet.</p>
                      {isEventOwner && (
                        <div className="space-y-2">
                          <Button 
                            onClick={manageEvent}
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Add Challenges
                          </Button>
                          <div className="text-xs text-muted-foreground">
                            Make sure challenges are marked as <code>isActive: true</code> and have the correct <code>eventId</code>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((challenge) => {
                        const access = getChallengeAccessStatus(challenge);
                        const isSolved = isChallengeSolved(challenge.id);
                        const isSolvedInEvent = isChallengeSolvedInEvent(challenge.id);
                        const isMultiQuestion = challenge.hasMultipleQuestions;
                        const isFullySolved = isSolvedInEvent;
                        
                        return (
                          <Card 
                            key={challenge.id} 
                            className={`border-border ${
                              isFullySolved ? 'border-green-200 cursor-default' : 
                              isSolved && !isSolvedInEvent ? 'border-blue-200' : 
                              access.accessible ? 'cursor-pointer hover:border-primary/30' : 'opacity-70'
                            }`}
                            onClick={() => {
                              // Don't allow clicking if challenge is fully solved in event
                              if (isFullySolved) {
                                setMessage({ 
                                  type: 'error', 
                                  text: 'You have already completed this challenge in the event.' 
                                });
                                return;
                              }
                              
                              if (access.accessible) {
                                handleChallengeClick(challenge);
                              }
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                  {!access.accessible && <Lock className="w-3 h-3 text-muted-foreground" />}
                                  {isFullySolved && (
                                    <Badge className="bg-green-500/20 text-green-600 border-green-200 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {isMultiQuestion ? 'All Questions Solved' : 'Solved in Event'}
                                    </Badge>
                                  )}
                                  {isSolved && !isFullySolved && !isMultiQuestion && (
                                    <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Solved in Practice
                                    </Badge>
                                  )}
                                  {isSolved && !isFullySolved && isMultiQuestion && (
                                    <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Partially Solved (Practice)
                                    </Badge>
                                  )}
                                  {isMultiQuestion && !isFullySolved && (
                                    <Badge className="bg-purple-500/20 text-purple-600 border-purple-200 text-xs">
                                      Multi-Question
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {challenge.points} pts
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant="secondary"
                                  className={`${getDifficultyColor(challenge.difficulty)} text-xs`}
                                >
                                  {challenge.difficulty}
                                </Badge>
                                <Badge 
                                  variant="secondary"
                                  className={`${getCategoryColor(challenge.category)} text-xs`}
                                >
                                  {challenge.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {challenge.description}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <p className={`text-xs ${
                                  isFullySolved ? 'text-green-600' : 
                                  isSolved ? 'text-blue-600' : 
                                  access.accessible ? 'text-primary' : 'text-orange-600'
                                }`}>
                                  {isFullySolved ? 
                                    'Challenge completed' : 
                                   isSolved ? 
                                    (isMultiQuestion ? 'Continue in event to earn points' : 'Mark for event to earn points') : 
                                   access.message}
                                </p>
                                <div className="flex gap-1">
                                  {isSolved && !isFullySolved && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        solveForEvent(challenge);
                                      }}
                                      disabled={processingSolve === challenge.id}
                                    >
                                      {processingSolve === challenge.id ? (
                                        <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full mr-1"></div>
                                      ) : (
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                      )}
                                      {isMultiQuestion ? 'Continue in Event' : 'Mark for Event'}
                                    </Button>
                                  )}
                                  {access.accessible && !isFullySolved && (
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                      <Eye className="w-3 h-3 mr-1" />
                                      {isMultiQuestion ? 'View Questions' : 'Solve'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Leaderboard */}
              {renderLeaderboard()}

              {/* Event Information */}
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Status</h4>
                    <p className="text-sm text-primary font-medium">Live</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Start Time</h4>
                    <p className="text-sm">{formatDateTime(event.startDate)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">End Time</h4>
                    <p className="text-sm">{formatDateTime(event.endDate)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Active Players</h4>
                    <p className="text-sm">{participantCount}{event.maxParticipants && ` / ${event.maxParticipants} max`}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Challenges</h4>
                    <p className="text-sm">{challenges.length} available</p>
                  </div>
                  {isEventOwner && (
                    <div>
                      <h4 className="font-semibold text-xs text-muted-foreground">Your Role</h4>
                      <p className="text-sm text-purple-600">Event Owner/Admin</p>
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

export default LiveEventDetails;