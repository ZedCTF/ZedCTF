// src/pages/WriteupEdit.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WriteupEditor from '@/components/writeup/WriteupEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const WriteupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challenge, setChallenge] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: 'link' | 'image' | 'code'; value: string; caption?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWriteup();
  }, [id]);

  const fetchWriteup = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/writeups/${id}`);
      // const data = await response.json();
      
      // Mock data
      const mockWriteup = {
        id: id || '1',
        title: 'SQL Injection Challenge Solution',
        description: 'A detailed walkthrough of solving the SQL Injection Master challenge',
        content: '# SQL Injection Master Solution\n\n## Challenge Overview\nThis challenge involved bypassing authentication...',
        challenge: 'SQL Injection Master',
        category: 'Web',
        difficulty: 'medium',
        tags: ['sql-injection', 'web', 'authentication'],
        attachments: []
      };

      setTitle(mockWriteup.title);
      setDescription(mockWriteup.description);
      setChallenge(mockWriteup.challenge);
      setCategory(mockWriteup.category);
      setDifficulty(mockWriteup.difficulty);
      setTags(mockWriteup.tags.join(', '));
      setContent(mockWriteup.content);
    } catch (error) {
      console.error('Error fetching writeup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const writeupData = {
        title,
        description,
        content,
        challenge,
        category,
        difficulty,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        attachments,
        updatedAt: new Date().toISOString(),
      };

      // TODO: Replace with actual API call
      console.log('Updating write-up:', writeupData);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Write-up updated successfully!');
      navigate(`/writeups/${id}`);
    } catch (error) {
      console.error('Error updating write-up:', error);
      alert('Failed to update write-up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this write-up? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Implement delete API
      console.log('Deleting write-up:', id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Write-up deleted successfully!');
      navigate('/writeups');
    } catch (error) {
      console.error('Error deleting write-up:', error);
      alert('Failed to delete write-up. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="pt-24 pb-16 min-h-screen bg-background">
          <div className="container px-4 mx-auto text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading write-up...</p>
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
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/writeups/${id}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Write-up
            </Button>
            <h1 className="text-3xl font-bold">Edit Write-up</h1>
            <p className="text-muted-foreground mt-2">
              Make changes to your write-up. After editing, it will need to be re-approved.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Write-up Details</CardTitle>
                    <CardDescription>Update basic information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Brief Description *</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
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
                        <option value="Web">Web</option>
                        <option value="Cryptography">Cryptography</option>
                        <option value="Forensics">Forensics</option>
                        <option value="Reverse Engineering">Reverse Engineering</option>
                        <option value="Binary Exploitation">Binary Exploitation</option>
                        <option value="OSINT">OSINT</option>
                        <option value="Misc">Misc</option>
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
                        <option value="beginner">Beginner</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="insane">Insane</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Delete Button */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Write-up
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Once deleted, this write-up cannot be recovered.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Write-up Content</CardTitle>
                    <CardDescription>Edit your solution content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WriteupEditor
                      initialContent={content}
                      onContentChange={setContent}
                      onAttachmentsChange={setAttachments}
                    />

                    <div className="flex justify-between items-center pt-6 mt-6 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/writeups/${id}`)}
                      >
                        Cancel
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={isSubmitting || !title || !content}
                        >
                          {isSubmitting ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
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

export default WriteupEdit;