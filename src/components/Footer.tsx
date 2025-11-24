import { Shield, Mail, Github, Twitter, Linkedin, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container px-4 mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold neon-text">ZedCTF</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Zambia's premier platform for cybersecurity challenges and training.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              An initiative by IT Society of Kapasa Makasa University
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/practice" className="hover:text-primary transition-colors">
                  Practice
                </Link>
              </li>
              <li>
                <Link to="/live" className="hover:text-primary transition-colors">
                  LIVE Events
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-primary transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/writeups" className="hover:text-primary transition-colors">
                  Walkthroughs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Connect</h3>
            <div className="flex gap-4 mb-4">
              <a 
                href="https://github.com/ZedCTF/ZedCTF" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-2 text-primary flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contributors
              </h4>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <a 
                  href="https://github.com/SokoJames" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  James Soko
                </a>
                <a 
                  href="https://github.com/abbymwale24" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Abby Mwale
                </a>
                <a 
                  href="https://github.com/Joylad-Jangazya" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Joylad Jangazya
                </a>
                <a 
                  href="https://github.com/Kono-hub" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Mary Chanda
                </a>
                <a 
                  href="https://github.com/ronny-brawn" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Aaron Nyakapanda
                </a>
                <a 
                  href="https://github.com/threat23" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Humphery Chileshe
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ZedCTF. All rights reserved. Made with 💚 in Zambia</p>
          <p className="mt-1">IT Society of Kapasa Makasa University</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;