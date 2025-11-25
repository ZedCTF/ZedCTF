// src/components/Practice.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom"; // Add this import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield, Zap, Users, Clock, RefreshCw, AlertCircle, FolderOpen, ChevronRight } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  solvedBy: string[];
  finalCategory?: string;
  hasMultipleQuestions?: boolean;
  questions?: any[];
  flag?: string;
  flagFormat?: string;
  hints?: string[];
  files?: any[];
  originalCreator?: {
    name: string;
    url: string;
  };
  attribution?: any;
  featuredOnPractice?: boolean;
  availableInPractice?: boolean;
  challengeType?: 'practice' | 'live' | 'past_event';
  totalPoints?: number;
}

interface Category {
  name: string;
  count: number;
  icon: string;
  color: string;
  description: string;
}

const Practice = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate(); // Add this
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPracticeChallenges();
  }, []);

  useEffect(() => {
    filterChallenges();
  }, [searchTerm, selectedCategory, challenges]);

  const fetchPracticeChallenges = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all active challenges available in practice
      const activeChallengesQuery = query(
        collection(db, "challenges"),
        where("isActive", "==", true),
        where("availableInPractice", "==", true)
      );

      const challengesSnapshot = await getDocs(activeChallengesQuery);
      const practiceChallenges = challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];

      setChallenges(practiceChallenges);
      generateCategories(practiceChallenges);

    } catch (error) {
      console.error("Error fetching practice challenges:", error);
      setError("Failed to load challenges. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const generateCategories = (challenges: Challenge[]) => {
    const categoryMap = new Map<string, number>();
    
    challenges.forEach(challenge => {
      const category = challenge.finalCategory || challenge.category;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const categoryData: { [key: string]: { color: string; icon: string; description: string } } = {
      web: {
        color: "from-blue-500 to-cyan-500",
        icon: "🌐",
        description: "Web application security, SQL injection, XSS, and more"
      },
      crypto: {
        color: "from-purple-500 to-pink-500", 
        icon: "🔐",
        description: "Cryptography, encryption, and cryptographic attacks"
      },
      forensics: {
        color: "from-orange-500 to-red-500",
        icon: "🔍",
        description: "Digital forensics, file analysis, and data recovery"
      },
      pwn: {
        color: "from-red-500 to-rose-500",
        icon: "💥", 
        description: "Binary exploitation, memory corruption, and reverse engineering"
      },
      reversing: {
        color: "from-indigo-500 to-purple-500",
        icon: "⚡",
        description: "Reverse engineering and malware analysis"
      },
      misc: {
        color: "from-gray-500 to-slate-500",
        icon: "📦",
        description: "Miscellaneous challenges and various security topics"
      }
    };

    const categoriesList: Category[] = Array.from(categoryMap.entries()).map(([name, count]) => {
      const categoryInfo = categoryData[name.toLowerCase()] || {
        color: "from-gray-500 to-slate-500",
        icon: "📁",
        description: "Various security challenges"
      };
      
      return {
        name,
        count,
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        description: categoryInfo.description
      };
    });

    // Sort categories by count (descending)
    categoriesList.sort((a, b) => b.count - a.count);
    setCategories(categoriesList);
  };

  const filterChallenges = () => {
    let filtered = [...challenges];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(challenge => 
        (challenge.finalCategory || challenge.category) === selectedCategory
      );
    }

    // Sort by points (highest first)
    filtered = filtered.sort((a, b) => (b.totalPoints || b.points) - (a.totalPoints || a.points));

    setFilteredChallenges(filtered);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/20 text-green-600 border-green-200";
      case "medium": return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
      case "hard": return "bg-red-500/20 text-red-600 border-red-200";
      case "expert": return "bg-purple-500/20 text-purple-600 border-purple-200";
      default: return "bg-gray-500/20 text-gray-600 border-gray-200";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "Easy";
      case "medium": return "Medium";
      case "hard": return "Hard";
      case "expert": return "Expert";
      default: return difficulty;
    }
  };

  // FIXED: Use navigate instead of window.location.href
  const navigateToChallenge = (challengeId: string) => {
    navigate(`/challenge/${challengeId}`);
  };

  const navigateToLiveEvents = () => {
    navigate("/live");
  };

  const refreshChallenges = () => {
    fetchPracticeChallenges();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading practice challenges...</p>
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
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <Shield className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Practice Challenges
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
              Master your cybersecurity skills with hands-on challenges across different categories
            </p>
            
            {/* Error Display */}
            {error && (
              <Card className="max-w-2xl mx-auto mb-6 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <Card className="text-center border-2">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{challenges.length}</div>
                  <div className="text-sm text-muted-foreground">Total Challenges</div>
                </CardContent>
              </Card>
              <Card className="text-center border-2">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {challenges.reduce((sum, challenge) => sum + (challenge.solvedBy?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Solves</div>
                </CardContent>
              </Card>
              <Card className="text-center border-2">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </CardContent>
              </Card>
            </div>

            {/* Live Events CTA */}
            <Card className="max-w-4xl mx-auto mb-8 border-2 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Zap className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Ready for Live Competition?</h3>
                      <p className="text-muted-foreground">Test your skills against other players in real-time events!</p>
                    </div>
                  </div>
                  <Button variant="terminal" onClick={navigateToLiveEvents}>
                    <Zap className="w-4 h-4 mr-2" />
                    View Live Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search challenges by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg border-2"
              />
            </div>
          </div>

          {/* Category Selection */}
          {!selectedCategory && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Choose a Category</h2>
                <Button variant="outline" onClick={refreshChallenges} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {categories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <Card 
                      key={category.name}
                      className="border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`text-2xl bg-gradient-to-r ${category.color} rounded-lg p-3`}>
                            {category.icon}
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {category.count} challenge{category.count !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center border-2">
                  <CardContent className="p-12">
                    <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">No Categories Available</h3>
                    <p className="text-muted-foreground">
                      No practice challenges are currently available. Check back later!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Challenges in Selected Category */}
          {selectedCategory && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Categories
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCategory} Challenges</h2>
                    <p className="text-muted-foreground">
                      {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear Filters
                  </Button>
                  <Button variant="outline" onClick={refreshChallenges} size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {filteredChallenges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredChallenges.map((challenge) => (
                    <Card 
                      key={challenge.id}
                      className="border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => navigateToChallenge(challenge.id)} // FIXED: Using navigate
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                            {challenge.title}
                          </h3>
                          <Badge className={getDifficultyColor(challenge.difficulty)}>
                            {getDifficultyText(challenge.difficulty)}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {challenge.description}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{challenge.solvedBy?.length || 0}</span>
                            </div>
                            <Badge variant="outline" className="font-mono font-bold">
                              {challenge.totalPoints || challenge.points} pts
                            </Badge>
                          </div>
                          {challenge.createdAt && (
                            <div className="text-muted-foreground">
                              {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                               new Date(challenge.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center border-2">
                  <CardContent className="p-12">
                    <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">No Challenges Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? `No challenges match "${searchTerm}" in ${selectedCategory}`
                        : `No challenges available in ${selectedCategory}`
                      }
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Search
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State - No challenges at all */}
          {challenges.length === 0 && !loading && !selectedCategory && (
            <Card className="text-center border-2">
              <CardContent className="p-12">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Practice Challenges Available</h3>
                <p className="text-muted-foreground mb-6">
                  Check back later for new practice challenges, or join a live event to test your skills.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="terminal" onClick={refreshChallenges}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={navigateToLiveEvents}>
                    <Zap className="w-4 h-4 mr-2" />
                    View Live Events
                  </Button>
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

export default Practice;