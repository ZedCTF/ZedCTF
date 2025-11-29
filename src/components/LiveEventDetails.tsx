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
  const [registering, setRegistering] = useState(false);
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
            flag: data.flag
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
              flag: data.flag
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
      
      console.log("📊 Event-specific correct submissions found:", eventSubmissionsSnapshot.size);

      eventSubmissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const challengeId = submission.challengeId;
        
        if (challengeId) {
          console.log(`✅ Found event-specific solved challenge: ${challengeId}`);
          eventSolvedIds.add(challengeId);
        }
      });

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
              flag: data.flag
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
      
      let leaderboardData: UserScore[] = [];

      try {
        console.log("🔄 Building leaderboard from EVENT submissions only");
        
        // First, get the event to check participants
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (!eventDoc.exists()) {
          console.log("❌ Event not found");
          setLeaderboard([]);
          return;
        }
        
        const eventData = eventDoc.data();
        const participants = eventData.participants || eventData.registeredUsers || [];
        console.log("👥 Event participants:", participants);
        
        if (participants.length === 0) {
          console.log("ℹ️ No participants found for this event");
          setLeaderboard([]);
          return;
        }

        // Get ALL challenges that belong to this event
        const challengesQuery = query(
          collection(db, "challenges"),
          where("eventId", "==", eventId)
        );
        const challengesSnapshot = await getDocs(challengesQuery);
        const eventChallengeIds = new Set<string>();
        const challengePoints: { [key: string]: number } = {};
        
        challengesSnapshot.forEach(doc => {
          const data = doc.data();
          eventChallengeIds.add(doc.id);
          challengePoints[doc.id] = data.points || 0;
        });
        
        console.log("🎯 Challenges in event:", Array.from(eventChallengeIds));

        // Get EVENT-SPECIFIC correct submissions by participants
        const userScores: { [key: string]: UserScore } = {};
        const userChallengeMap: { [key: string]: Set<string> } = {};

        // For each participant, get their EVENT submissions for event challenges
        for (const participantId of participants) {
          console.log(`🔍 Processing participant: ${participantId}`);
          
          // Get EVENT-SPECIFIC correct submissions by this participant
          const userSubmissionsQuery = query(
            collection(db, "submissions"),
            where("userId", "==", participantId),
            where("eventId", "==", eventId),
            where("isCorrect", "==", true)
          );
          
          const userSubmissionsSnapshot = await getDocs(userSubmissionsQuery);
          let userScore = 0;
          let solvedCount = 0;

          if (!userChallengeMap[participantId]) {
            userChallengeMap[participantId] = new Set();
          }

          userSubmissionsSnapshot.forEach(doc => {
            const submission = doc.data();
            const challengeId = submission.challengeId;
            
            // Check if this submission is for a challenge in our event
            if (challengeId && eventChallengeIds.has(challengeId)) {
              // Only count each challenge once per user
              if (!userChallengeMap[participantId].has(challengeId)) {
                const points = submission.pointsAwarded || submission.points || challengePoints[challengeId] || 0;
                userScore += points;
                solvedCount += 1;
                userChallengeMap[participantId].add(challengeId);
                console.log(`✅ ${participantId} solved ${challengeId} in event: ${points}pts`);
              }
            }
          });

          // Get username
          let username = "User";
          try {
            const userDoc = await getDoc(doc(db, "users", participantId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              username = userData.username || userData.displayName || userData.email?.split('@')[0] || "User";
            }
          } catch (userError) {
            console.log("❌ Could not fetch user data for participant:", participantId);
          }

          userScores[participantId] = {
            userId: participantId,
            username: username,
            score: userScore,
            solvedChallenges: solvedCount,
            rank: 0 // Will be calculated after sorting
          };

          console.log(`📊 Final event score for ${username}: ${userScore}pts, ${solvedCount} challenges`);
        }

        // Sort by score and assign ranks
        leaderboardData = Object.values(userScores)
          .sort((a, b) => b.score - a.score)
          .map((user, index) => ({
            ...user,
            rank: index + 1
          }));

        console.log("🏅 Final event leaderboard:", leaderboardData);
        
      } catch (submissionsError) {
        console.log("❌ Leaderboard calculation failed:", submissionsError);
      }

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      setLeaderboard([]);
    }
  };

  // NEW FUNCTION: Create event-specific submission for already solved challenges
  const solveForEvent = async (challenge: Challenge) => {
    if (!user || !eventId || !challenge.flag) return;

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

  const registerForEvent = async () => {
    if (!user || !event) {
      alert("Please log in to register for events");
      navigate('/login');
      return;
    }

    setRegistering(true);
    setMessage(null);

    try {
      const alreadyRegistered = 
        event.participants?.includes(user.uid) || 
        event.registeredUsers?.includes(user.uid);
      
      if (alreadyRegistered) {
        setMessage({ type: 'error', text: 'You are already registered for this event.' });
        setIsRegistered(true);
        return;
      }

      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(user.uid),
        totalParticipants: increment(1)
      });

      setIsRegistered(true);
      setMessage({ type: 'success', text: 'Successfully registered for the event!' });
      
    } catch (error: any) {
      console.error("❌ Error registering for event:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to register: ${error.message}. Please try again.` 
      });
    } finally {
      setRegistering(false);
    }
  };

  const navigateToEvents = () => {
    navigate("/live");
  };

  // FIXED: Updated navigation to use new route
  const handleChallengeClick = (challenge: Challenge) => {
    if (isEventOwner || isRegistered) {
      // Navigate to the new live event challenge detail route
      navigate(`/live-event/${eventId}/challenge/${challenge.id}`);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'You need to register for this event to access challenges.' 
      });
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
      return { accessible: true, message: "Admin/Event Owner Access" };
    }
    
    if (isRegistered) {
      return { accessible: true, message: "Access Granted" };
    }
    
    return { accessible: false, message: "Register to access challenges" };
  };

  const isChallengeSolved = (challengeId: string) => {
    return solvedChallenges.has(challengeId);
  };

  const isChallengeSolvedInEvent = (challengeId: string) => {
    return eventSolvedChallenges.has(challengeId);
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

          {/* Action Buttons - Only show register button if user is NOT registered */}
          {!isRegistered && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              {/* Manage Button for Owners/Admins */}
              {isEventOwner && (
                <Button 
                  onClick={manageEvent}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Event
                </Button>
              )}
              
              {/* Register Button for non-registered users */}
              <Button 
                onClick={registerForEvent} 
                disabled={registering}
                className="flex-1"
                variant="terminal"
              >
                {registering ? (
                  <>
                    <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register to Join
                  </>
                )}
              </Button>
            </div>
          )}

          {/* For registered users, only show Manage Event button if they are event owner */}
          {isRegistered && isEventOwner && (
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

          {/* Debug Info */}
          {isEventOwner && (
            <Card className="mb-4 border border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-800 font-medium">Debug Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Challenges: {challenges.length}</div>
                    <div>Leaderboard: {leaderboard.length} players</div>
                    <div>Event ID: {eventId}</div>
                    <div>Solved: {solvedChallenges.size} challenges</div>
                    <div>Event Solved: {eventSolvedChallenges.size} challenges</div>
                    <div>Participants: {participantCount}</div>
                    <div>Registered: {isRegistered ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      {isEventOwner ? "Full Access" : 
                       isRegistered ? "Access Granted" : "Register to Access"}
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
                        
                        return (
                          <Card 
                            key={challenge.id} 
                            className={`border-border ${
                              isSolvedInEvent ? 'border-green-200 bg-green-50' : 
                              isSolved ? 'border-blue-200 bg-blue-50' : 
                              access.accessible ? 'cursor-pointer' : 'opacity-70'
                            }`}
                            onClick={() => access.accessible && !isSolvedInEvent && !isSolved && handleChallengeClick(challenge)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                  {!access.accessible && <Lock className="w-3 h-3 text-muted-foreground" />}
                                  {isSolvedInEvent && (
                                    <Badge className="bg-green-500/20 text-green-600 border-green-200 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Solved in Event
                                    </Badge>
                                  )}
                                  {isSolved && !isSolvedInEvent && (
                                    <Badge className="bg-blue-500/20 text-blue-600 border-blue-200 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Solved in Practice
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
                                  isSolvedInEvent ? 'text-green-600' : 
                                  isSolved ? 'text-blue-600' : 
                                  access.accessible ? 'text-primary' : 'text-orange-600'
                                }`}>
                                  {isSolvedInEvent ? 'Challenge completed' : 
                                   isSolved ? 'Mark for event to earn points' : 
                                   access.message}
                                </p>
                                <div className="flex gap-1">
                                  {isSolved && !isSolvedInEvent && (
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
                                      Mark for Event
                                    </Button>
                                  )}
                                  {access.accessible && !isSolvedInEvent && !isSolved && (
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Solve
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