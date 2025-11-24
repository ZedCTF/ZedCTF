import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, BookOpen, Clock, User, CheckCircle, XCircle, Eye, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface Writeup {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  challenge: string;
  category: string;
  difficulty: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  views: number;
  likes: number;
  tags: string[];
}

const Writeups = () => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [filteredWriteups, setFilteredWriteups] = useState<Writeup[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isAdmin] = useState(false); // This would come from user context

  // Fetch real writeups data
  const fetchWriteups = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const WRITEUPS_API = '/api/writeups';
      
      const response = await fetch(WRITEUPS_API);
      
      if (response.ok) {
        const writeupsData = await response.json();
        setWriteups(writeupsData);
        setFilteredWriteups(writeupsData);
        
        // Extract unique categories and difficulties from actual data
        const uniqueCategories = Array.from(new Set(writeupsData.map((writeup: Writeup) => writeup.category))).filter(Boolean) as string[];
        const uniqueDifficulties = Array.from(new Set(writeupsData.map((writeup: Writeup) => writeup.difficulty))).filter(Boolean) as string[];
        
        setCategories(uniqueCategories);
        setDifficulties(uniqueDifficulties);
      } else {
        setWriteups([]);
        setFilteredWriteups([]);
        setCategories([]);
        setDifficulties([]);
      }
    } catch (err) {
      setWriteups([]);
      setFilteredWriteups([]);
      setCategories([]);
      setDifficulties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWriteups();
  }, []);

  // Filter writeups based on search and filters
  useEffect(() => {
    let filtered = writeups;

    if (searchTerm) {
      filtered = filtered.filter(writeup =>
        writeup.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        writeup.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        writeup.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(writeup => writeup.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(writeup => writeup.difficulty === selectedDifficulty);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(writeup => writeup.status === selectedStatus);
    }

    setFilteredWriteups(filtered);
  }, [searchTerm, selectedCategory, selectedDifficulty, selectedStatus, writeups]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'medium':
        return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'hard':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'insane':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'expert':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'beginner':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading writeups...</p>
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
        <div className="container px-4 mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-4">
              Community <span className="text-primary">Writeups</span>
            </h2>
            <p className="text-muted-foreground">
              Learn from other players' solutions and share your own approaches
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-muted/20 border border-border rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search writeups, tags, challenges..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Category Filter - Only show if categories exist */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter - Only show if difficulties exist */}
              <div>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="all">All Difficulties</option>
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Admin Status Filter */}
            {isAdmin && (
              <div className="mt-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full md:w-auto px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          {/* Create Writeup Button */}
          <div className="flex justify-end mb-6">
            <Link
              to="/writeups/create"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Writeup
            </Link>
          </div>

          {/* Writeups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWriteups.map((writeup) => (
              <div
                key={writeup.id}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
              >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(writeup.difficulty)}`}>
                    {writeup.difficulty}
                  </span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(writeup.status)}
                    <span className="text-xs text-muted-foreground capitalize">{writeup.status}</span>
                  </div>
                </div>

                {/* Category */}
                <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded border border-primary/20 mb-3">
                  {writeup.category}
                </span>

                {/* Title */}
                <h3 className="text-xl font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {writeup.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {writeup.description}
                </p>

                {/* Challenge Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <BookOpen className="w-4 h-4" />
                  <span>Challenge: {writeup.challenge}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {writeup.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                  {writeup.tags.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border border-border">
                      +{writeup.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{writeup.author.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{writeup.views}</span>
                    </div>
                    <span>{new Date(writeup.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Link
                    to={`/writeups/${writeup.id}`}
                    className="flex-1 bg-primary/10 text-primary border border-primary/20 py-2 px-4 rounded-lg text-center hover:bg-primary/20 transition-colors"
                  >
                    Read
                  </Link>
                  {isAdmin && writeup.status === 'pending' && (
                    <>
                      <button className="flex-1 bg-green-500/10 text-green-500 border border-green-500/20 py-2 px-4 rounded-lg hover:bg-green-500/20 transition-colors">
                        Approve
                      </button>
                      <button className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2 px-4 rounded-lg hover:bg-red-500/20 transition-colors">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredWriteups.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No writeups found</h3>
              <p className="text-muted-foreground mb-6">
                {writeups.length === 0 
                  ? 'No writeups have been submitted yet. Be the first to share your solution!'
                  : 'Try adjusting your search or filters'
                }
              </p>
              <Link
                to="/writeups/create"
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create First Writeup
              </Link>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Writeups;