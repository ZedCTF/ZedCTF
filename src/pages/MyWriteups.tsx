// src/pages/MyWriteups.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Plus, Edit, Trash2, Eye, Check, X, 
  Clock as ClockIcon, UserCircle, FileText, Loader2,
  ArrowLeft, Filter, Search, AlertCircle, RefreshCw,
  MoreVertical, ChevronDown, ChevronUp
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Firebase imports
import { collection, query, getDocs, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Writeup {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  challengeTitle: string;
  category: string;
  difficulty: string;
  views: number;
  authorId: string;
}

const MyWriteups = () => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [filteredWriteups, setFilteredWriteups] = useState<Writeup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [writeupToDelete, setWriteupToDelete] = useState<string | null>(null);
  const [expandedWriteup, setExpandedWriteup] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authUser) {
      navigate('/login?redirect=/writeups/my');
    }
  }, [authUser, navigate]);

  const fetchMyWriteups = async () => {
    if (!authUser) {
      setWriteups([]);
      setFilteredWriteups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const writeupsRef = collection(db, 'writeups');
      
      // Try different query approaches
      let querySnapshot;
      
      try {
        // First try with the compound query
        const q = query(
          writeupsRef,
          where('authorId', '==', authUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        querySnapshot = await getDocs(q);
      } catch (queryError: any) {
        console.warn('Compound query failed, trying simple query:', queryError.message);
        
        // If compound query fails, try a simple query without ordering
        if (queryError.code === 'failed-precondition' || queryError.code === 'invalid-argument') {
          // Try getting all writeups and filter client-side
          querySnapshot = await getDocs(writeupsRef);
        } else {
          throw queryError;
        }
      }
      
      const writeupsData: Writeup[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // If we used simple query, filter client-side
        if (data.authorId === authUser.uid) {
          writeupsData.push({
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            status: data.status || 'pending',
            createdAt: data.createdAt,
            challengeTitle: data.challengeTitle || '',
            category: data.category || '',
            difficulty: data.difficulty || '',
            views: data.views || 0,
            authorId: data.authorId || ''
          });
        }
      });
      
      setWriteups(writeupsData);
      setFilteredWriteups(writeupsData);
      
    } catch (err: any) {
      console.error('Error fetching writeups:', err);
      
      // More specific error messages
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check if you have read access to writeups collection.');
      } else if (err.code === 'failed-precondition') {
        setError('Firestore index missing. Please create a composite index for writeups collection with authorId and createdAt fields.');
      } else {
        setError('Failed to load your writeups. Please try again.');
      }
      
      setWriteups([]);
      setFilteredWriteups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWriteups();
  }, [authUser]);

  // Filter writeups
  useEffect(() => {
    let filtered = writeups;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(writeup =>
        writeup.title.toLowerCase().includes(term) ||
        writeup.description.toLowerCase().includes(term) ||
        writeup.challengeTitle.toLowerCase().includes(term) ||
        writeup.category.toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(writeup => writeup.status === selectedStatus);
    }

    setFilteredWriteups(filtered);
  }, [searchTerm, selectedStatus, writeups]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-600 border-green-200';
      case 'rejected':
        return 'bg-red-500/20 text-red-600 border-red-200';
      default:
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case 'rejected': return <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      default: return <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />;
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recent';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Recent';
    }
  };

  const handleDelete = async (writeupId: string) => {
    try {
      const writeupRef = doc(db, 'writeups', writeupId);
      await deleteDoc(writeupRef);
      
      // Update local state
      setWriteups(prev => prev.filter(w => w.id !== writeupId));
      setDeleteDialogOpen(false);
      setWriteupToDelete(null);
      
    } catch (error) {
      console.error('Error deleting writeup:', error);
      alert('Failed to delete writeup');
    }
  };

  const stats = {
    total: writeups.length,
    approved: writeups.filter(w => w.status === 'approved').length,
    pending: writeups.filter(w => w.status === 'pending').length,
    rejected: writeups.filter(w => w.status === 'rejected').length
  };

  const toggleWriteupExpansion = (writeupId: string) => {
    setExpandedWriteup(expandedWriteup === writeupId ? null : writeupId);
  };

  if (!authUser) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your writeups...</p>
            </div>
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
          {/* Header - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex flex-col gap-4 mb-6">
              {/* Back Button - Top */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/writeups')}
                className="w-fit flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Writeups
              </Button>
              
              {/* Title Section */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <UserCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">My Writeups</h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage and track your submitted writeups</p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="mb-4 border-red-200 bg-red-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-800 text-sm font-medium">{error}</p>
                      <p className="text-red-600 text-xs mt-1">
                        Try refreshing or check your Firestore configuration.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchMyWriteups}
                      className="text-red-700 border-red-300 hover:bg-red-100 h-8 flex-shrink-0"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats - Mobile Optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <Card className="text-center border">
                <CardContent className="p-2">
                  <div className="text-lg sm:text-xl font-bold text-primary">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </CardContent>
              </Card>
              <Card className="text-center border">
                <CardContent className="p-2">
                  <div className="text-lg sm:text-xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
              <Card className="text-center border">
                <CardContent className="p-2">
                  <div className="text-lg sm:text-xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card className="text-center border">
                <CardContent className="p-2">
                  <div className="text-lg sm:text-xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </CardContent>
              </Card>
            </div>

            {/* Create Button - Mobile Optimized */}
            <Card className="mb-4 border bg-gradient-to-r from-blue-500/5 to-primary/10">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">Create New Writeup</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Share your solutions with the community</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Link to="/writeups/create" className="w-full">
                      <Button className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Writeup
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={fetchMyWriteups}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex flex-col gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search writeups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Mobile Filters Button */}
              <div className="sm:hidden">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter by Status
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Desktop Filters */}
              <div className="hidden sm:flex gap-2">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                    className="flex-1 sm:flex-none"
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 text-xs h-5 w-5 p-0 flex items-center justify-center"
                      >
                        {stats[status as keyof typeof stats]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Filters Sheet */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent side="bottom" className="h-[60vh]">
              <SheetHeader>
                <SheetTitle>Filter by Status</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    className="w-full justify-between"
                    onClick={() => {
                      setSelectedStatus(status);
                      setMobileFiltersOpen(false);
                    }}
                  >
                    <span>{status === 'all' ? 'All Writeups' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    {status !== 'all' && (
                      <Badge variant="secondary">
                        {stats[status as keyof typeof stats]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Writeups List */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Your Writeups</h2>
              <span className="text-sm text-muted-foreground">
                {filteredWriteups.length} of {writeups.length}
              </span>
            </div>

            {filteredWriteups.length > 0 ? (
              <div className="space-y-3">
                {filteredWriteups.map((writeup) => (
                  <Card key={writeup.id} className="border hover:border-primary/30 transition-all">
                    <CardContent className="p-3 sm:p-4">
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div 
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => toggleWriteupExpansion(writeup.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(writeup.status)}
                              <Badge className={`${getStatusBadge(writeup.status)} text-xs`}>
                                {writeup.status}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-sm line-clamp-1">{writeup.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {writeup.challengeTitle}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="ml-2 p-0 h-auto">
                            {expandedWriteup === writeup.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Expanded Content */}
                        {expandedWriteup === writeup.id && (
                          <div className="mt-3 pt-3 border-t animate-in slide-in-from-top">
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                              {writeup.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="outline" className="text-xs">
                                {writeup.category}
                              </Badge>
                              <Badge className={`${getDifficultyColor(writeup.difficulty)} text-xs`}>
                                {writeup.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {writeup.views} views
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDate(writeup.createdAt)}
                              </span>
                            </div>

                            {/* Action Buttons for Mobile */}
                            <div className="flex gap-2">
                              <Link to={`/writeups/${writeup.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Link to={`/writeups/edit/${writeup.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setWriteupToDelete(writeup.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base sm:text-lg truncate">{writeup.title}</h3>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(writeup.status)}
                                <Badge className={`${getStatusBadge(writeup.status)} text-xs`}>
                                  {writeup.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {writeup.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium truncate">{writeup.challengeTitle}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {writeup.category}
                            </Badge>
                            <span>•</span>
                            <Badge className={`${getDifficultyColor(writeup.difficulty)} text-xs`}>
                              {writeup.difficulty}
                            </Badge>
                            <span>•</span>
                            <span>{writeup.views} views</span>
                            <span>•</span>
                            <span>{formatDate(writeup.createdAt)}</span>
                          </div>
                        </div>
                        
                        {/* Desktop Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                          <Link to={`/writeups/${writeup.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <Link to={`/writeups/edit/${writeup.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-600"
                                onClick={() => {
                                  setWriteupToDelete(writeup.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Writeup
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : writeups.length === 0 ? (
              <Card className="text-center border">
                <CardContent className="p-6 sm:p-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg sm:text-xl font-bold mb-2">No Writeups Yet</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    You haven't created any writeups yet. Share your solutions with the community!
                  </p>
                  <Link to="/writeups/create">
                    <Button className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Writeup
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center border">
                <CardContent className="p-6 sm:p-8">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg sm:text-xl font-bold mb-2">No Writeups Found</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    No writeups match your search criteria.
                  </p>
                  <Button 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedStatus('all');
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog - Mobile Optimized */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Writeup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this writeup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => writeupToDelete && handleDelete(writeupToDelete)}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
};

export default MyWriteups;