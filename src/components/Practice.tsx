// src/components/Practice.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Star, Shield, Zap, Users, Clock, RefreshCw, AlertCircle } from "lucide-react";
import Navbar from "./Navbar"; // Add this import
import Footer from "./Footer"; // Add this import

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

const Practice = () => {
  const { user } = useAuthContext();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [featuredChallenges, setFeaturedChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [error, setError] = useState<string>("");

  // Base URL for navigation
  const BASE_URL = "/ZedCTF";

  useEffect(() => {
    fetchPracticeChallenges();
  }, []);

  useEffect(() => {
    filterAndSortChallenges();
  }, [searchTerm, filterCategory, filterDifficulty, sortBy, challenges]);

  const fetchPracticeChallenges = async () => {
    try {
      setLoading(true);
      setError("");

      // First, try to get all active challenges and filter client-side
      // This works around Firestore query limitations
      const activeChallengesQuery = query(
        collection(db, "challenges"),
        where("isActive", "==", true)
      );

      const challengesSnapshot = await getDocs(activeChallengesQuery);
      const allActiveChallenges = challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];

      // Filter for practice-available challenges client-side
      const practiceChallenges = allActiveChallenges.filter(challenge => 
        challenge.availableInPractice === true
      );

      setChallenges(practiceChallenges);
      
      // Extract featured challenges
      const featured = practiceChallenges.filter(challenge => 
        challenge.featuredOnPractice === true
      );
      setFeaturedChallenges(featured);

    } catch (error) {
      console.error("Error fetching practice challenges:", error);
      setError("Failed to load challenges. Please check your permissions.");
      
      // Fallback: try a simpler query
      try {
        const simpleQuery = query(collection(db, "challenges"));
        const simpleSnapshot = await getDocs(simpleQuery);
        const simpleData = simpleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Challenge[];
        
        // Filter client-side for active and practice-available
        const availableChallenges = simpleData.filter(challenge => 
          challenge.isActive !== false && challenge.availableInPractice === true
        );
        
        setChallenges(availableChallenges);
        setFeaturedChallenges(availableChallenges.filter(ch => ch.featuredOnPractice));
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortChallenges = () => {
    let filtered = [...challenges];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (challenge.finalCategory || challenge.category).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(challenge => 
        (challenge.finalCategory || challenge.category) === filterCategory
      );
    }

    // Difficulty filter
    if (filterDifficulty !== "all") {
      filtered = filtered.filter(challenge => challenge.difficulty === filterDifficulty);
    }

    // Sort challenges
    switch (sortBy) {
      case "featured":
        filtered = filtered.sort((a, b) => {
          const aFeatured = a.featuredOnPractice === true;
          const bFeatured = b.featuredOnPractice === true;
          if (aFeatured && !bFeatured) return -1;
          if (!aFeatured && bFeatured) return 1;
          return (b.totalPoints || b.points) - (a.totalPoints || a.points);
        });
        break;
      case "points_high":
        filtered = filtered.sort((a, b) => (b.totalPoints || b.points) - (a.totalPoints || a.points));
        break;
      case "points_low":
        filtered = filtered.sort((a, b) => (a.totalPoints || a.points) - (b.totalPoints || b.points));
        break;
      case "newest":
        filtered = filtered.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case "solves":
        filtered = filtered.sort((a, b) => (b.solvedBy?.length || 0) - (a.solvedBy?.length || 0));
        break;
      default:
        break;
    }

    setFilteredChallenges(filtered);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard": return "bg-red-100 text-red-800 border-red-200";
      case "expert": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      web: "bg-blue-100 text-blue-800 border-blue-200",
      crypto: "bg-purple-100 text-purple-800 border-purple-200",
      forensics: "bg-orange-100 text-orange-800 border-orange-200",
      pwn: "bg-red-100 text-red-800 border-red-200",
      reversing: "bg-indigo-100 text-indigo-800 border-indigo-200",
      misc: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getUniqueCategories = () => {
    const categories = challenges.map(challenge => challenge.finalCategory || challenge.category);
    return Array.from(new Set(categories)).filter(Boolean);
  };

  const navigateToChallenge = (challengeId: string) => {
    window.location.href = `${BASE_URL}/challenge/${challengeId}`;
  };

  const navigateToLiveEvents = () => {
    window.location.href = `${BASE_URL}/live-events`;
  };

  const refreshChallenges = () => {
    fetchPracticeChallenges();
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
            <h1 className="text-4xl font-bold mb-4">Practice Challenges</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
              Sharpen your cybersecurity skills with our curated collection of practice challenges. 
              Perfect for beginners and experts alike.
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
              <Card className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{challenges.length}</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">{featuredChallenges.length}</div>
                  <div className="text-sm text-muted-foreground">Featured</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {challenges.reduce((sum, challenge) => sum + (challenge.solvedBy?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Solves</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{getUniqueCategories().length}</div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </CardContent>
              </Card>
            </div>

            {/* Live Events CTA */}
            <Card className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Zap className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Ready for Live Competition?</h3>
                      <p className="text-muted-foreground">Join our live events to compete against other players!</p>
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

          {/* Rest of the component remains the same */}
          {/* Search and Filters */}
          {challenges.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search challenges..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Category Filter */}
                  <div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories().map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Difficulty Filter */}
                  <div>
                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Difficulties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Featured First</SelectItem>
                        <SelectItem value="points_high">Points (High to Low)</SelectItem>
                        <SelectItem value="points_low">Points (Low to High)</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="solves">Most Solved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Featured Challenges Section */}
          {featuredChallenges.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">Featured Challenges</h2>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Recommended
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredChallenges.map((challenge) => (
                  <Card 
                    key={challenge.id} 
                    className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-transparent hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => navigateToChallenge(challenge.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {challenge.title}
                        </CardTitle>
                        <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-2" />
                      </div>
                      <CardDescription className="line-clamp-2">
                        {challenge.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                        <Badge className={getCategoryColor(challenge.finalCategory || challenge.category)}>
                          {challenge.finalCategory || challenge.category}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          {challenge.totalPoints || challenge.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{challenge.solvedBy?.length || 0} solves</span>
                        </div>
                        {challenge.createdAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                               new Date(challenge.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Challenges Section */}
          {challenges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {featuredChallenges.length > 0 ? "All Practice Challenges" : "Practice Challenges"}
                </h2>
                <Button variant="outline" onClick={refreshChallenges} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              {filteredChallenges.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">No Challenges Match Filters</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filters to find more challenges.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("");
                        setFilterCategory("all");
                        setFilterDifficulty("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredChallenges.map((challenge) => (
                    <Card 
                      key={challenge.id}
                      className={`hover:shadow-md transition-all cursor-pointer group ${
                        challenge.featuredOnPractice ? 'border-yellow-200 bg-yellow-50/30' : 'border-border'
                      }`}
                      onClick={() => navigateToChallenge(challenge.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {challenge.title}
                          </CardTitle>
                          {challenge.featuredOnPractice && (
                            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {challenge.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={getDifficultyColor(challenge.difficulty)}>
                            {challenge.difficulty}
                          </Badge>
                          <Badge className={getCategoryColor(challenge.finalCategory || challenge.category)}>
                            {challenge.finalCategory || challenge.category}
                          </Badge>
                          <Badge variant="outline" className="font-mono">
                            {challenge.totalPoints || challenge.points} pts
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{challenge.solvedBy?.length || 0} solves</span>
                          </div>
                          {challenge.createdAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {challenge.createdAt?.toDate?.()?.toLocaleDateString() || 
                                new Date(challenge.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State - No challenges at all */}
          {challenges.length === 0 && !loading && (
            <Card className="text-center">
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