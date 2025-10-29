import { Shield, Mail, Github, Twitter, Linkedin } from "lucide-react";

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
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
              <li><a href="#practice" className="hover:text-primary transition-colors">Practice</a></li>
              <li><a href="#live" className="hover:text-primary transition-colors">LIVE Events</a></li>
              <li><a href="#leaderboard" className="hover:text-primary transition-colors">Leaderboard</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Walkthroughs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Tutorials</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQs</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-primary">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ZedCTF. All rights reserved. Made with 💚 in Zambia</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
