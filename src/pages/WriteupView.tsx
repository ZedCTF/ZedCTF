// src/pages/WriteupView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, Calendar, User, Tag, Award, Target,
  Clock, ThumbsUp, MessageCircle, Share2, Bookmark,
  Copy, Check, Flag, AlertCircle, Loader2,
  ChevronUp, ChevronDown, ExternalLink, Edit, Trash2,
  Shield, CheckCircle, XCircle, Clock as ClockIcon,
  Users, EyeOff, ChevronRight, BarChart3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, 
  serverTimestamp, collection, query, where, getDocs, setDoc
} from 'firebase/firestore';
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
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  uniqueViews: string[]; // Array of user IDs who viewed
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

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  createdAt: any;
  likes: number;
  replies?: Comment[];
}

const WriteupView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [writeup, setWriteup] = useState<WriteupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [solvedByCount, setSolvedByCount] = useState<number>(0);
  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWriteup(id);
      fetchUserRole();
      if (authUser) {
        trackUniqueView(id);
      }
    }
  }, [id, authUser]);

  useEffect(() => {
    if (writeup?.challengeId) {
      fetchSolvedByCount(writeup.challengeId);
    }
  }, [writeup?.challengeId]);

  const fetchUserRole = async () => {
    if (!authUser) return;
    
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserRole(data.role || 'user');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchWriteup = async (writeupId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const writeupRef = doc(db, 'writeups', writeupId);
      const writeupSnap = await getDoc(writeupRef);
      
      if (!writeupSnap.exists()) {
        setError('Writeup not found');
        setLoading(false);
        return;
      }
      
      const data = writeupSnap.data() as WriteupData;
      const writeupData = { ...data, id: writeupSnap.id };
      
      setWriteup(writeupData);
      
      // Check if user liked this writeup
      if (authUser && data.likesBy?.includes(authUser.uid)) {
        setLiked(true);
      }
      
    } catch (err: any) {
      console.error('Error fetching writeup:', err);
      setError('Failed to load writeup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Track unique viewer - ONLY for authenticated users
  const trackUniqueView = async (writeupId: string) => {
    if (!authUser) {
      // Don't track views for non-authenticated users
      console.log('Not tracking view: User not authenticated');
      return;
    }

    // Prevent duplicate view tracking
    if (viewTracked) {
      console.log('View already tracked for this session');
      return;
    }
    
    try {
      const writeupRef = doc(db, 'writeups', writeupId);
      const writeupSnap = await getDoc(writeupRef);
      
      if (writeupSnap.exists()) {
        const data = writeupSnap.data() as WriteupData;
        const userId = authUser.uid;
        
        // Check if user already viewed this writeup
        if (!data.uniqueViews?.includes(userId)) {
          // Add user to unique views
          await updateDoc(writeupRef, {
            uniqueViews: arrayUnion(userId),
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          setWriteup(prev => prev ? {
            ...prev,
            uniqueViews: [...(prev.uniqueViews || []), userId]
          } : null);
          setViewTracked(true);
          console.log('New unique view tracked for user:', userId);
        } else {
          // User already viewed
          console.log('User already viewed this writeup');
          setViewTracked(true);
        }
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchSolvedByCount = async (challengeId: string) => {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      const challengeSnap = await getDoc(challengeRef);
      if (challengeSnap.exists()) {
        const data = challengeSnap.data();
        setSolvedByCount(data.solvedBy?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching solved by count:', error);
    }
  };

  const handleLike = async () => {
    if (!authUser) {
      alert('Please login to like writeups');
      navigate('/login');
      return;
    }
    
    if (!writeup) return;
    
    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      const userId = authUser.uid;
      
      if (liked) {
        // Unlike
        await updateDoc(writeupRef, {
          likes: increment(-1),
          likesBy: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
        setWriteup(prev => prev ? {
          ...prev,
          likes: prev.likes - 1,
          likesBy: prev.likesBy.filter(id => id !== userId)
        } : null);
        setLiked(false);
      } else {
        // Like
        await updateDoc(writeupRef, {
          likes: increment(1),
          likesBy: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
        setWriteup(prev => prev ? {
          ...prev,
          likes: prev.likes + 1,
          likesBy: [...prev.likesBy, userId]
        } : null);
        setLiked(true);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      alert('Failed to update like');
    }
  };

  const handleAddComment = async () => {
    if (!authUser) {
      alert('Please login to comment');
      navigate('/login');
      return;
    }
    
    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    if (!writeup) return;
    
    setSubmittingComment(true);
    
    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      const newComment = {
        id: Date.now().toString(),
        content: commentText.trim(),
        author: {
          id: authUser.uid,
          name: authUser.displayName || 'Anonymous',
          avatar: authUser.photoURL || '',
          role: userRole
        },
        createdAt: serverTimestamp(),
        likes: 0,
        replies: []
      };
      
      await updateDoc(writeupRef, {
        comments: arrayUnion(newComment),
        updatedAt: serverTimestamp()
      });
      
      setWriteup(prev => prev ? {
        ...prev,
        comments: [...(prev.comments || []), newComment]
      } : null);
      
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDelete = async () => {
    if (!writeup) return;
    
    // Check if user is author or admin
    const isAuthor = writeup.authorId === authUser?.uid;
    const isAdmin = userRole === 'admin' || userRole === 'moderator';
    
    if (!isAuthor && !isAdmin) {
      alert('You do not have permission to delete this writeup');
      return;
    }
    
    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      await updateDoc(writeupRef, {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        deletedBy: authUser?.uid
      });
      
      alert('Writeup deleted successfully');
      navigate('/writeups');
    } catch (error) {
      console.error('Error deleting writeup:', error);
      alert('Failed to delete writeup');
    }
  };

  const handleStatusChange = async (newStatus: 'approved' | 'rejected') => {
    if (!writeup) return;
    
    const isAdmin = userRole === 'admin' || userRole === 'moderator';
    if (!isAdmin) {
      alert('You do not have permission to change writeup status');
      return;
    }
    
    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      await updateDoc(writeupRef, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: authUser?.uid,
        updatedAt: serverTimestamp()
      });
      
      setWriteup(prev => prev ? { ...prev, status: newStatus } : null);
      alert(`Writeup ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating writeup status:', error);
      alert('Failed to update writeup status');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-600';
      case 'medium': return 'bg-yellow-500/20 text-yellow-600';
      case 'hard': return 'bg-orange-500/20 text-orange-600';
      case 'expert': return 'bg-red-500/20 text-red-600';
      case 'insane': return 'bg-purple-500/20 text-purple-600';
      default: return 'bg-blue-500/20 text-blue-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
          <ClockIcon className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Fixed CodeBlock component
  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    
    return (
      <div className="relative my-4 rounded-lg overflow-hidden border border-border">
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
              setCopySuccess(true);
              setTimeout(() => setCopySuccess(false), 2000);
            }}
            className="h-7 px-2 bg-background/80 backdrop-blur-sm text-xs"
          >
            {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={className?.replace('language-', '') || 'bash'}
          PreTag="div"
          className="!m-0 !bg-[#1e1e1e] text-sm overflow-x-auto"
          showLineNumbers={false}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  };

  // Custom components for ReactMarkdown
  const MarkdownComponents = {
    code: CodeBlock,
    h1: ({node, ...props}: any) => <h1 className="text-2xl sm:text-3xl font-bold mt-6 mb-3 text-foreground" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl sm:text-2xl font-bold mt-5 mb-2 pb-2 border-b text-foreground" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg sm:text-xl font-bold mt-4 mb-2 text-foreground" {...props} />,
    h4: ({node, ...props}: any) => <h4 className="text-base sm:text-lg font-bold mt-3 mb-1 text-foreground" {...props} />,
    p: ({node, ...props}: any) => <p className="my-3 leading-relaxed text-foreground whitespace-pre-wrap break-words" {...props} />,
    ul: ({node, ...props}: any) => <ul className="my-3 ml-4 sm:ml-6 list-disc text-foreground" {...props} />,
    ol: ({node, ...props}: any) => <ol className="my-3 ml-4 sm:ml-6 list-decimal text-foreground" {...props} />,
    li: ({node, ...props}: any) => <li className="my-1 text-foreground" {...props} />,
    blockquote: ({node, ...props}: any) => (
      <blockquote className="border-l-4 border-primary/50 pl-3 sm:pl-4 my-3 italic bg-muted/30 py-2 px-3 sm:px-4 rounded-r text-foreground" {...props} />
    ),
    a: ({node, ...props}: any) => <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-3 w-full"><table className="min-w-full border-collapse border w-full" {...props} /></div>,
    th: ({node, ...props}: any) => <th className="border bg-muted px-3 py-2 text-left font-bold text-foreground text-sm" {...props} />,
    td: ({node, ...props}: any) => <td className="border px-3 py-2 text-foreground text-sm" {...props} />,
    pre: ({node, ...props}: any) => <div className="my-3 w-full overflow-x-auto" {...props} />,
    hr: ({node, ...props}: any) => <hr className="my-4 border-border" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-foreground" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-foreground" {...props} />,
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading writeup...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !writeup) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
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
            
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Writeup Not Found</h2>
                <p className="text-muted-foreground mb-6">{error || 'The writeup you are looking for does not exist or has been removed.'}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate('/writeups')}>
                    Browse Writeups
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isAuthor = writeup.authorId === authUser?.uid;
  const isAdmin = userRole === 'admin' || userRole === 'moderator';
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const canModerate = isAdmin;

  // Get real views from uniqueViews array length
  const realViews = writeup.uniqueViews?.length || 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-16 pb-8">
        {/* Simple Back Button */}
        <div className="px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/writeups')}
            className="h-9 px-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="px-4">
          {/* Mobile Main Card - Single column on mobile */}
          <Card className="mb-4">
            <CardContent className="p-4">
              {/* Status */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {getStatusBadge(writeup.status)}
                {writeup.isAutoApproved && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Auto-approved
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                {writeup.title}
              </h1>

              {/* Description */}
              <p className="text-muted-foreground mb-4">
                {writeup.description}
              </p>

              {/* Challenge Info */}
              <div className="bg-muted/20 p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {writeup.challengeTitle}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    {writeup.challengePoints} pts
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {writeup.challengeCategory}
                  </Badge>
                  <Badge className={`text-xs ${getDifficultyColor(writeup.challengeDifficulty)}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {writeup.challengeDifficulty}
                  </Badge>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-muted/10 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={writeup.author.avatar} />
                  <AvatarFallback>
                    {writeup.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{writeup.author.name}</h4>
                    {writeup.author.role === 'admin' && (
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Published {formatDate(writeup.createdAt)}</p>
                </div>
              </div>

              {/* Quick Stats - SHOWING REAL UNIQUE VIEWS */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <div className="text-lg font-bold">{realViews}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <div className="text-lg font-bold">{writeup.likes}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <div className="text-lg font-bold">{solvedByCount}</div>
                  <div className="text-xs text-muted-foreground">Solves</div>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <div className="text-lg font-bold">{writeup.comments?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={liked ? "default" : "outline"}
                  onClick={handleLike}
                  className="flex-1"
                  disabled={!authUser}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {liked ? 'Liked' : 'Like'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {canEdit && (
                  <Link to={`/writeups/edit/${writeup.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                )}
              </div>

              {/* Login prompt if not authenticated */}
              {!authUser && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    <Link to="/login" className="text-primary hover:underline">
                      Login
                    </Link> to like and track your views
                  </p>
                </div>
              )}

              {/* Show view tracking info */}
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {realViews === 0 ? 'No views yet' : `${realViews} unique viewer${realViews !== 1 ? 's' : ''}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content" className="text-sm">
                Solution
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                ({writeup.comments?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown components={MarkdownComponents}>
                      {writeup.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Tags */}
                  {writeup.tags && writeup.tags.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {writeup.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {/* Add Comment */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm mb-2">Add a Comment</h3>
                    <div className="space-y-3">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="min-h-[80px] text-sm"
                        rows={3}
                        disabled={!authUser}
                      />
                      {!authUser ? (
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground">
                            <Link to="/login" className="text-primary hover:underline">
                              Login
                            </Link> to comment
                          </p>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button
                            onClick={handleAddComment}
                            disabled={submittingComment || !commentText.trim()}
                            size="sm"
                          >
                            {submittingComment ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Posting...
                              </>
                            ) : (
                              'Post Comment'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">
                      Comments ({writeup.comments?.length || 0})
                    </h3>
                    
                    {writeup.comments && writeup.comments.length > 0 ? (
                      writeup.comments.map((comment: any) => (
                        <div key={comment.id} className="border rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {comment.author.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">
                                  {comment.author.name}
                                </span>
                                {comment.author.role === 'admin' && (
                                  <Badge variant="outline" className="text-xs">Admin</Badge>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDate(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No comments yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mobile Admin Actions */}
          {(canDelete || canModerate) && (
            <Card className="mb-4 border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-destructive mb-3">Admin Actions</h3>
                <div className="space-y-2">
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete Writeup
                    </Button>
                  )}
                  {canModerate && writeup.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange('approved')}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange('rejected')}
                      >
                        <XCircle className="w-3 h-3 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Writeup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this writeup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              "{writeup?.title}" will be permanently removed from the platform.
            </p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              Delete Writeup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
};

export default WriteupView;