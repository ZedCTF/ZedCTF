// src/components/Practice.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield, Zap, Users, Clock, RefreshCw, AlertCircle, FolderOpen, ChevronRight, Filter, X } from "lucide-react";
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
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    setShowFilters(false);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowFilters(false);
  };
  
  // Calculate the number of challenges the current user has solved
  const mySolvesCount = challenges.reduce((sum, challenge) => {
    // Check if the current user's ID is in the solvedBy array
    const isSolvedByMe = challenge.solvedBy?.includes(user?.uid as string) || false;
    // Add 1 to the count if the user solved it, otherwise add 0
    return sum + (isSolvedByMe ? 1 : 0);
  }, 0);

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
        <div className="container mx-auto px-4 py-6">
          {/* Header - Mobile Optimized */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Shield className="w-12 h-12 text-primary sm:w-16 sm:h-16" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Practice Challenges
            </h1>
            <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Master your cybersecurity skills with hands-on challenges
            </p>
            
            {/* Error Display */}
            {error && (
              <Card className="max-w-2xl mx-auto mb-4 border-red-200 bg-red-50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    <p className="text-red-800 text-sm sm:text-base">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats - Mobile Optimized */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto mb-6">
              <Card className="text-center border">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{challenges.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Challenges</div>
                </CardContent>
              </Card>
              {/* === START MODIFIED SECTION === */}
              <Card className="text-center border">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {/* Changed calculation to use mySolvesCount */}
                    {mySolvesCount}
                  </div>
                  {/* Changed label from "Solves" to "My Solves" */}
                  <div className="text-xs sm:text-sm text-muted-foreground"> My Solves</div> 
                </CardContent>
              </Card>
              {/* === END MODIFIED SECTION === */}
              <Card className="text-center border">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{categories.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Categories</div>
                </CardContent>
              </Card>
            </div>

            {/* Live Events CTA - Mobile Optimized */}
            <Card className="max-w-4xl mx-auto mb-6 border bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    <div className="text-left">
                      <h3 className="font-bold text-sm sm:text-lg">Ready for Live Competition?</h3>
                      <p className="text-muted-foreground text-xs sm:text-base">Test your skills in real-time events!</p>
                    </div>
                  </div>
                  <Button variant="terminal" onClick={navigateToLiveEvents} size="sm" className="w-full sm:w-auto">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Live Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar - Mobile Optimized */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search challenges..."
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
            {(searchTerm || selectedCategory) && (
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
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Category Selection - Mobile Optimized */}
          {!selectedCategory && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Choose a Category</h2>
                <Button variant="outline" onClick={refreshChallenges} size="sm">
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
                          <div className={`text-xl sm:text-2xl bg-gradient-to-r ${category.color} rounded-lg p-2 sm:p-3`}>
                            {category.icon}
                          </div>
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {category.count} challenge{category.count !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center border">
                  <CardContent className="p-8 sm:p-12">
                    <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                    <h3 className="text-lg sm:text-xl font-bold mb-2">No Categories Available</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      No practice challenges are currently available. Check back later!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Challenges in Selected Category - Mobile Optimized */}
          {selectedCategory && (
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
                    Back
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCategory} Challenges</h2>
                    <p className="text-muted-foreground text-sm">
                      {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button variant="outline" onClick={clearFilters} size="sm" className="text-xs">
                    Clear
                  </Button>
                  <Button variant="outline" onClick={refreshChallenges} size="sm">
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>

              {filteredChallenges.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {filteredChallenges.map((challenge) => (
                    <Card 
                      key={challenge.id}
                      className="border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => navigateToChallenge(challenge.id)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors flex-1 mr-2">
                            {challenge.title}
                          </h3>
                          <Badge className={`${getDifficultyColor(challenge.difficulty)} text-xs`}>
                            {getDifficultyText(challenge.difficulty)}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3 sm:mb-4 line-clamp-2">
                          {challenge.description}
                        </p>

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{challenge.solvedBy?.length || 0}</span>
                            </div>
                            <Badge variant="outline" className="font-mono font-bold text-xs">
                              {challenge.totalPoints || challenge.points} pts
                            </Badge>
                          </div>
                          {challenge.createdAt && (
                            <div className="text-muted-foreground text-xs">
                              {challenge.createdAt?.toDate?.()?.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              }) || 
                              new Date(challenge.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center border">
                  <CardContent className="p-8 sm:p-12">
                    <Search className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                    <h3 className="text-lg sm:text-xl font-bold mb-2">No Challenges Found</h3>
                    <p className="text-muted-foreground text-sm sm:text-base mb-3 sm:mb-4">
                      {searchTerm 
                        ? `No challenges match "${searchTerm}" in ${selectedCategory}`
                        : `No challenges available in ${selectedCategory}`
                      }
                    </p>
                    <Button variant="outline" onClick={clearFilters} size="sm">
                      Clear Search
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State - No challenges at all */}
          {challenges.length === 0 && !loading && !selectedCategory && (
            <Card className="text-center border">
              <CardContent className="p-8 sm:p-12">
                <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">No Practice Challenges Available</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
                  Check back later for new practice challenges, or join a live event to test your skills.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                  <Button variant="terminal" onClick={refreshChallenges} size="sm">
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={navigateToLiveEvents} size="sm">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
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
