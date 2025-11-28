import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Users, Globe, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Leaderboard = () => {
  const navigate = useNavigate();

  const navigateBack = () => {
    navigate("/");
  };

  return (
    <>
      <Navbar />
      
      <section className="pt-20 lg:pt-24 pb-16 bg-background min-h-screen">
        <div className="container px-4 mx-auto">
          <div className="mb-8 lg:mb-12">
            <Button 
              variant="ghost" 
              onClick={navigateBack}
              className="mb-6 -ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="text-center">
              <Trophy className="w-16 h-16 lg:w-20 lg:h-20 text-primary mx-auto mb-4" />
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">
                Leaderboards
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Track performance across the platform and live competitions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {/* Global Leaderboard Card */}
            <Card 
              className="border-border hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={() => navigate("/leaderboard/global")}
            >
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div>Global Leaderboard</div>
                    <div className="text-sm font-normal text-muted-foreground mt-1">
                      All-time platform rankings
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>All platform users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span>Lifetime points accumulation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 flex items-center justify-center">🏆</span>
                    <span>Top performers across all events</span>
                  </div>
                </div>
                <Button className="w-full mt-6">
                  View Global Rankings
                </Button>
              </CardContent>
            </Card>

            {/* Live CTF Leaderboard Card */}
            <Card 
              className="border-border hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={() => navigate("/leaderboard/live")}
            >
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div>Live CTF Leaderboard</div>
                    <div className="text-sm font-normal text-muted-foreground mt-1">
                      Active competition rankings
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>Current live events only</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>Real-time score updates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 flex items-center justify-center">⚡</span>
                    <span>Active competition tracking</span>
                  </div>
                </div>
                <Button className="w-full mt-6">
                  View Live Rankings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <Card className="border-border bg-muted/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">About Leaderboards</h3>
                <p className="text-sm text-muted-foreground">
                  Global leaderboard tracks overall platform performance across all events and challenges. 
                  Live CTF leaderboard shows real-time rankings for currently active competitions only.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Leaderboard;