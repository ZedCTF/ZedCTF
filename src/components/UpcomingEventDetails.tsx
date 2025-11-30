import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, arrayUnion, increment, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useAdminContext } from "../contexts/AdminContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Calendar, Users, Clock, MapPin, Trophy, Shield, ArrowLeft, CheckCircle, XCircle, Crown, UserPlus, Lock, Eye, BookOpen, Settings, Edit, CreditCard, Smartphone, UserCheck } from "lucide-react";
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
  pendingApprovals?: string[];
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
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Registration Method Selection Component
const RegistrationMethodSelection = ({ 
  event, 
  onCancel, 
  onSelectMethod 
}: { 
  event: Event; 
  onCancel: () => void; 
  onSelectMethod: (method: 'mobile_money' | 'approval') => void;
}) => {
  const price = event.individualPrice || 0;
  const currency = event.currency || 'ZMW';

  return (
    <Card className="w-full max-w-md mx-auto border border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="w-5 h-5 text-blue-600" />
          Select Registration Method
        </CardTitle>
        <CardDescription>
          Choose how you want to register for this event.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-800">Registration Fee</span>
              <span className="text-lg font-bold text-green-800">
                {price} {currency}
              </span>
            </div>
            <p className="text-xs text-green-600">Event: {event.name}</p>
          </div>

          {/* Mobile Money Option */}
          <Card 
            className="border border-green-200 hover:border-green-400 cursor-pointer transition-colors"
            onClick={() => onSelectMethod('mobile_money')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Mobile Money Payment</h3>
                  <p className="text-xs text-muted-foreground">
                    Pay instantly via Mobile Money API. Registration confirmed immediately after payment.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge className="bg-green-500 text-white text-xs">
                    Instant
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Approval Option */}
          <Card 
            className="border border-blue-200 hover:border-blue-400 cursor-pointer transition-colors"
            onClick={() => onSelectMethod('approval')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Admin/Moderator Approval</h3>
                  <p className="text-xs text-muted-foreground">
                    Pay manually and submit for approval. Status will be "Pending Approval" until verified.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                    Manual
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Info */}
          <div className="bg-gray-50 p-3 rounded-lg border text-xs">
            <h4 className="font-medium mb-2">Method Comparison:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-green-700">Mobile Money</p>
                <ul className="text-green-600 space-y-1 mt-1">
                  <li>• Instant registration</li>
                  <li>• API payment processing</li>
                  <li>• Automatic confirmation</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-700">Admin Approval</p>
                <ul className="text-blue-600 space-y-1 mt-1">
                  <li>• Manual payment</li>
                  <li>• Pending approval status</li>
                  <li>• Admin verification</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button disabled className="flex-1 bg-gray-400">
          Select Method Above
        </Button>
      </CardFooter>
    </Card>
  );
};

// Mobile Money Payment Component
const MobileMoneyPayment = ({ event, onCancel, onSuccess }: { event: Event; onCancel: () => void; onSuccess: () => void }) => {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const price = event.individualPrice || 0;
  const currency = event.currency || 'ZMW';

  const processMobileMoneyPayment = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      // Simulate API payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate API response
      const paymentSuccess = Math.random() > 0.1; // 90% success rate
      
      if (paymentSuccess) {
        setMessage({ 
          type: 'success', 
          text: 'Mobile Money payment successful! You have been registered for the event.' 
        });
        
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        throw new Error('Mobile Money payment failed. Please try again or use a different method.');
      }
      
    } catch (error: any) {
      console.error("Mobile Money payment error:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Payment processing failed. Please try again.' 
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-green-600" />
          Mobile Money Payment
        </CardTitle>
        <CardDescription>
          Complete your registration via Mobile Money API.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-800">Amount to Pay</span>
              <span className="text-lg font-bold text-green-800">
                {price} {currency}
              </span>
            </div>
            <p className="text-xs text-green-600">Event: {event.name}</p>
          </div>
          
          {/* Payment Instructions */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="text-sm font-medium text-blue-800 mb-2">How it works:</h5>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Click "Process Mobile Money Payment" below</li>
              <li>You'll be redirected to Mobile Money service</li>
              <li>Complete payment on your mobile device</li>
              <li>Registration confirmed automatically after successful payment</li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">
              💡 <strong>Note:</strong> This uses Mobile Money API for instant payment processing and automatic registration.
            </p>
          </div>
        </div>

        {message && (
          <Alert className={`mt-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
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
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={processMobileMoneyPayment}
          disabled={processing}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {processing ? (
            <>
              <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 mr-2" />
              Process Mobile Money Payment
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Admin Approval Component
const AdminApprovalRegistration = ({ event, onCancel, onSuccess }: { event: Event; onCancel: () => void; onSuccess: () => void }) => {
  const { user } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const price = event.individualPrice || 0;
  const currency = event.currency || 'ZMW';

  const submitForApproval = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      if (!user || !event) return;

      const eventRef = doc(db, "events", event.id);
      
      // Use arrayUnion which handles the case where field doesn't exist
      await updateDoc(eventRef, {
        pendingApprovals: arrayUnion(user.uid)
      });

      setMessage({ 
        type: 'success', 
        text: 'Registration submitted for approval! Your status is now "Pending Approval". Admin will verify your payment and approve registration.' 
      });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error("Error submitting approval request:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to submit approval request: ${error.message}` 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="w-5 h-5 text-blue-600" />
          Request Admin Approval
        </CardTitle>
        <CardDescription>
          Make payment manually and submit for admin/moderator approval.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Payment & Approval Info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Approval Required</p>
              <p className="text-xs text-blue-600">Make payment first, then admin will verify and approve registration.</p>
            </div>
          </div>

          {/* Payment Section */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-800">Registration Fee</span>
              <span className="text-lg font-bold text-green-800">
                {price} {currency}
              </span>
            </div>
            <p className="text-xs text-green-600">Event: {event.name}</p>
            
            {/* Mobile Money Instructions */}
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <h6 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Payment Instructions
              </h6>
              <div className="text-xs space-y-2">
                <div className="bg-white p-2 rounded border">
                  <p className="font-medium text-blue-800 mb-1">Send payment to:</p>
                  <p className="text-blue-700">📱 Airtel Money: <span className="font-mono font-bold">0774713037</span></p>
                  <p className="text-blue-700">📱 MTN Money: <span className="font-mono font-bold">0969209404</span></p>
                </div>
                <p className="text-blue-700">Reference: <span className="font-bold">{event.name}</span></p>
                <p className="text-blue-700">Amount: <span className="font-bold">{price} {currency}</span></p>
              </div>
            </div>
          </div>

          {/* Approval Process Info */}
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">After submitting:</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Your status will be <strong>"Pending Approval"</strong></li>
              <li>Admins will verify your payment manually</li>
              <li>You'll receive notification when approved</li>
              <li>Registration confirmed upon approval</li>
              <li>This process usually takes 1-2 hours</li>
            </ul>
          </div>
        </div>

        {message && (
          <Alert className={`mt-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
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
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={submitting}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={submitForApproval}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? (
            <>
              <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Submit for Approval
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Main Component
const UpcomingEventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin, isModerator } = useAdminContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'select' | 'mobile_money' | 'approval'>('select');

  useEffect(() => {
    if (!eventId) {
      setMessage({ type: 'error', text: 'Invalid event URL' });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      await fetchEventData();
      await fetchEventChallenges();
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
          setEvent(eventData);
          
          if (user) {
            const userRegistered = 
              eventData.participants?.includes(user.uid) || 
              eventData.registeredUsers?.includes(user.uid);
            setIsRegistered(!!userRegistered);
            
            const userPending = eventData.pendingApprovals?.includes(user.uid);
            setIsPendingApproval(!!userPending);
            
            const isOwner = eventData.createdById === user.uid;
            const hasAdminAccess = isAdmin || isModerator;
            setIsEventOwner(isOwner || hasAdminAccess);
          }
        }
      },
      (error) => {
        console.error("Real-time event listener error:", error);
      }
    );
    
    return () => {
      unsubscribeEvent();
    };
  }, [eventId, user, isAdmin, isModerator]);

  // Countdown timer for upcoming event
  useEffect(() => {
    if (!event) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(event.startDate).getTime();
      
      const difference = start - now;
      
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
          
          const userPending = eventData.pendingApprovals?.includes(user.uid);
          setIsPendingApproval(!!userPending);
          
          const isOwner = eventData.createdById === user.uid;
          const hasAdminAccess = isAdmin || isModerator;
          setIsEventOwner(isOwner || hasAdminAccess);
        }
      } else {
        setMessage({ type: 'error', text: 'Event not found' });
      }
    } catch (error: any) {
      console.error("Error fetching event:", error);
      setMessage({ type: 'error', text: `Failed to load event: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventChallenges = async () => {
    if (!eventId) return;

    try {
      let challengesData: Challenge[] = [];

      const challengesQuery = query(
        collection(db, "challenges"),
        where("eventId", "==", eventId),
        orderBy("points", "asc")
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      
      challengesSnapshot.forEach(doc => {
        const data = doc.data();
        if (isEventOwner || data.isActive) {
          challengesData.push({
            id: doc.id,
            title: data.title,
            description: isEventOwner ? data.description : "Challenge details will be available when the event starts",
            category: data.finalCategory || data.category,
            points: data.points,
            difficulty: data.difficulty,
            solvedBy: data.solvedBy,
            isActive: data.isActive,
            eventId: data.eventId,
            challengeType: data.challengeType
          });
        }
      });

      setChallenges(challengesData);
      setChallengesLoaded(true);

    } catch (error) {
      console.error("Error fetching challenges:", error);
      setChallenges([]);
      setChallengesLoaded(true);
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

  // Function to actually register user in Firestore
  const completeRegistration = async () => {
    if (!user || !event) return;

    try {
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(user.uid),
        totalParticipants: increment(1)
      });

      setIsRegistered(true);
      setMessage({ type: 'success', text: 'Successfully registered for the event!' });
      
    } catch (error: any) {
      console.error("Error completing registration:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to complete registration: ${error.message}` 
      });
    }
  };

  const registerForEvent = async () => {
    if (!user || !event) {
      alert("Please log in to register for events");
      navigate('/login');
      return;
    }

    // Check if already registered
    const alreadyRegistered = 
      event.participants?.includes(user.uid) || 
      event.registeredUsers?.includes(user.uid);
    
    const alreadyPending = event.pendingApprovals?.includes(user.uid);
    
    if (alreadyRegistered) {
      setMessage({ type: 'error', text: 'You are already registered for this event.' });
      setIsRegistered(true);
      return;
    }

    if (alreadyPending) {
      setMessage({ type: 'error', text: 'You already have a pending registration request for this event.' });
      setIsPendingApproval(true);
      return;
    }

    // Check if event is full
    if (event.maxParticipants && getParticipantCount(event) >= event.maxParticipants) {
      setMessage({ type: 'error', text: 'This event is full. Registration is closed.' });
      return;
    }

    // For paid events, show registration method selection
    if (event.requiresParticipantPayment && event.individualPrice) {
      setRegistrationStep('select');
      setShowRegistrationDialog(true);
    } else if (event.createdBy === 'user') {
      // Community hosted free event - requires approval
      setRegistrationStep('approval');
      setShowRegistrationDialog(true);
    } else {
      // Free admin-hosted event - register directly
      await completeRegistration();
    }
  };

  const handlePaymentSuccess = () => {
    setShowRegistrationDialog(false);
    setRegistrationStep('select');
    completeRegistration();
  };

  const handleApprovalSuccess = () => {
    setShowRegistrationDialog(false);
    setRegistrationStep('select');
    setIsPendingApproval(true);
    setMessage({ 
      type: 'success', 
      text: 'Registration request submitted! Your status is now "Pending Approval". You will be notified once approved.' 
    });
  };

  const handleRegistrationCancel = () => {
    setShowRegistrationDialog(false);
    setRegistrationStep('select');
  };

  const handleSelectMethod = (method: 'mobile_money' | 'approval') => {
    setRegistrationStep(method);
  };

  const handleBackToSelection = () => {
    setRegistrationStep('select');
  };

  const navigateToEvents = () => {
    navigate("/live");
  };

  const handleChallengeClick = (challenge: Challenge) => {
    if (isEventOwner) {
      navigate(`/challenge/${challenge.id}`);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Challenges will be available when the event starts.' 
      });
    }
  };

  const manageEvent = () => {
    navigate(`/admin?tab=events&event=${event?.id}`);
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

  const getPendingApprovalsCount = (event: Event): number => {
    return event.pendingApprovals?.length || 0;
  };

  const getCurrencyDisplay = (event: Event): string => {
    return event.currency || 'ZMW';
  };

  const getChallengeAccessStatus = (challenge: Challenge) => {
    if (isEventOwner) {
      return { accessible: true, message: "Admin/Event Owner Access" };
    }
    
    return { accessible: false, message: "Available when event starts" };
  };

  const renderCountdown = () => {
    if (!timeLeft) return null;

    return (
      <Card className="mb-4 border border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-800">Event starts in</span>
            </div>
            <div className="flex items-center gap-3 text-center">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-blue-800">{timeLeft.days}</span>
                  <span className="text-xs text-blue-600">days</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.hours}</span>
                <span className="text-xs text-blue-600">hours</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.minutes}</span>
                <span className="text-xs text-blue-600">mins</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-blue-800">{timeLeft.seconds}</span>
                <span className="text-xs text-blue-600">secs</span>
              </div>
            </div>
          </div>
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
              <p className="mt-2 text-sm text-muted-foreground">Loading upcoming event details...</p>
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
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h2 className="text-lg font-bold mb-2">Upcoming Event Not Found</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  The upcoming event doesn't exist or has already started.
                </p>
                <Button onClick={navigateToEvents} variant="terminal" size="sm">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Events
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
  const pendingCount = getPendingApprovalsCount(event);
  const currency = getCurrencyDisplay(event);
  const isEventFull = event.maxParticipants && participantCount >= event.maxParticipants;

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
                <span className="hidden sm:inline">Back to Events</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{event.name}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-500 text-blue-foreground">
                UPCOMING
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
              {isPendingApproval && user && (
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-200 text-xs">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Pending Approval
                </Badge>
              )}
              {isEventOwner && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Event Owner
                </Badge>
              )}
              {isEventFull && (
                <Badge className="bg-red-500/20 text-red-600 border-red-200 text-xs">
                  Event Full
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
                  <span>Starts: {formatDateTime(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDateTime(event.endDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{participantCount} registered{event.maxParticipants && ` / ${event.maxParticipants} max`}</span>
                  {pendingCount > 0 && (
                    <span className="text-yellow-600"> ({pendingCount} pending)</span>
                  )}
                </div>
                {event.participationType && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>•</span>
                    <span className="capitalize">{event.participationType}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                )}
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

          {/* Action Buttons */}
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
            
            {/* Register Button */}
            {!isRegistered && !isPendingApproval && user && !isEventOwner && !isEventFull && (
              <Button 
                onClick={registerForEvent} 
                disabled={registering}
                className="flex-1"
                variant="terminal"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register for Event
              </Button>
            )}

            {!isRegistered && !isPendingApproval && !user && (
              <Button 
                onClick={() => navigate('/login')} 
                className="flex-1"
                variant="terminal"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Login to Register
              </Button>
            )}

            {isEventFull && !isRegistered && !isPendingApproval && (
              <Button disabled variant="outline" className="flex-1">
                Event Full - Registration Closed
              </Button>
            )}

            {isRegistered && (
              <Button disabled variant="outline" className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Already Registered
              </Button>
            )}

            {isPendingApproval && (
              <Button disabled variant="outline" className="flex-1">
                <UserCheck className="w-4 h-4 mr-2" />
                Pending Approval
              </Button>
            )}
          </div>

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

          {/* Challenges Section */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    Upcoming Challenges ({challenges.length})
                    <Badge variant="outline" className="text-xs">
                      {isEventOwner ? "Preview Access" : "Available when event starts"}
                    </Badge>
                  </CardTitle>
                  {!isEventOwner && (
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Challenges will unlock automatically when the event starts
                    </CardDescription>
                  )}
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
                      <p className="text-sm text-muted-foreground">No challenges preview available for this event yet.</p>
                      {isEventOwner && (
                        <Button 
                          onClick={manageEvent}
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Add Challenges
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((challenge) => {
                        const access = getChallengeAccessStatus(challenge);
                        return (
                          <Card 
                            key={challenge.id} 
                            className={`border-border transition-colors ${
                              access.accessible ? 'hover:border-primary/30 cursor-pointer' : 'opacity-70 bg-muted/30'
                            }`}
                            onClick={() => access.accessible && handleChallengeClick(challenge)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                  {!access.accessible && (
                                    <div className="flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Locked</span>
                                    </div>
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
                                  access.accessible ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {access.message}
                                </p>
                                {access.accessible && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Preview
                                  </Button>
                                )}
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
              <Card className="border lg:sticky lg:top-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Status</h4>
                    <p className="text-sm text-blue-600 font-medium">Upcoming</p>
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
                    <h4 className="font-semibold text-xs text-muted-foreground">Registered</h4>
                    <p className="text-sm">{participantCount}{event.maxParticipants && ` / ${event.maxParticipants} max`}</p>
                    {pendingCount > 0 && (
                      <p className="text-xs text-yellow-600">{pendingCount} pending approval</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-muted-foreground">Challenges</h4>
                    <p className="text-sm">{challenges.length} preview</p>
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

      {/* Registration Dialog */}
      {showRegistrationDialog && (
        <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {registrationStep === 'select' && 'Select Registration Method'}
                {registrationStep === 'mobile_money' && 'Mobile Money Payment'}
                {registrationStep === 'approval' && 'Request Admin Approval'}
              </DialogTitle>
            </DialogHeader>
            
            {registrationStep === 'select' && event && (
              <RegistrationMethodSelection
                event={event}
                onCancel={handleRegistrationCancel}
                onSelectMethod={handleSelectMethod}
              />
            )}
            
            {registrationStep === 'mobile_money' && event && (
              <MobileMoneyPayment
                event={event}
                onCancel={handleBackToSelection}
                onSuccess={handlePaymentSuccess}
              />
            )}
            
            {registrationStep === 'approval' && event && (
              <AdminApprovalRegistration
                event={event}
                onCancel={handleBackToSelection}
                onSuccess={handleApprovalSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default UpcomingEventDetails;