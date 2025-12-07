// src/components/admin/WriteupReview.tsx
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust path as needed
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, XCircle, Clock, User, BookOpen, Eye, Calendar, RefreshCw } from "lucide-react";

interface WriteupReviewProps {
  onBack: () => void;
}

interface Writeup {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  challengeTitle: string;
  challengeCategory: string;
  challengeDifficulty: string;
  challengePoints: number;
  category: string;
  difficulty: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
  views: number;
  likes: number;
  tags: string[];
  attachments?: Array<{
    type: 'link' | 'image' | 'code';
    value: string;
    caption?: string;
  }>;
  feedback?: string;
  reviewerNotes?: string;
  reviewedAt?: any;
  reviewerId?: string;
}

const WriteupReview = ({ onBack }: WriteupReviewProps) => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});

  // Fetch pending writeups from Firestore
  const fetchPendingWriteups = async () => {
    try {
      setLoading(true);
      const writeupsRef = collection(db, 'writeups');
      const q = query(writeupsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const fetchedWriteups: Writeup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedWriteups.push({
          id: doc.id,
          title: data.title || 'Untitled Write-up',
          description: data.description || 'No description',
          content: data.content || '',
          author: data.author || { id: '', name: 'Anonymous', email: '', avatar: '' },
          challengeTitle: data.challengeTitle || 'Unknown Challenge',
          challengeCategory: data.challengeCategory || 'Misc',
          challengeDifficulty: data.challengeDifficulty || 'medium',
          challengePoints: data.challengePoints || 0,
          category: data.category || 'general',
          difficulty: data.difficulty || 'medium',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          views: data.views || 0,
          likes: data.likes || 0,
          tags: data.tags || [],
          attachments: data.attachments || [],
          feedback: data.feedback || '',
          reviewerNotes: data.reviewerNotes || '',
          reviewedAt: data.reviewedAt,
          reviewerId: data.reviewerId
        });
      });
      
      // Sort by creation date (newest first)
      fetchedWriteups.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setWriteups(fetchedWriteups);
      console.log(`Found ${fetchedWriteups.length} pending write-ups`);
    } catch (error) {
      console.error('Error fetching pending writeups:', error);
      alert('Failed to load pending write-ups. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingWriteups();
  }, []);

  const handleApprove = async (writeup: Writeup) => {
    if (!confirm(`Approve write-up "${writeup.title}"?`)) return;

    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      await updateDoc(writeupRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewerId: 'admin', // Replace with actual admin ID from auth
        reviewerNotes: reviewerNotes[writeup.id] || '',
        feedback: feedback[writeup.id] || '',
        updatedAt: serverTimestamp()
      });
      
      alert('✅ Write-up approved successfully!');
      
      // Update local state
      setWriteups(prev => prev.filter(w => w.id !== writeup.id));
      
      // Clear feedback
      setFeedback(prev => {
        const newFeedback = { ...prev };
        delete newFeedback[writeup.id];
        return newFeedback;
      });
      
      setReviewerNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[writeup.id];
        return newNotes;
      });
    } catch (error) {
      console.error('Error approving writeup:', error);
      alert('❌ Failed to approve write-up. Check console for details.');
    }
  };

  const handleReject = async (writeup: Writeup) => {
    if (!feedback[writeup.id]?.trim()) {
      alert('Please provide feedback explaining why this write-up was rejected.');
      return;
    }

    if (!confirm(`Reject write-up "${writeup.title}"?`)) return;

    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      await updateDoc(writeupRef, {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewerId: 'admin', // Replace with actual admin ID from auth
        reviewerNotes: reviewerNotes[writeup.id] || '',
        feedback: feedback[writeup.id] || '',
        updatedAt: serverTimestamp()
      });
      
      alert('✅ Write-up rejected.');
      
      // Update local state
      setWriteups(prev => prev.filter(w => w.id !== writeup.id));
      
      // Clear feedback
      setFeedback(prev => {
        const newFeedback = { ...prev };
        delete newFeedback[writeup.id];
        return newFeedback;
      });
      
      setReviewerNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[writeup.id];
        return newNotes;
      });
    } catch (error) {
      console.error('Error rejecting writeup:', error);
      alert('❌ Failed to reject write-up. Check console for details.');
    }
  };

  const handleRequestChanges = async (writeup: Writeup) => {
    if (!feedback[writeup.id]?.trim()) {
      alert('Please provide feedback explaining what changes are needed.');
      return;
    }

    if (!confirm(`Send feedback for write-up "${writeup.title}"?`)) return;

    try {
      const writeupRef = doc(db, 'writeups', writeup.id);
      await updateDoc(writeupRef, {
        feedback: feedback[writeup.id],
        reviewerNotes: reviewerNotes[writeup.id] || '',
        updatedAt: serverTimestamp()
        // Note: status remains 'pending' for changes
      });
      
      alert('✅ Feedback sent to author!');
      
      // Clear feedback fields
      setFeedback(prev => {
        const newFeedback = { ...prev };
        delete newFeedback[writeup.id];
        return newFeedback;
      });
      
      setReviewerNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[writeup.id];
        return newNotes;
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('❌ Failed to send feedback. Check console for details.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": 
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "approved": 
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected": 
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/20 text-green-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'hard':
        return 'bg-orange-500/20 text-orange-500';
      case 'insane':
      case 'expert':
        return 'bg-red-500/20 text-red-500';
      case 'beginner':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Write-ups</CardTitle>
          <CardDescription>
            Loading pending writeups...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-3 text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Review Write-ups</CardTitle>
            <CardDescription>
              Review and approve user write-ups for challenges ({writeups.length} pending)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPendingWriteups}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {writeups.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground mb-6">
              No pending writeups to review at this time.
            </p>
            <Button 
              variant="outline" 
              onClick={fetchPendingWriteups}
              className="flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Check Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {writeups.map((writeup) => (
              <div key={writeup.id} className="border rounded-lg p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getDifficultyColor(writeup.challengeDifficulty)}>
                        {writeup.challengeDifficulty}
                      </Badge>
                      <Badge variant="outline">{writeup.challengeCategory}</Badge>
                      {getStatusBadge(writeup.status)}
                      <Badge variant="secondary" className="ml-2">
                        {writeup.challengePoints} pts
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold">{writeup.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {writeup.description}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Author: <strong>{writeup.author.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span>Challenge: <strong>{writeup.challengeTitle}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Submitted: <strong>{formatDate(writeup.createdAt)}</strong></span>
                  </div>
                </div>

                {/* Content Preview */}
                <div>
                  <Label>Write-up Content Preview</Label>
                  <div className="mt-1 p-3 border rounded bg-muted/50 max-h-60 overflow-y-auto">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {writeup.content.length > 500 
                        ? writeup.content.substring(0, 500) + '...' 
                        : writeup.content}
                    </div>
                  </div>
                  {writeup.content.length > 500 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing first 500 characters of {writeup.content.length} total
                    </p>
                  )}
                </div>

                {/* Tags */}
                {writeup.tags && writeup.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {writeup.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Review Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`feedback-${writeup.id}`}>
                        Feedback for Author (Visible to User)
                      </Label>
                      <Textarea
                        id={`feedback-${writeup.id}`}
                        placeholder="Provide constructive feedback for the author..."
                        value={feedback[writeup.id] || ''}
                        onChange={(e) => setFeedback({
                          ...feedback,
                          [writeup.id]: e.target.value
                        })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${writeup.id}`}>
                        Reviewer Notes (Private)
                      </Label>
                      <Textarea
                        id={`notes-${writeup.id}`}
                        placeholder="Private notes for other reviewers..."
                        value={reviewerNotes[writeup.id] || ''}
                        onChange={(e) => setReviewerNotes({
                          ...reviewerNotes,
                          [writeup.id]: e.target.value
                        })}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      onClick={() => handleApprove(writeup)}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleRequestChanges(writeup)}
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Request Changes
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleReject(writeup)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WriteupReview;