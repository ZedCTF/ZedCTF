import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Dashboard from "@/components/Dashboard";
import Practice from "@/components/Practice";
import LiveEvents from "@/components/LiveEvents";
import Leaderboard from "@/components/Leaderboard";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Dashboard />
      <Practice />
      <LiveEvents />
      <Leaderboard />
      <Footer />
    </div>
  );
};

export default Index;
