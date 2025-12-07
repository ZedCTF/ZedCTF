// src/pages/CreateWriteup.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, Code, Shield, BookOpen,
  Calendar, Target, Hash, Award, Clock, User as UserIcon, Loader2, AlertCircle,
  Check, Info, Lightbulb, ChevronRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WriteupEditor from '../components/writeup/WriteupEditor';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';

// Firebase imports
import { collection, query, getDocs, where, limit, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  solvedBy?: string[];
  createdBy?: string;
  createdAt?: any;
  isActive: boolean;
  files?: string[];
  hints?: string[];
  tags?: string[];
  challengeType?: string;
}

interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  [key: string]: any;
}

const CreateWriteup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const queryParams = new URLSearchParams(location.search);
  const challengeIdFromUrl = queryParams.get('challengeId');
  
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeSearch, setChallengeSearch] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) {
        setCurrentUser({
          uid: 'anonymous-' + Date.now(),
          email: 'guest@zedctf.com',
          displayName: 'CTF Player',
          photoURL: '',
          role: 'user'
        });
        setLoadingUser(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          setCurrentUser({
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || userData.displayName || 'CTF Player',
            photoURL: authUser.photoURL || userData.photoURL || '',
            role: userData.role || 'user',
            ...userData
          });
        } else {
          setCurrentUser({
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'CTF Player',
            photoURL: authUser.photoURL || '',
            role: 'user'
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setCurrentUser({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || 'CTF Player',
          photoURL: authUser.photoURL || '',
          role: 'user'
        });
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  const fetchChallenges = async () => {
    try {
      setLoadingChallenges(true);
      setError(null);
      
      const challengesRef = collection(db, 'challenges');
      const q = query(
        challengesRef, 
        where('challengeType', '==', 'practice'),
        where('isActive', '==', true),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const challengesData: Challenge[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.challengeType === 'practice' && data.isActive !== false) {
          challengesData.push({
            id: doc.id,
            title: data.title || 'Untitled Challenge',
            description: data.description || 'No description available',
            category: data.category || 'Misc',
            difficulty: data.difficulty || 'medium',
            points: data.points || 100,
            solvedBy: data.solvedBy || [],
            createdBy: data.createdBy || 'Unknown',
            createdAt: data.createdAt,
            isActive: data.isActive !== false,
            files: data.files || [],
            hints: data.hints || [],
            tags: data.tags || [],
            challengeType: data.challengeType || 'practice'
          });
        }
      });
      
      challengesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      if (challengesData.length === 0) {
        setError('No practice challenges found.');
      }
      
      setChallenges(challengesData);
      setFilteredChallenges(challengesData);
      
      if (challengeIdFromUrl) {
        const challenge = challengesData.find(c => c.id === challengeIdFromUrl);
        if (challenge) {
          handleChallengeSelect(challenge);
          setActiveTab('write');
        }
      }
      
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setError('Failed to load practice challenges.');
    } finally {
      setLoadingChallenges(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [challengeIdFromUrl]);

  useEffect(() => {
    if (!challengeSearch.trim()) {
      setFilteredChallenges(challenges);
      return;
    }
    
    const searchTerm = challengeSearch.toLowerCase();
    const filtered = challenges.filter(challenge =>
      challenge.title.toLowerCase().includes(searchTerm) ||
      challenge.description.toLowerCase().includes(searchTerm) ||
      challenge.category.toLowerCase().includes(searchTerm) ||
      challenge.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    
    setFilteredChallenges(filtered);
  }, [challengeSearch, challenges]);

  const handleChallengeSelect = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setActiveTab('write');
    setIsDescriptionExpanded(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'hard': return 'bg-orange-500/20 text-orange-500';
      case 'expert': return 'bg-red-500/20 text-red-500';
      case 'insane': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-blue-500/20 text-blue-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChallenge) {
      alert('Please select a challenge first');
      setActiveTab('browse');
      return;
    }

    if (!content.trim()) {
      alert('Please write your solution');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = currentUser?.uid || 'anonymous-' + Date.now();
      const userName = currentUser?.displayName || currentUser?.name || 'CTF Player';
      const userEmail = currentUser?.email || 'user@example.com';
      const userAvatar = currentUser?.photoURL || '';
      const userRole = currentUser?.role || 'user';
      
      const isAdmin = userRole === 'admin' || userRole === 'moderator';
      const status = isAdmin ? 'approved' : 'pending';
      
      const writeupTitle = `${selectedChallenge.title} - Solution Walkthrough`;
      const writeupDescription = `A detailed solution guide for the "${selectedChallenge.title}" challenge. Learn how to solve this ${selectedChallenge.difficulty} level ${selectedChallenge.category} challenge worth ${selectedChallenge.points} points.`;
      const writeupTags = selectedChallenge.tags || [selectedChallenge.category.toLowerCase()];
      
      const writeupData = {
        title: writeupTitle,
        description: writeupDescription,
        content: content.trim(),
        challengeId: selectedChallenge.id,
        challengeTitle: selectedChallenge.title,
        challengeCategory: selectedChallenge.category,
        challengeDifficulty: selectedChallenge.difficulty,
        challengePoints: selectedChallenge.points,
        category: selectedChallenge.category,
        difficulty: selectedChallenge.difficulty,
        tags: writeupTags,
        status: status,
        views: 0,
        likes: 0,
        likesBy: [],
        comments: [],
        author: {
          id: userId,
          name: userName,
          email: userEmail,
          avatar: userAvatar,
          role: userRole
        },
        authorId: userId,
        authorRole: userRole,
        isAutoApproved: isAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const writeupsRef = collection(db, 'writeups');
      await addDoc(writeupsRef, writeupData);
      
      alert(isAdmin 
        ? '✅ Write-up published successfully!' 
        : '✅ Write-up submitted for review.');
      
      navigate('/writeups');
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to submit write-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Truncate long description
  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Show loading state while fetching user data
  if (loadingUser) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Header - Mobile Optimized */}
          <div className="mb-6 md:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/writeups')}
              className="mb-3 md:mb-4 px-2 md:px-4 h-9 md:h-10"
              size="sm"
            >
              <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="text-sm md:text-base">Back to Writeups</span>
            </Button>
            
            <div className="flex items-start md:items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0 mt-1 md:mt-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl font-bold truncate">Create Writeup</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  Document your solution for a CTF challenge
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-10 md:h-12">
              <TabsTrigger value="browse" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                <span className="truncate">{selectedChallenge ? 'Change' : 'Select Challenge'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="write" 
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                disabled={!selectedChallenge}
              >
                <Code className="w-3 h-3 md:w-4 md:h-4" />
                <span className="truncate">Write Solution</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Browse Challenges */}
            <TabsContent value="browse" className="space-y-4 md:space-y-6">
              <Card>
                <CardHeader className="px-4 md:px-6 py-4 md:py-6">
                  <CardTitle className="text-lg md:text-xl">Select a Practice Challenge</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Choose from active practice CTF challenges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4 md:px-6 pb-4 md:pb-6">
                  {/* Search */}
                  <div className="relative">
                    <Input
                      placeholder="Search practice challenges..."
                      value={challengeSearch}
                      onChange={(e) => setChallengeSearch(e.target.value)}
                      className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base"
                    />
                    <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                  </div>

                  {error && !loadingChallenges && (
                    <div className="p-3 md:p-4 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                        <p className="text-sm md:text-base">{error}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={fetchChallenges}
                      >
                        Retry Loading
                      </Button>
                    </div>
                  )}

                  {loadingChallenges ? (
                    <div className="text-center py-8 md:py-12">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-primary mx-auto mb-3 md:mb-4" />
                      <p className="text-muted-foreground text-sm md:text-base">Loading practice challenges...</p>
                    </div>
                  ) : filteredChallenges.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
                      <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">
                        {challengeSearch ? 'No matches found' : 'No practice challenges'}
                      </h3>
                      <p className="text-muted-foreground text-sm md:text-base mb-4">
                        {challengeSearch ? 'Try different search terms' : 'Create challenges in admin panel'}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={fetchChallenges}>
                          Refresh
                        </Button>
                        <Button size="sm" onClick={() => navigate('/admin')}>
                          Admin Panel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {filteredChallenges.length} practice challenge{filteredChallenges.length !== 1 ? 's' : ''} found
                        </p>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                          Practice Mode
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 md:gap-4">
                        {filteredChallenges.map((challenge) => (
                          <Card 
                            key={challenge.id}
                            className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                              selectedChallenge?.id === challenge.id ? 'border-primary border-2' : ''
                            }`}
                            onClick={() => handleChallengeSelect(challenge)}
                          >
                            <CardContent className="p-4 md:p-6">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-base md:text-lg mb-1 truncate">{challenge.title}</h3>
                                  <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">{challenge.category}</Badge>
                                    <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                                      {challenge.difficulty}
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm">
                                  <Award className="w-3 h-3" />
                                  {challenge.points} pts
                                </Badge>
                              </div>
                              
                              <p className="text-xs md:text-sm text-muted-foreground mb-4 line-clamp-2">
                                {truncateDescription(challenge.description, 100)}
                              </p>
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs md:text-sm text-muted-foreground gap-2">
                                <div className="flex items-center flex-wrap gap-2 md:gap-4">
                                  <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    <span>{challenge.solvedBy?.length || 0} solves</span>
                                  </div>
                                  {challenge.tags && challenge.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      <span>{challenge.tags.length} tags</span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={selectedChallenge?.id === challenge.id ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChallengeSelect(challenge);
                                  }}
                                  className="w-full sm:w-auto mt-2 sm:mt-0"
                                >
                                  {selectedChallenge?.id === challenge.id ? 'Selected' : 'Select'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedChallenge && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                          <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                          <span className="truncate">Selected Practice Challenge</span>
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Ready to document your solution
                        </p>
                      </div>
                      <Button onClick={() => setActiveTab('write')} size="sm" className="w-full md:w-auto">
                        Continue to Writeup
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="bg-background border rounded-lg p-3 md:p-4 overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base md:text-xl mb-1 truncate">{selectedChallenge.title}</h4>
                          <div className="relative">
                            <p className={`text-xs md:text-sm text-muted-foreground mt-1 ${
                              !isDescriptionExpanded ? 'line-clamp-3' : ''
                            }`}>
                              {selectedChallenge.description}
                            </p>
                            {selectedChallenge.description.length > 150 && (
                              <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="text-primary text-xs font-medium mt-1 hover:underline focus:outline-none"
                              >
                                {isDescriptionExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs md:text-sm self-start">
                          <Award className="w-3 h-3" />
                          {selectedChallenge.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 md:gap-2 mb-3">
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {selectedChallenge.category}
                        </Badge>
                        <Badge className={`text-xs flex items-center gap-1 ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                          <Target className="w-3 h-3" />
                          {selectedChallenge.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {selectedChallenge.solvedBy?.length || 0} solves
                        </Badge>
                        {selectedChallenge.createdAt && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {selectedChallenge.createdAt.toDate ? 
                              selectedChallenge.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                              'Recent'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab 2: Write Solution */}
            <TabsContent value="write">
              {!selectedChallenge ? (
                <Card>
                  <CardContent className="py-8 md:py-12 text-center">
                    <BookOpen className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
                    <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">No Challenge Selected</h3>
                    <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6">
                      Please select a practice challenge first
                    </p>
                    <Button onClick={() => setActiveTab('browse')} size="sm">
                      Browse Challenges
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                    {/* Challenge Info Sidebar */}
                    <div className="lg:w-1/3">
                      <Card className="sticky top-6">
                        <CardHeader className="p-4 md:p-6">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2">
                            <Info className="w-4 h-4 md:w-5 md:h-5" />
                            Challenge Details
                          </CardTitle>
                          <CardDescription>
                            {isAdminOrModerator ? (
                              <Badge className="bg-green-500/20 text-green-500 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Auto-approval
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Needs review
                              </Badge>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                          <div>
                            <h4 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 line-clamp-2">{selectedChallenge.title}</h4>
                            <div className="relative">
                              <p className={`text-xs md:text-sm text-muted-foreground ${
                                !isDescriptionExpanded ? 'line-clamp-3' : ''
                              }`}>
                                {selectedChallenge.description}
                              </p>
                              {selectedChallenge.description.length > 100 && (
                                <button
                                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                  className="text-primary text-xs font-medium mt-1 hover:underline focus:outline-none"
                                >
                                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Category:</span>
                              <Badge variant="outline" className="text-xs">{selectedChallenge.category}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Difficulty:</span>
                              <Badge className={`text-xs ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                                {selectedChallenge.difficulty}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Points:</span>
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {selectedChallenge.points}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Solves:</span>
                              <div className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                <span className="text-xs md:text-sm">{selectedChallenge.solvedBy?.length || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Hints:</span>
                              <div className="flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                <span className="text-xs md:text-sm">{selectedChallenge.hints?.length || 0} available</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs md:text-sm text-muted-foreground">Type:</span>
                              <Badge className="bg-green-500/20 text-green-500 text-xs">
                                Practice
                              </Badge>
                            </div>
                          </div>
                          
                          {selectedChallenge.tags && selectedChallenge.tags.length > 0 && (
                            <div>
                              <h5 className="text-xs md:text-sm font-medium mb-1 md:mb-2 flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                Tags:
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {selectedChallenge.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <h5 className="text-xs md:text-sm font-medium">Submission Status:</h5>
                            {isAdminOrModerator ? (
                              <div className="p-2 md:p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-green-600">
                                  <Check className="w-3 h-3 md:w-4 md:h-4" />
                                  <span className="text-xs md:text-sm font-medium">Auto-approved</span>
                                </div>
                                <p className="text-xs text-green-700 mt-1">
                                  Published immediately after submission.
                                </p>
                              </div>
                            ) : (
                              <div className="p-2 md:p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-600">
                                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                                  <span className="text-xs md:text-sm font-medium">Pending Review</span>
                                </div>
                                <p className="text-xs text-yellow-700 mt-1">
                                  Reviewed by moderators before publishing.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Editor Area */}
                    <div className="lg:w-2/3">
                      <Card className="h-full">
                        <CardHeader className="p-4 md:p-6">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2">
                            <Code className="w-4 h-4 md:w-5 md:h-5" />
                            Write Your Solution
                          </CardTitle>
                          <CardDescription className="text-sm md:text-base line-clamp-2">
                            Document your approach for "{selectedChallenge.title}"
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                          <WriteupEditor
                            onContentChange={setContent}
                            challengeHints={selectedChallenge.hints || []}
                            challengeTitle={selectedChallenge.title}
                          />

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 md:pt-6 mt-4 md:mt-6 border-t">
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/writeups')}
                                size="sm"
                                className="w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActiveTab('browse')}
                                size="sm"
                                className="w-full sm:w-auto"
                              >
                                Change Challenge
                              </Button>
                            </div>
                            <Button
                              type="submit"
                              disabled={isSubmitting || !content.trim()}
                              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary w-full sm:w-auto mt-3 sm:mt-0"
                              size="sm"
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="animate-spin w-3 h-3 md:w-4 md:h-4 border-2 border-current border-t-transparent rounded-full mr-1 md:mr-2"></div>
                                  <span className="text-sm md:text-base">Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2" />
                                  <span className="text-sm md:text-base">
                                    {isAdminOrModerator ? 'Publish Writeup' : 'Submit for Review'}
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default CreateWriteup;