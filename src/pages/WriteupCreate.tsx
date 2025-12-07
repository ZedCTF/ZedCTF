// src/pages/WriteupCreate.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WriteupEditor from '@/components/writeup/WriteupEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const WriteupCreate = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challenge, setChallenge] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: 'link' | 'image' | 'code'; value: string; caption?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Web', 'Cryptography', 'Forensics', 'Reverse Engineering',
    'Binary Exploitation', 'OSINT', 'Misc', 'Hardware'
  ];

  const difficulties = [
    'beginner', 'easy', 'medium', 'hard', 'insane', 'expert'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare write-up data
      const writeupData = {
        title,
        description,
        content,
        challenge,
        category,
        difficulty,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        attachments,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // TODO: Replace with actual API call
      console.log('Submitting write-up:', writeupData);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Write-up submitted successfully! It will be reviewed by an admin.');
      navigate('/writeups');
    } catch (error) {
      console.error('Error submitting write-up:', error);
      alert('Failed to submit write-up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/writeups')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Writeups
            </Button>
            <h1 className="text-3xl font-bold">Create New Write-up</h1>
            <p className="text-muted-foreground mt-2">
              Share your solution with the community. Write-ups require admin approval before publishing.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Write-up Details */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Write-up Details</CardTitle>
                    <CardDescription>Basic information about your solution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., SQL Injection Challenge Solution"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Brief Description *</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A short summary of your write-up..."
                        rows={3}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="challenge">Challenge Name *</Label>
                      <Input
                        id="challenge"
                        value={challenge}
                        onChange={(e) => setChallenge(e.target.value)}
                        placeholder="Name of the CTF challenge"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <select
                        id="difficulty"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md"
                      >
                        {difficulties.map(diff => (
                          <option key={diff} value={diff}>
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g., sql-injection, web, authentication"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate tags with commas
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Submission Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs">
                          Pending Review
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Visibility</span>
                        <span className="text-foreground">Public after approval</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        Your write-up will be reviewed by an admin within 24-48 hours.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Editor */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Write-up Content</CardTitle>
                    <CardDescription>
                      Write your solution using markdown. Add code snippets, images, and links.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WriteupEditor
                      onContentChange={setContent}
                      onAttachmentsChange={setAttachments}
                    />

                    <div className="flex justify-between items-center pt-6 mt-6 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/writeups')}
                      >
                        Cancel
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            // TODO: Implement preview
                            alert('Preview feature coming soon!');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || !title || !content}
                        >
                          {isSubmitting ? (
                            'Submitting...'
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Submit for Review
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-500">
                      <p className="font-medium">Note:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>All write-ups are reviewed by admins before publishing</li>
                        <li>Include clear explanations and step-by-step solutions</li>
                        <li>Use code blocks for commands and scripts</li>
                        <li>Add image links for screenshots if you can't upload files</li>
                        <li>Provide attribution for any external resources</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default WriteupCreate;