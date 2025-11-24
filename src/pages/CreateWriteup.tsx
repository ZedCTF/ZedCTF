import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Bold, Italic, Link, List, Image, Code, Save, Eye } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: string;
}

const CreateWriteup = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available challenges and categories from backend
  const fetchFormData = async () => {
    try {
      setLoading(true);
      
      // Replace with your actual API endpoints
      const CHALLENGES_API = '/api/challenges/available';
      const CATEGORIES_API = '/api/categories';
      const DIFFICULTIES_API = '/api/difficulties';

      const [challengesResponse, categoriesResponse, difficultiesResponse] = await Promise.all([
        fetch(CHALLENGES_API),
        fetch(CATEGORIES_API),
        fetch(DIFFICULTIES_API)
      ]);

      if (challengesResponse.ok) {
        const challengesData = await challengesResponse.json();
        setAvailableChallenges(challengesData);
      } else {
        setAvailableChallenges([]);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        if (categoriesData.length > 0) setCategory(categoriesData[0]);
      } else {
        setCategories([]);
      }

      if (difficultiesResponse.ok) {
        const difficultiesData = await difficultiesResponse.json();
        setDifficulties(difficultiesData);
        if (difficultiesData.length > 0) setDifficulty(difficultiesData[0]);
      } else {
        setDifficulties([]);
      }

    } catch (err) {
      setAvailableChallenges([]);
      setCategories([]);
      setDifficulties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/writeups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          content,
          challengeId,
          category,
          difficulty,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        }),
      });

      if (response.ok) {
        navigate('/writeups');
      } else {
        console.error('Failed to create writeup');
      }
    } catch (error) {
      console.error('Error creating writeup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // Update category and difficulty when challenge is selected
  useEffect(() => {
    if (challengeId) {
      const selectedChallenge = availableChallenges.find(challenge => challenge.id === challengeId);
      if (selectedChallenge) {
        setCategory(selectedChallenge.category);
        setDifficulty(selectedChallenge.difficulty);
      }
    }
  }, [challengeId, availableChallenges]);

  useEffect(() => {
    fetchFormData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading form data...</p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-4">
              Create <span className="text-primary">Writeup</span>
            </h2>
            <p className="text-muted-foreground">
              Share your solution and help others learn from your approach
            </p>
          </div>

          <form id="writeup-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold text-card-foreground mb-6">Basic Information</h2>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Writeup Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a compelling title for your writeup..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-lg font-semibold"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your writeup..."
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Challenge & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Challenge *
                    </label>
                    <select
                      required
                      value={challengeId}
                      onChange={(e) => setChallengeId(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">Select a challenge</option>
                      {availableChallenges.map(challenge => (
                        <option key={challenge.id} value={challenge.id}>
                          {challenge.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Difficulty & Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Difficulty *
                    </label>
                    <select
                      required
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {difficulties.map(diff => (
                        <option key={diff} value={diff}>{diff}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Comma-separated tags (e.g., sql-injection, web, bypass)"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold text-card-foreground mb-6">Writeup Content</h2>
              
              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/20 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => formatText('bold')}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => formatText('italic')}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => formatText('insertUnorderedList')}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => formatText('insertOrderedList')}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Numbered List"
                >
                  <List className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter URL:');
                    if (url) formatText('createLink', url);
                  }}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Insert Link"
                >
                  <Link className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => formatText('formatBlock', '<pre>')}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Code Block"
                >
                  <Code className="w-4 h-4 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter image URL:');
                    if (url) formatText('insertImage', url);
                  }}
                  className="p-2 rounded hover:bg-primary/10 transition-colors"
                  title="Insert Image"
                >
                  <Image className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* Content Editor */}
              <div
                contentEditable
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                className="min-h-[400px] px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all prose prose-invert max-w-none"
                style={{ 
                  fontFamily: 'Georgia, serif',
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}
                data-placeholder="Start writing your amazing writeup here... You can include code snippets, images, and formatted text."
              />
              
              {/* Help Text */}
              <div className="mt-4 text-sm text-muted-foreground">
                <p>💡 <strong>Pro tips:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Use the toolbar above to format your text</li>
                  <li>Include code snippets using the code block button</li>
                  <li>Add images to illustrate your steps</li>
                  <li>Break down complex solutions into clear steps</li>
                  <li>Share your thought process and learning moments</li>
                </ul>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                onClick={() => navigate('/writeups')}
              >
                <Eye className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? 'Publishing...' : 'Publish Writeup'}
              </button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default CreateWriteup;