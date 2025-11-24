// src/components/admin/ChallengeCreation.tsx
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Upload, Link, FileText, User, ExternalLink } from "lucide-react";

interface ChallengeCreationProps {
  onBack: () => void;
}

interface Question {
  id: string;
  question: string;
  points: number;
  flag: string;
}

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
}

interface ExternalSource {
  ctfName: string;
  ctfUrl: string;
  originalAuthor: string;
  authorUrl: string;
  license: string;
}

const ChallengeCreation = ({ onBack }: ChallengeCreationProps) => {
  const { user } = useAuthContext();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "web",
    customCategory: "",
    difficulty: "easy",
    points: 100,
    flag: "",
    flagFormat: "CTF{.*}",
    hasMultipleQuestions: false,
    isExternalChallenge: false,
    hints: [""],
    files: [] as FileAttachment[],
    creator: "", // For challenges created by other users
    creatorUrl: "",
    externalSource: {
      ctfName: "",
      ctfUrl: "",
      originalAuthor: "",
      authorUrl: "",
      license: "unknown"
    } as ExternalSource
  });

  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", question: "", points: 0, flag: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const challengeData = {
        ...formData,
        // Use custom category if selected, otherwise use predefined category
        finalCategory: showCustomCategory ? formData.customCategory : formData.category,
        questions: formData.hasMultipleQuestions ? questions : [],
        createdAt: new Date(),
        isActive: true,
        solvedBy: [],
        hints: formData.hints.filter(hint => hint.trim() !== ""),
        // Calculate total points for multi-question challenges
        totalPoints: formData.hasMultipleQuestions 
          ? questions.reduce((sum, q) => sum + q.points, 0)
          : formData.points,
        // Creator information
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email,
        // If it's an external challenge, include attribution
        ...(formData.isExternalChallenge && {
          attribution: {
            ...formData.externalSource,
            importedBy: user?.displayName || user?.email,
            importedById: user?.uid,
            importedAt: new Date()
          }
        }),
        // If creator is specified (for challenges by other users)
        ...(formData.creator && {
          originalCreator: {
            name: formData.creator,
            url: formData.creatorUrl
          }
        })
      };

      await addDoc(collection(db, "challenges"), challengeData);
      
      alert("Challenge created successfully!");
      resetForm();
    } catch (error) {
      console.error("Error creating challenge:", error);
      alert("Error creating challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "web",
      customCategory: "",
      difficulty: "easy",
      points: 100,
      flag: "",
      flagFormat: "CTF{.*}",
      hasMultipleQuestions: false,
      isExternalChallenge: false,
      hints: [""],
      files: [],
      creator: "",
      creatorUrl: "",
      externalSource: {
        ctfName: "",
        ctfUrl: "",
        originalAuthor: "",
        authorUrl: "",
        license: "unknown"
      }
    });
    setQuestions([{ id: "1", question: "", points: 0, flag: "" }]);
    setShowCustomCategory(false);
  };

  const addHint = () => {
    setFormData({
      ...formData,
      hints: [...formData.hints, ""]
    });
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...formData.hints];
    newHints[index] = value;
    setFormData({ ...formData, hints: newHints });
  };

  const removeHint = (index: number) => {
    const newHints = formData.hints.filter((_, i) => i !== index);
    setFormData({ ...formData, hints: newHints });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      points: 0,
      flag: ""
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const addFileAttachment = (type: 'file' | 'link') => {
    if (type === 'link') {
      const url = prompt("Enter the URL:");
      if (url) {
        const newFile: FileAttachment = {
          id: Date.now().toString(),
          name: `Link - ${new Date().toLocaleDateString()}`,
          url: url,
          type: 'link'
        };
        setFormData({
          ...formData,
          files: [...formData.files, newFile]
        });
      }
    } else {
      // For file uploads, you would typically use a file input
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const newFile: FileAttachment = {
            id: Date.now().toString(),
            name: file.name,
            url: URL.createObjectURL(file), // Temporary URL for demo
            type: 'file'
          };
          setFormData({
            ...formData,
            files: [...formData.files, newFile]
          });
        }
      };
      input.click();
    }
  };

  const removeFile = (id: string) => {
    setFormData({
      ...formData,
      files: formData.files.filter(file => file.id !== id)
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === "custom") {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: "custom" });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const updateExternalSource = (field: keyof ExternalSource, value: string) => {
    setFormData({
      ...formData,
      externalSource: {
        ...formData.externalSource,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Challenge</CardTitle>
        <CardDescription>
          Add a new CTF challenge to the platform with advanced options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Challenge Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter challenge title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="crypto">Cryptography</SelectItem>
                    <SelectItem value="forensics">Forensics</SelectItem>
                    <SelectItem value="pwn">Pwn</SelectItem>
                    <SelectItem value="reversing">Reverse Engineering</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                    <SelectItem value="custom">Custom Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomCategory && (
                <div>
                  <Label htmlFor="customCategory">Custom Category Name *</Label>
                  <Input
                    id="customCategory"
                    value={formData.customCategory}
                    onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
                    placeholder="Enter your custom category name"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (1-100 points)</SelectItem>
                    <SelectItem value="medium">Medium (101-300 points)</SelectItem>
                    <SelectItem value="hard">Hard (301-500 points)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!formData.hasMultipleQuestions && (
                <div>
                  <Label htmlFor="points">Points *</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                    min="1"
                    max="1000"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter detailed challenge description, requirements, and any setup instructions..."
                  rows={8}
                  required
                />
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <Label className="text-base">Creator Information</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator">Original Creator (Optional)</Label>
                <Input
                  id="creator"
                  value={formData.creator}
                  onChange={(e) => setFormData({...formData, creator: e.target.value})}
                  placeholder="Name of the original challenge creator"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use this if the challenge was created by someone else in your community
                </p>
              </div>

              <div>
                <Label htmlFor="creatorUrl">Creator Profile URL</Label>
                <Input
                  id="creatorUrl"
                  value={formData.creatorUrl}
                  onChange={(e) => setFormData({...formData, creatorUrl: e.target.value})}
                  placeholder="https://github.com/username"
                />
              </div>
            </div>
          </div>

          {/* External Challenge Attribution */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5" />
                <Label className="text-base">External CTF Challenge</Label>
              </div>
              <Switch
                checked={formData.isExternalChallenge}
                onCheckedChange={(checked) => setFormData({...formData, isExternalChallenge: checked})}
              />
            </div>
            
            {formData.isExternalChallenge && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Provide attribution for challenges downloaded from other CTF platforms
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ctfName">Original CTF Name *</Label>
                    <Input
                      id="ctfName"
                      value={formData.externalSource.ctfName}
                      onChange={(e) => updateExternalSource('ctfName', e.target.value)}
                      placeholder="e.g., HackTheBox, TryHackMe, CTFtime"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctfUrl">CTF Website URL</Label>
                    <Input
                      id="ctfUrl"
                      value={formData.externalSource.ctfUrl}
                      onChange={(e) => updateExternalSource('ctfUrl', e.target.value)}
                      placeholder="https://ctf.example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="originalAuthor">Original Author *</Label>
                    <Input
                      id="originalAuthor"
                      value={formData.externalSource.originalAuthor}
                      onChange={(e) => updateExternalSource('originalAuthor', e.target.value)}
                      placeholder="Name of the original challenge author"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="authorUrl">Author Profile URL</Label>
                    <Input
                      id="authorUrl"
                      value={formData.externalSource.authorUrl}
                      onChange={(e) => updateExternalSource('authorUrl', e.target.value)}
                      placeholder="https://github.com/original-author"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="license">License</Label>
                  <Select 
                    value={formData.externalSource.license} 
                    onValueChange={(value) => updateExternalSource('license', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="MIT">MIT License</SelectItem>
                      <SelectItem value="apache-2.0">Apache 2.0</SelectItem>
                      <SelectItem value="gpl-3.0">GPL v3.0</SelectItem>
                      <SelectItem value="cc-by-4.0">Creative Commons BY 4.0</SelectItem>
                      <SelectItem value="custom">Custom License</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.externalSource.license === "custom" && (
                    <Input
                      placeholder="Specify custom license"
                      className="mt-2"
                      onChange={(e) => updateExternalSource('license', e.target.value)}
                    />
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Attribution Notice:</strong> This challenge will be displayed with proper 
                    attribution to the original author and CTF platform.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Multiple Questions Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="multipleQuestions" className="text-base">Multiple Questions Challenge</Label>
              <p className="text-sm text-muted-foreground">
                Enable if this challenge contains multiple sub-questions with separate flags
              </p>
            </div>
            <Switch
              id="multipleQuestions"
              checked={formData.hasMultipleQuestions}
              onCheckedChange={(checked) => setFormData({...formData, hasMultipleQuestions: checked})}
            />
          </div>

          {/* Multiple Questions Section */}
          {formData.hasMultipleQuestions && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-base">Challenge Questions</Label>
                <Button type="button" onClick={addQuestion} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </Button>
              </div>
              
              {questions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Question {index + 1}</Label>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor={`question-${question.id}`}>Question Text *</Label>
                    <Input
                      id={`question-${question.id}`}
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                      placeholder="Enter the question text"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`points-${question.id}`}>Points *</Label>
                      <Input
                        id={`points-${question.id}`}
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 0)}
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`flag-${question.id}`}>Flag *</Label>
                      <Input
                        id={`flag-${question.id}`}
                        value={question.flag}
                        onChange={(e) => updateQuestion(question.id, 'flag', e.target.value)}
                        placeholder="Flag for this question"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {questions.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}
                </div>
              )}
            </div>
          )}

          {/* Single Flag Section */}
          {!formData.hasMultipleQuestions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="flag">Flag *</Label>
                <Input
                  id="flag"
                  value={formData.flag}
                  onChange={(e) => setFormData({...formData, flag: e.target.value})}
                  placeholder="CTF{...} or any flag format"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="flagFormat">Flag Format (Regex)</Label>
                <Select 
                  value={formData.flagFormat} 
                  onValueChange={(value) => setFormData({...formData, flagFormat: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CTF{.*}">CTF{`{text}`}</SelectItem>
                    <SelectItem value="FLAG{.*}">FLAG{`{text}`}</SelectItem>
                    <SelectItem value=".*">Any format</SelectItem>
                    <SelectItem value="[A-Za-z0-9]{8,}">Alphanumeric (8+ chars)</SelectItem>
                    <SelectItem value="custom">Custom Regex</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.flagFormat === "custom" && (
                  <Input
                    placeholder="Enter custom regex pattern"
                    className="mt-2"
                    onChange={(e) => setFormData({...formData, flagFormat: e.target.value})}
                  />
                )}
              </div>
            </div>
          )}

          {/* File Attachments */}
          <div className="space-y-4">
            <Label>Files & Links</Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => addFileAttachment('file')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => addFileAttachment('link')}
              >
                <Link className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
            
            {formData.files.length > 0 && (
              <div className="space-y-2">
                {formData.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      {file.type === 'file' ? <FileText className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      <span className="text-sm">{file.name}</span>
                      {file.type === 'link' && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                          (View Link)
                        </a>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hints Section */}
          <div>
            <Label>Hints (Optional)</Label>
            <div className="space-y-2 mt-2">
              {formData.hints.map((hint, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    placeholder={`Hint ${index + 1}`}
                  />
                  {formData.hints.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeHint(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addHint}>
                Add Hint
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Challenge"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset Form
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChallengeCreation;