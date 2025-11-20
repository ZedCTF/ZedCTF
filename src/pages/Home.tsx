import { useState } from 'react';
import { Shield, Trophy, Users, LogIn, Star, Flag, Clock, Award } from 'lucide-react';

const Home = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b-4 border-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-green-800">ZedCTF</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {[
                { id: 'home', label: 'Home', icon: Shield },
                { id: 'challenges', label: 'Challenges', icon: Flag },
                { id: 'compete', label: 'Compete', icon: Trophy },
                { id: 'login', label: 'Log in/Register', icon: LogIn }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-green-100 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Master Cybersecurity with <span className="text-green-300">ZedCTF</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Practice challenges, compete in LIVE events, and climb the leaderboard
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-lg">
              Get Started - It's Free
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
              View Challenges
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
              Why Choose ZedCTF?
            </h2>
            <p className="text-lg text-gray-600">
              The premier platform for cybersecurity enthusiasts in Zambia and beyond
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Flag,
                title: 'Diverse Challenges',
                description: 'Web exploitation, cryptography, forensics, and more'
              },
              {
                icon: Trophy,
                title: 'Live Competitions',
                description: 'Compete in real-time events with players worldwide'
              },
              {
                icon: Users,
                title: 'Community Driven',
                description: 'Learn from and collaborate with cybersecurity experts'
              },
              {
                icon: Award,
                title: 'Skill Development',
                description: 'Progress from beginner to advanced security researcher'
              },
              {
                icon: Clock,
                title: '24/7 Access',
                description: 'Practice anytime with our always-available platform'
              },
              {
                icon: Star,
                title: 'Zambian Focus',
                description: 'Content and challenges relevant to our local context'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                <feature.icon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">500+</div>
              <div className="text-green-200">Active Players</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">100+</div>
              <div className="text-green-200">Challenges</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">50+</div>
              <div className="text-green-200">Events Hosted</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">24/7</div>
              <div className="text-green-200">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-500 to-green-700 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Cybersecurity Journey?
          </h2>
          <p className="text-xl mb-8 text-green-100">
            Join Zambia's fastest growing cybersecurity community today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-lg">
              Create Account
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-green-400" />
            <span className="ml-2 text-lg font-semibold">ZedCTF</span>
          </div>
          <p className="text-green-300">
            Empowering Zambia's cybersecurity community • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
