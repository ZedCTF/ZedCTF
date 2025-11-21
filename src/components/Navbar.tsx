import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="public/favicon.png" alt="ZedCTF" className="w-8 h-8" />
            <span className="text-2xl font-bold text-green-600">ZedCTF</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <a href="#dashboard" className="text-gray-700 hover:text-green-600 transition-colors">
              Dashboard
            </a>
            <a href="#practice" className="text-gray-700 hover:text-green-600 transition-colors">
              Practice
            </a>
            <a href="#live" className="text-gray-700 hover:text-green-600 transition-colors">
              LIVE
            </a>
            <a href="#leaderboard" className="text-gray-700 hover:text-green-600 transition-colors">
              Leaderboard
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </Button>
            <Link to="/login">
              <Button variant="default" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;