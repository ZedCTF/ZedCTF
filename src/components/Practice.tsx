import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Code, Database, Shield, Globe, Loader, Calendar, Users, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface Category {
  id: string;
  name: string;
  icon: string;
  challengeCount: number;
  description?: string;
  isCustom?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  points: number;
  solvedCount: number;
  category: string;
  completed: boolean;
  description?: string;
  tags?: string[];
  source: "practice" | "past_event";
  eventName?: string;
  originalEventDate?: string;
  author?: string;
  type?: string;
}

const Practice = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);

  // Fetch categories and challenges from backend
  const fetchPracticeData = async () => {
    try {
      setLoading(true);
      
      // Replace with your actual API endpoints
      const CATEGORIES_API = '/api/practice/categories';
      const CHALLENGES_API = '/api/practice/challenges';

      const [categoriesResponse, challengesResponse] = await Promise.all([
        fetch(CATEGORIES_API),
        fetch(CHALLENGES_API)
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }

      if (challengesResponse.ok) {
        const challengesData = await challengesResponse.json();
        setChallenges(challengesData);
        setFilteredChallenges(challengesData);
        
        // Extract unique types and difficulties from real data
        const types = Array.from(new Set(challengesData.map((ch: Challenge) => ch.type).filter(Boolean)));
        const difficulties = Array.from(new Set(challengesData.map((ch: Challenge) => ch.difficulty).filter(Boolean)));
        
        setAvailableTypes(types as string[]);
        setAvailableDifficulties(difficulties as string[]);
      } else {
        setChallenges([]);
        setFilteredChallenges([]);
        setAvailableTypes([]);
        setAvailableDifficulties([]);
      }
    } catch (err) {
      setCategories([]);
      setChallenges([]);
      setFilteredChallenges([]);
      setAvailableTypes([]);
      setAvailableDifficulties([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter challenges based on current filters
  useEffect(() => {
    if (challenges.length === 0) return;

    let filtered = challenges;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(challenge => challenge.category === selectedCategory);
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(challenge => challenge.type === selectedType);
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(challenge => challenge.difficulty === selectedDifficulty);
    }

    setFilteredChallenges(filtered);
  }, [challenges, searchQuery, selectedCategory, selectedType, selectedDifficulty]);

  const startChallenge = async (challengeId: string) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/practice/challenges/${challengeId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        window.location.href = `/challenge/${challengeId}`;
      }
    } catch (error) {
      console.error('Failed to start challenge:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-primary/20 text-primary border-primary/30";
      case "medium": return "bg-secondary/20 text-secondary border-secondary/30";
      case "hard": return "bg-destructive/20 text-destructive border-destructive/30";
      case "expert": return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  useEffect(() => {
    fetchPracticeData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <section id="practice" className="pt-24 pb-16 min-h-screen">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading challenges...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const totalChallenges = challenges.length;

  return (
    <>
      <Navbar />
      <section id="practice" className="pt-24 pb-16 min-h-screen">
        <div className="container px-4 mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">
              Challenge <span className="text-primary">Library</span>
            </h2>
            <p className="text-muted-foreground">
              {totalChallenges > 0 
                ? `Browse and search through ${totalChallenges} cybersecurity challenges` 
                : 'No challenges available yet. Challenges will appear here once they are added by administrators.'
              }
            </p>
          </div>

          {/* Search and Filter Bar - Only show if we have challenges */}
          {totalChallenges > 0 && (
            <Card className="border-border mb-8">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by keyword or challenge..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Type Filter - Only show if types exist */}
                  {availableTypes.length > 0 && (
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {availableTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Category Filter - Only show if categories exist */}
                  {categories.length > 0 && (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Difficulty Filter - Only show if difficulties exist */}
                  {availableDifficulties.length > 0 && (
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        {availableDifficulties.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {difficulty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Active Filters Display */}
                {(selectedCategory !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {searchQuery && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        Search: "{searchQuery}"
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSearchQuery('')}
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                    {selectedType !== 'all' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        Type: {selectedType}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedType('all')}
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        Category: {categories.find(c => c.id === selectedCategory)?.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedCategory('all')}
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                    {selectedDifficulty !== 'all' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        Difficulty: {selectedDifficulty}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedDifficulty('all')}
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedType('all');
                        setSelectedCategory('all');
                        setSelectedDifficulty('all');
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          {totalChallenges > 0 && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-muted-foreground">
                  Showing {filteredChallenges.length} of {totalChallenges} challenges
                </span>
              </div>
            </div>
          )}

          {/* Challenges List */}
          <Card className="border-border">
            <CardContent className="p-0">
              {totalChallenges === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No challenges available</p>
                  <p className="text-sm">
                    Challenges will appear here once they are added by administrators.
                    Check back later or contact the platform administrators.
                  </p>
                </div>
              ) : filteredChallenges.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No challenges found</p>
                  <p className="text-sm">
                    Try adjusting your search criteria or filters
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setSelectedCategory('all');
                      setSelectedDifficulty('all');
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChallenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-muted/10 transition-all"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {challenge.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                        ) : (
                          <Shield className="w-6 h-6 text-muted-foreground mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg mb-2">{challenge.title}</div>
                          {challenge.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {challenge.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getDifficultyColor(challenge.difficulty)}>
                              {challenge.difficulty}
                            </Badge>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {challenge.category}
                            </Badge>
                            {challenge.type && (
                              <Badge variant="secondary">
                                {challenge.type}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {challenge.solvedCount} solved
                            </span>
                            {challenge.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 md:ml-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            {challenge.points}
                          </div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                        <Button 
                          variant={challenge.completed ? "outline" : "neon"} 
                          size="sm"
                          onClick={() => startChallenge(challenge.id)}
                        >
                          {challenge.completed ? "Review" : "Start"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Practice;