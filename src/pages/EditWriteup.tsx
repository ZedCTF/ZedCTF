// src/pages/EditWriteup.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Code, Shield, BookOpen,
  Calendar, Target, Hash, Award, Clock, User as UserIcon, Loader2, AlertCircle,
  Check, Info, Lightbulb, Edit, Eye
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
import { Textarea } from '../components/ui/textarea';

// Firebase imports
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface WriteupData {
  id: string;
  title: string;
  description: string;
  content: string;
  challengeId: string;
  challengeTitle: string;
  challengeCategory: string;
  challengeDifficulty: string;
  challengePoints: number;
  category: string;
  difficulty: string;
  tags: string[];
  status: string;
  views: number;
  likes: number;
  likesBy: string[];
  comments: any[];
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  authorId: string;
  authorRole: string;
  isAutoApproved: boolean;
  createdAt: any;
  updatedAt: any;
}

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
}

interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  [key: string]: any;
}

const EditWriteup = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  
  const [writeup, setWriteup] = useState<WriteupData | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      alert('Writeup ID is required');
      navigate('/writeups');
      return;
    }

    if (!authUser) {
      alert('You must be logged in to edit a writeup');
      navigate('/login');
      return;
    }

    fetchWriteup(id);
  }, [id, authUser, navigate]);

  const fetchWriteup = async (writeupId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch writeup
      const writeupRef = doc(db, 'writeups', writeupId);
      const writeupSnap = await getDoc(writeupRef);
      
      if (!writeupSnap.exists()) {
        alert('Writeup not found');
        navigate('/writeups');
        return;
      }

      const data = writeupSnap.data() as WriteupData;
      const writeupData = { ...data, id: writeupSnap.id };
      
      // Check if user owns this writeup or is admin/moderator
      const userRef = doc(db, 'users', authUser!.uid);
      const userSnap = await getDoc(userRef);
      
      let userRole = 'user';
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        userRole = userData.role || 'user';
        setCurrentUser({
          uid: authUser!.uid,
          email: authUser!.email || '',
          displayName: authUser!.displayName || userData.displayName || 'CTF Player',
          photoURL: authUser!.photoURL || userData.photoURL || '',
          role: userRole,
          ...userData
        });
      } else {
        setCurrentUser({
          uid: authUser!.uid,
          email: authUser!.email || '',
          displayName: authUser!.displayName || 'CTF Player',
          photoURL: authUser!.photoURL || '',
          role: 'user'
        });
      }

      // Check permissions
      const isOwner = data.authorId === authUser!.uid;
      const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator';
      
      if (!isOwner && !isAdminOrModerator) {
        alert('You do not have permission to edit this writeup');
        navigate('/writeups');
        return;
      }

      setWriteup(writeupData);
      setContent(data.content || '');
      setTitle(data.title || '');
      setDescription(data.description || '');

      // Fetch challenge data if available
      if (data.challengeId) {
        fetchChallenge(data.challengeId);
      } else {
        setChallengeLoading(false);
      }

    } catch (error) {
      console.error('Error fetching writeup:', error);
      setError('Failed to load writeup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChallenge = async (challengeId: string) => {
    try {
      setChallengeLoading(true);
      const challengeRef = doc(db, 'challenges', challengeId);
      const challengeSnap = await getDoc(challengeRef);
      
      if (challengeSnap.exists()) {
        const data = challengeSnap.data();
        setChallenge({
          id: challengeSnap.id,
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
          tags: data.tags || []
        });
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setChallengeLoading(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!writeup) {
      alert('Writeup data not loaded');
      return;
    }

    if (!content.trim()) {
      alert('Please write your solution');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      
      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        updatedAt: serverTimestamp(),
      };

      // If challenge data exists, update it too
      if (challenge) {
        updateData.challengeTitle = challenge.title;
        updateData.challengeCategory = challenge.category;
        updateData.challengeDifficulty = challenge.difficulty;
        updateData.challengePoints = challenge.points;
        updateData.category = challenge.category;
        updateData.difficulty = challenge.difficulty;
        updateData.tags = challenge.tags || [challenge.category.toLowerCase()];
      }

      // If admin/moderator is editing, they can change status
      if (currentUser?.role === 'admin' || currentUser?.role === 'moderator') {
        // You could add status dropdown here if needed
      }

      await updateDoc(writeupRef, updateData);
      
      alert('✅ Write-up updated successfully!');
      navigate(`/writeups/${writeup.id}`);
      
    } catch (error) {
      console.error('Error updating writeup:', error);
      alert('❌ Failed to update write-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading writeup...</p>
            {id && <p className="text-sm text-gray-500 mt-2">ID: {id}</p>}
          </div>
        </section>
        <Footer />
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto max-w-6xl">
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/writeups')}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Writeups
              </Button>
            </div>
            
            <Card className="border-red-200">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Error Loading Writeup</h3>
                  <p className="text-muted-foreground mb-6">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => fetchWriteup(id!)}>
                      <Loader2 className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/writeups')}>
                      Go to Writeups
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  if (!writeup) {
    return null;
  }

  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const isOwner = writeup.authorId === authUser?.uid;

  return (
    <>
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/writeups/${writeup.id}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Writeup
            </Button>
            
            <div className="flex items-center gap-3 mb-6">
              <Edit className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Edit Writeup</h1>
                <p className="text-muted-foreground">
                  Update your solution for "{writeup.challengeTitle || 'a CTF challenge'}"
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Writeup Info Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Writeup Details
                    </CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(writeup.status)}>
                          {writeup.status.charAt(0).toUpperCase() + writeup.status.slice(1)}
                        </Badge>
                        {isAdminOrModerator && (
                          <Badge className="bg-green-500/20 text-green-500">
                            <Check className="w-3 h-3 mr-1" />
                            Admin Edit
                          </Badge>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Challenge Info */}
                    {challenge ? (
                      <>
                        <div>
                          <h4 className="font-semibold text-lg mb-2">{challenge.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Category:</span>
                            <Badge variant="outline">{challenge.category}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Difficulty:</span>
                            <Badge className={getDifficultyColor(challenge.difficulty)}>
                              {challenge.difficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Points:</span>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {challenge.points}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Solves:</span>
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              <span className="text-sm">{challenge.solvedBy?.length || 0}</span>
                            </div>
                          </div>
                          {challenge.hints && challenge.hints.length > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Hints:</span>
                              <div className="flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                <span className="text-sm">{challenge.hints.length} available</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Challenge Info</span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Original challenge: {writeup.challengeTitle || 'Not available'}
                        </p>
                      </div>
                    )}
                    
                    {/* Writeup Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Views:</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {writeup.views}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Likes:</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {writeup.likes}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm">{formatDate(writeup.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Updated:</span>
                        <span className="text-sm">{formatDate(writeup.updatedAt)}</span>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {writeup.tags && writeup.tags.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          Tags:
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {writeup.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Author Info */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Author:</h5>
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        {writeup.author.avatar ? (
                          <img 
                            src={writeup.author.avatar} 
                            alt={writeup.author.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{writeup.author.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {writeup.author.role === 'admin' ? 'Admin' : 
                             writeup.author.role === 'moderator' ? 'Moderator' : 'User'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Edit Status Notice */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info className="w-4 h-4" />
                        <span className="text-sm font-medium">Editing Mode</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        {isAdminOrModerator 
                          ? 'As an admin/moderator, your changes will be applied immediately.'
                          : isOwner
                          ? 'Your changes will update the existing writeup.'
                          : 'You have permission to edit this writeup.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Editor Area */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      Edit Writeup Content
                    </CardTitle>
                    <CardDescription>
                      Update your solution for {writeup.challengeTitle ? `"${writeup.challengeTitle}"` : 'this challenge'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium">
                        Writeup Title *
                      </label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a descriptive title for your writeup"
                        className="h-12"
                        required
                      />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-2">
                      <label htmlFor="description" className="text-sm font-medium">
                        Brief Description
                      </label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide a brief overview of your solution approach"
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Editor */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Detailed Solution *
                      </label>
                      <WriteupEditor
                        onContentChange={setContent}
                        initialContent={content}
                        challengeHints={challenge?.hints || []}
                        challengeTitle={challenge?.title || writeup.challengeTitle}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mt-6 border-t">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/writeups/${writeup.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Writeup
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate('/writeups')}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to discard your changes?')) {
                              navigate(`/writeups/${writeup.id}`);
                            }
                          }}
                        >
                          Discard Changes
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || !content.trim() || !title.trim()}
                          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary px-8"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5 mr-2" />
                              Update Writeup
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Edit Notice */}
                    <div className="text-xs text-muted-foreground mt-4">
                      <p>
                        <strong>Note:</strong> Editing a writeup will update the "Last Updated" timestamp.
                        {!isAdminOrModerator && ' Your writeup may need to be re-approved by moderators.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default EditWriteup;