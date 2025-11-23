import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, Filter, Plus, BookOpen, Clock, User, CheckCircle, XCircle, Eye } from 'lucide-react';

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
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  views: number;
  likes: number;
  tags: string[];
}

const Writeups = () => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [filteredWriteups, setFilteredWriteups] = useState<Writeup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAdmin] = useState(false); // This would come from user context

  const categories = ['Web', 'Cryptography', 'Forensics', 'Reverse Engineering', 'Pwn', 'Misc', 'All'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Insane', 'All'];

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockWriteups: Writeup[] = [
      {
        id: '1',
        title: 'Buffer Overflow Exploitation in CTF Challenges',
        description: 'A comprehensive guide to understanding and exploiting buffer overflow vulnerabilities in capture the flag competitions.',
        content: 'Full writeup content here...',
        author: {
          id: '1',
          name: 'cyber_hacker',
          avatar: 'https://github.com/github.png'
        },
        challenge: 'Stack Smasher',
        category: 'Pwn',
        difficulty: 'Hard',
        status: 'approved',
        createdAt: '2024-01-15',
        views: 1247,
        likes: 89,
        tags: ['buffer-overflow', 'exploitation', 'gdb', 'rop']
      },
      {
        id: '2',
        title: 'SQL Injection Masterclass',
        description: 'Learn advanced SQL injection techniques with real CTF examples and bypass methods.',
        content: 'Full writeup content here...',
        author: {
          id: '2',
          name: 'web_wizard',
          avatar: 'https://github.com/github.png'
        },
        challenge: 'Injection Lab',
        category: 'Web',
        difficulty: 'Medium',
        status: 'approved',
        createdAt: '2024-01-10',
        views: 892,
        likes: 67,
        tags: ['sql-injection', 'web', 'bypass', 'authentication']
      },
      {
        id: '3',
        title: 'Advanced Cryptanalysis Techniques',
        description: 'Breaking modern cryptographic implementations in CTF challenges.',
        content: 'Full writeup content here...',
        author: {
          id: '3',
          name: 'crypto_master',
          avatar: 'https://github.com/github.png'
        },
        challenge: 'RSA Madness',
        category: 'Cryptography',
        difficulty: 'Insane',
        status: 'pending',
        createdAt: '2024-01-12',
        views: 0,
        likes: 0,
        tags: ['rsa', 'cryptography', 'factorization', 'private-key']
      }
    ];
    setWriteups(mockWriteups);
    setFilteredWriteups(mockWriteups);
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
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Hard':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Insane':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">ZedCTF Write-ups</span>
            </div>
            <Link
              to="/writeups/create"
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Write-up
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search write-ups, tags, challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="all">All Categories</option>
                {categories.filter(cat => cat !== 'All').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="all">All Difficulties</option>
                {difficulties.filter(diff => diff !== 'All').map(difficulty => (
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
                className="w-full md:w-auto px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>

        {/* Write-ups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWriteups.map((writeup) => (
            <div
              key={writeup.id}
              className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 hover:transform hover:scale-105 group"
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(writeup.difficulty)}`}>
                  {writeup.difficulty}
                </span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(writeup.status)}
                  <span className="text-xs text-gray-400 capitalize">{writeup.status}</span>
                </div>
              </div>

              {/* Category */}
              <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 mb-3">
                {writeup.category}
              </span>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors line-clamp-2">
                {writeup.title}
              </h3>

              {/* Description */}
              <p className="text-gray-300 mb-4 line-clamp-3">
                {writeup.description}
              </p>

              {/* Challenge Info */}
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <BookOpen className="w-4 h-4" />
                <span>Challenge: {writeup.challenge}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {writeup.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded border border-gray-600/50"
                  >
                    #{tag}
                  </span>
                ))}
                {writeup.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded border border-gray-600/50">
                    +{writeup.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-600/50">
                <div className="flex items-center gap-2">
                  <img
                    src={writeup.author.avatar}
                    alt={writeup.author.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-gray-300">{writeup.author.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
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
                  className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 py-2 px-4 rounded-lg text-center hover:bg-green-500/30 transition-colors"
                >
                  Read
                </Link>
                {isAdmin && writeup.status === 'pending' && (
                  <>
                    <button className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 py-2 px-4 rounded-lg hover:bg-green-500/30 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 py-2 px-4 rounded-lg hover:bg-red-500/30 transition-colors">
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
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No write-ups found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            <Link
              to="/writeups/create"
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Write-up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Writeups;