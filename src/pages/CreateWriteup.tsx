import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Bold, Italic, Link, List, Image, Code, Save, Eye } from 'lucide-react';

const CreateWriteup = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [challenge, setChallenge] = useState('');
  const [category, setCategory] = useState('Web');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Web', 'Cryptography', 'Forensics', 'Reverse Engineering', 'Pwn', 'Misc'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Insane'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In real app, submit to backend
    console.log('Submitting writeup:', {
      title,
      description,
      content,
      challenge,
      category,
      difficulty,
      tags: tags.split(',').map(tag => tag.trim())
    });

    // Redirect to writeups page
    navigate('/writeups');
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">Create Write-up</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                type="submit"
                form="writeup-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="writeup-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Write-up Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title for your write-up..."
                  className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-xl font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your write-up..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Challenge & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Challenge Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    placeholder="Name of the CTF challenge..."
                    className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty *
                  </label>
                  <select
                    required
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    {difficulties.map(diff => (
                      <option key={diff} value={diff}>{diff}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Comma-separated tags (e.g., sql-injection, web, bypass)"
                    className="w-full px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Write-up Content</h2>
            
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => formatText('bold')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Bold"
              >
                <Bold className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => formatText('italic')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Italic"
              >
                <Italic className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => formatText('insertUnorderedList')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Bullet List"
              >
                <List className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => formatText('insertOrderedList')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Numbered List"
              >
                <List className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) formatText('createLink', url);
                }}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Insert Link"
              >
                <Link className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => formatText('formatBlock', '<pre>')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Code Block"
              >
                <Code className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter image URL:');
                  if (url) formatText('insertImage', url);
                }}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Insert Image"
              >
                <Image className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Content Editor */}
            <div
              contentEditable
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              className="min-h-[400px] px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all prose prose-invert max-w-none"
              style={{ 
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                lineHeight: '1.6'
              }}
              data-placeholder="Start writing your amazing write-up here... You can include code snippets, images, and formatted text."
            />
            
            {/* Help Text */}
            <div className="mt-4 text-sm text-gray-400">
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
        </form>
      </div>
    </div>
  );
};

export default CreateWriteup;