// src/pages/Writeups.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Search, BookOpen, Clock, User, CheckCircle, 
  XCircle, Eye, Plus, Filter, Loader2, ChevronRight, RefreshCw, AlertCircle, FolderOpen,
  Globe, Key, Eye as EyeIcon, Binary, Search as SearchIcon, Package, Cpu, Image, Smartphone, Server, Network, Zap,
  Globe as GlobeIcon, Check, X, Clock as ClockIcon, UserCircle, AlertTriangle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Firebase imports
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Writeup {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id: string;
    name: string;
    email?: string;
    avatar: string;
    role: string;
  };
  challengeTitle: string;
  challengeId: string;
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
  createdAt: any;
  updatedAt: any;
  authorId: string;
  authorRole: string;
  isAutoApproved: boolean;
  [key: string]: any;
}

interface Category {
  name: string;
  count: number;
  icon: JSX.Element;
  color: string;
  description: string;
}

const Writeups = () => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredWriteups, setFilteredWriteups] = useState<Writeup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch user data and role
  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) {
        setCurrentUser({ role: 'user', uid: null });
        return;
      }

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setCurrentUser({ ...userSnap.data(), uid: authUser.uid });
        } else {
          setCurrentUser({ role: 'user', uid: authUser.uid });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setCurrentUser({ role: 'user', uid: authUser?.uid || null });
      }
    };

    fetchUserData();
  }, [authUser]);

  // Helper function to safely convert Firestore data to Writeup
  const convertToWriteup = (id: string, data: any): Writeup => {
    return {
      id,
      title: data.title || '',
      description: data.description || '',
      content: data.content || '',
      author: {
        id: data.author?.id || data.authorId || '',
        name: data.author?.name || 'Anonymous',
        email: data.author?.email || '',
        avatar: data.author?.avatar || '',
        role: data.author?.role || 'user'
      },
      challengeTitle: data.challengeTitle || '',
      challengeId: data.challengeId || '',
      challengeCategory: data.challengeCategory || '',
      challengeDifficulty: data.challengeDifficulty || '',
      challengePoints: data.challengePoints || 0,
      category: data.category || '',
      difficulty: data.difficulty || '',
      tags: data.tags || [],
      status: data.status || 'pending',
      views: data.views || 0,
      uniqueViews: data.uniqueViews || [], // Add uniqueViews field
      likes: data.likes || 0,
      likesBy: data.likesBy || [],
      comments: data.comments || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      authorId: data.authorId || data.author?.id || '',
      authorRole: data.authorRole || data.author?.role || 'user',
      isAutoApproved: data.isAutoApproved || false,
      ...data
    };
  };

  // Category icon, color, and description functions
  const getCategoryIcon = (categoryName: string): JSX.Element => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('web') || name.includes('xss') || name.includes('sqli') || 
        name.includes('csrf') || name.includes('ssrf') || name.includes('idor')) {
      return <Globe className="w-5 h-5" />;
    }
    
    if (name.includes('network') || name.includes('netsec') || name.includes('net') ||
        name.includes('wifi') || name.includes('wireless') || name.includes('packet') ||
        name.includes('tcp') || name.includes('ip') || name.includes('dns') ||
        name.includes('router') || name.includes('switch') || name.includes('firewall')) {
      return <Network className="w-5 h-5" />;
    }
    
    if (name.includes('forensic')) {
      return <EyeIcon className="w-5 h-5" />;
    }
    
    if (name.includes('crypto') || name.includes('cryptography') || name.includes('encrypt')) {
      return <Key className="w-5 h-5" />;
    }
    
    if (name.includes('reverse') || name.includes('rev') || name.includes('reversing')) {
      return <Binary className="w-5 h-5" />;
    }
    
    if (name.includes('osint')) {
      return <SearchIcon className="w-5 h-5" />;
    }
    
    if (name.includes('misc') || name.includes('miscellaneous')) {
      return <Package className="w-5 h-5" />;
    }
    
    if (name.includes('pwn') || name.includes('binary') || name.includes('exploitation') || 
        name.includes('machine') || name.includes('buffer') || name.includes('overflow') ||
        name.includes('rop') || name.includes('shellcode')) {
      return <Cpu className="w-5 h-5" />;
    }
    
    if (name.includes('steganography') || name.includes('stega')) {
      return <Image className="w-5 h-5" />;
    }
    
    if (name.includes('mobile') || name.includes('android') || name.includes('ios') ||
        name.includes('app') || name.includes('apk')) {
      return <Smartphone className="w-5 h-5" />;
    }
    
    if (name.includes('windows') || name.includes('linux') || name.includes('mac') ||
        name.includes('os') || name.includes('operating') || name.includes('kernel')) {
      return <Server className="w-5 h-5" />;
    }
    
    return <Shield className="w-5 h-5" />;
  };

  const getCategoryColor = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('web') || name.includes('xss') || name.includes('sqli') || 
        name.includes('csrf') || name.includes('ssrf') || name.includes('idor')) {
      return "from-blue-500 to-cyan-500";
    }
    
    if (name.includes('network') || name.includes('netsec') || name.includes('net') ||
        name.includes('wifi') || name.includes('wireless') || name.includes('packet')) {
      return "from-teal-500 to-green-500";
    }
    
    if (name.includes('forensic')) {
      return "from-orange-500 to-red-500";
    }
    
    if (name.includes('crypto') || name.includes('cryptography') || name.includes('encrypt')) {
      return "from-purple-500 to-pink-500";
    }
    
    if (name.includes('reverse') || name.includes('rev') || name.includes('reversing')) {
      return "from-indigo-500 to-purple-500";
    }
    
    if (name.includes('osint')) {
      return "from-green-500 to-emerald-500";
    }
    
    if (name.includes('misc') || name.includes('miscellaneous')) {
      return "from-gray-500 to-slate-500";
    }
    
    if (name.includes('pwn') || name.includes('binary') || name.includes('exploitation') || 
        name.includes('machine')) {
      return "from-red-500 to-rose-500";
    }
    
    if (name.includes('steganography') || name.includes('stega')) {
      return "from-pink-500 to-rose-500";
    }
    
    if (name.includes('mobile') || name.includes('android') || name.includes('ios')) {
      return "from-teal-500 to-cyan-500";
    }
    
    if (name.includes('windows') || name.includes('linux') || name.includes('mac') ||
        name.includes('os') || name.includes('operating')) {
      return "from-slate-500 to-gray-500";
    }
    
    return "from-gray-500 to-slate-500";
  };

  const getCategoryDescription = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('web') || name.includes('xss') || name.includes('sqli') || 
        name.includes('csrf') || name.includes('ssrf') || name.includes('idor')) {
      return "Web application vulnerabilities, XSS, SQL injection, CSRF, and more";
    }
    
    if (name.includes('network') || name.includes('netsec') || name.includes('net') ||
        name.includes('wifi') || name.includes('wireless') || name.includes('packet')) {
      return "Network protocols, packet analysis, wireless security, and network attacks";
    }
    
    if (name.includes('forensic')) {
      return "Digital forensics, file analysis, memory analysis, and data recovery";
    }
    
    if (name.includes('crypto') || name.includes('cryptography') || name.includes('encrypt')) {
      return "Cryptography, encryption algorithms, cryptographic attacks, and hashing";
    }
    
    if (name.includes('reverse') || name.includes('rev') || name.includes('reversing')) {
      return "Reverse engineering, malware analysis, and binary analysis";
    }
    
    if (name.includes('osint')) {
      return "Open Source Intelligence gathering and information analysis";
    }
    
    if (name.includes('misc') || name.includes('miscellaneous')) {
      return "Miscellaneous challenges covering various security topics";
    }
    
    if (name.includes('pwn') || name.includes('binary') || name.includes('exploitation') || 
        name.includes('machine')) {
      return "Binary exploitation, memory corruption, buffer overflows, and ROP chains";
    }
    
    if (name.includes('steganography') || name.includes('stega')) {
      return "Steganography, hidden data in files, and image analysis";
    }
    
    if (name.includes('mobile') || name.includes('android') || name.includes('ios')) {
      return "Mobile application security, APK analysis, and mobile OS vulnerabilities";
    }
    
    if (name.includes('windows') || name.includes('linux') || name.includes('mac') ||
        name.includes('os') || name.includes('operating')) {
      return "Operating system security, privilege escalation, and kernel exploits";
    }
    
    return "Cybersecurity writeups and solutions";
  };

  // Fetch writeups from Firestore
  const fetchWriteups = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching writeups from Firestore...');
      
      const writeupsRef = collection(db, 'writeups');
      
      // Try different query approaches
      let querySnapshot;
      
      try {
        // First try with the compound query
        const q = query(
          writeupsRef,
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        
        querySnapshot = await getDocs(q);
        console.log('Compound query successful, found:', querySnapshot.size, 'writeups');
      } catch (queryError: any) {
        console.warn('Compound query failed, trying simple query:', queryError.message);
        
        // If compound query fails, try a simple query without ordering
        if (queryError.code === 'failed-precondition' || queryError.code === 'invalid-argument') {
          // Try getting all writeups and filter client-side
          querySnapshot = await getDocs(writeupsRef);
          console.log('Simple query successful, found:', querySnapshot.size, 'documents');
        } else {
          throw queryError;
        }
      }
      
      const writeupsData: Writeup[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const writeup = convertToWriteup(doc.id, data);
        
        // If we used simple query, filter client-side
        if (writeup.status === 'approved') {
          writeupsData.push(writeup);
        }
      });
      
      console.log('Approved writeups:', writeupsData.length);
      setWriteups(writeupsData);
      generateCategories(writeupsData);
      
      if (writeupsData.length === 0) {
        console.log('No approved writeups found. This might be normal if none exist yet.');
      }
      
    } catch (err: any) {
      console.error('Error fetching writeups:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      // More specific error messages
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check if you have read access to writeups collection.');
      } else if (err.code === 'failed-precondition') {
        setError('Firestore index missing. Please create a composite index for writeups collection with status and createdAt fields.');
      } else {
        setError('Failed to load writeups. Please check your connection and try again.');
      }
      
      // Set empty arrays on error
      setWriteups([]);
      setCategories([]);
      setFilteredWriteups([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCategories = (writeups: Writeup[]) => {
    const categoryMap = new Map<string, number>();

    writeups.forEach(writeup => {
      const category = writeup.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const categoriesList: Category[] = Array.from(categoryMap.entries()).map(([name, count]) => {
      return {
        name,
        count,
        icon: getCategoryIcon(name),
        color: getCategoryColor(name),
        description: getCategoryDescription(name)
      };
    });

    // Sort categories by count (descending)
    categoriesList.sort((a, b) => b.count - a.count);
    setCategories(categoriesList);
  };

  // Filter writeups based on search and filters
  useEffect(() => {
    let filtered = writeups;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(writeup =>
        writeup.title.toLowerCase().includes(term) ||
        writeup.description.toLowerCase().includes(term) ||
        writeup.challengeTitle.toLowerCase().includes(term) ||
        writeup.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(writeup => writeup.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(writeup => writeup.difficulty === selectedDifficulty);
    }

    setFilteredWriteups(filtered);
  }, [searchTerm, selectedCategory, selectedDifficulty, writeups]);

  useEffect(() => {
    fetchWriteups();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/20 text-green-600 border-green-200';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-200';
      case 'hard':
        return 'bg-red-500/20 text-red-600 border-red-200';
      case 'expert':
        return 'bg-purple-500/20 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-200';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return "Easy";
      case 'medium': return "Medium";
      case 'hard': return "Hard";
      case 'expert': return "Expert";
      default: return difficulty;
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedDifficulty('all');
    setShowFilters(false);
  };

  const refreshWriteups = () => {
    fetchWriteups();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recent';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Recent';
    }
  };

  // Get real views from uniqueViews array length
  const getRealViews = (writeup: Writeup) => {
    return writeup.uniqueViews?.length || 0;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading writeups...</p>
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
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <BookOpen className="w-12 h-12 text-primary sm:w-16 sm:h-16" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Community Writeups
            </h1>
            <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Learn from other players' solutions and share your own approaches
            </p>

            {/* Error Display */}
            {error && (
              <Card className="max-w-2xl mx-auto mb-4 border-red-200 bg-red-50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-red-800 text-sm sm:text-base">{error}</p>
                      <p className="text-red-600 text-xs sm:text-sm mt-1">
                        Try refreshing the page or check your Firestore configuration.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshWriteups}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto mb-6">
              <Card className="text-center border">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{writeups.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Writeups</div>
                </CardContent>
              </Card>
              <Card className="text-center border">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {categories.length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Categories</div>
                </CardContent>
              </Card>
              <Link to="/writeups/my" className="block">
                <Card className="text-center border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex flex-col items-center gap-1">
                      <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <div className="text-lg sm:text-2xl font-bold text-blue-600">
                        {authUser ? 'My Writeups' : 'Log In'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {authUser ? 'View & Manage' : 'To access'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Create Writeup CTA */}
            <Card className="max-w-4xl mx-auto mb-6 border bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    <div className="text-left">
                      <h3 className="font-bold text-sm sm:text-lg">Share Your Solution!</h3>
                      <p className="text-muted-foreground text-xs sm:text-base">Help others learn from your approach</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link
                      to="/writeups/create"
                      className="bg-primary text-primary-foreground px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Create Writeup
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={refreshWriteups} 
                      size="sm"
                      className="sm:flex hidden"
                    >
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search writeups, tags, challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm border-2"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="h-10 w-10"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || selectedCategory || selectedDifficulty !== 'all') && (
              <div className="flex flex-wrap gap-2 mb-3">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchTerm}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Category: {selectedCategory}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory(null)} />
                  </Badge>
                )}
                {selectedDifficulty !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Difficulty: {selectedDifficulty}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDifficulty('all')} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                  Clear All
                </Button>
              </div>
            )}

            {/* Additional Filters Dropdown */}
            {showFilters && (
              <Card className="mt-2 border">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-background"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <select
                        className="w-full p-2 border rounded-lg bg-background"
                        defaultValue="newest"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="views">Most Viewed</option>
                        <option value="likes">Most Liked</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Category Selection */}
          {!selectedCategory && !error && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Browse by Category</h2>
                <Button variant="outline" onClick={refreshWriteups} size="sm">
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              {categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {categories.map((category) => (
                    <Card 
                      key={category.name}
                      className="border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleCategorySelect(category.name)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${category.color} rounded-lg p-2 sm:p-3 text-white`}>
                            {category.icon}
                          </div>
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-muted-foreground text-xs sm:text-sm mb-2">
                          {category.count} writeup{category.count !== 1 ? 's' : ''}
                        </p>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {category.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : writeups.length === 0 ? null : (
                <Card className="text-center border">
                  <CardContent className="p-8 sm:p-12">
                    <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                    <h3 className="text-lg sm:text-xl font-bold mb-2">No Categories Available</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      No writeups are currently available. Be the first to create one!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Writeups in Selected Category */}
          {selectedCategory && !error && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    size="sm"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
                    Back to Categories
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${getCategoryColor(selectedCategory)} rounded-lg p-2 text-white`}>
                      {getCategoryIcon(selectedCategory)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedCategory} Writeups</h2>
                      <p className="text-muted-foreground text-sm">
                        {filteredWriteups.length} writeup{filteredWriteups.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button variant="outline" onClick={clearFilters} size="sm" className="text-xs">
                    Clear
                  </Button>
                  <Button variant="outline" onClick={refreshWriteups} size="sm">
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>

              {filteredWriteups.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {filteredWriteups.map((writeup) => {
                    const realViews = getRealViews(writeup);
                    
                    return (
                      <Card 
                        key={writeup.id}
                        className="border hover:border-primary/50 hover:shadow-lg transition-all group"
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors flex-1 mr-2">
                              {writeup.title}
                            </h3>
                            <Badge className={`${getDifficultyColor(writeup.difficulty)} text-xs`}>
                              {getDifficultyText(writeup.difficulty)}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground text-sm mb-3 sm:mb-4 line-clamp-2">
                            {writeup.description}
                          </p>

                          <div className="flex items-center justify-between text-xs sm:text-sm mb-3">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{realViews} view{realViews !== 1 ? 's' : ''}</span>
                              </div>
                              {writeup.challengeTitle && (
                                <div className="text-muted-foreground truncate max-w-[150px] sm:max-w-[300px]">
                                  Challenge: {writeup.challengeTitle}
                                </div>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatDate(writeup.createdAt)}
                            </div>
                          </div>

                          {/* Tags */}
                          {writeup.tags && writeup.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {writeup.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                              {writeup.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{writeup.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between border-t pt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-[200px]">
                                {writeup.author?.name || 'Anonymous'}
                              </span>
                            </div>
                            <Link
                              to={`/writeups/${writeup.id}`}
                              className="bg-primary/10 text-primary border border-primary/20 py-1 px-3 rounded text-xs hover:bg-primary/20 transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Read
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="text-center border">
                  <CardContent className="p-8 sm:p-12">
                    <Search className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                    <h3 className="text-lg sm:text-xl font-bold mb-2">No Writeups Found</h3>
                    <p className="text-muted-foreground text-sm sm:text-base mb-3 sm:mb-4">
                      {searchTerm 
                        ? `No writeups match "${searchTerm}" in ${selectedCategory}`
                        : `No writeups available in ${selectedCategory}`
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button variant="outline" onClick={clearFilters} size="sm">
                        Clear Search
                      </Button>
                      <Link
                        to="/writeups/create"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center gap-2 justify-center text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Create Writeup
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State - No writeups at all */}
          {writeups.length === 0 && !loading && !selectedCategory && !error && (
            <Card className="text-center border">
              <CardContent className="p-8 sm:p-12">
                <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">No Writeups Available</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
                  Be the first to share your solution! Writeups will appear here after admin approval.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                  <Button variant="terminal" onClick={refreshWriteups} size="sm">
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Refresh
                  </Button>
                  <Link
                    to="/writeups/create"
                    className="bg-primary text-primary-foreground px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm sm:text-base justify-center"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    Create First Writeup
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Writeups;