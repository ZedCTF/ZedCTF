// src/components/admin/ChallengeEdit.tsx
import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, Link, FileText, User, ExternalLink, Save, Star, Shield } from "lucide-react";

interface ChallengeEditProps {
  challengeId: string;
  onBack: () => void;
  onSave: () => void;
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

const ChallengeEdit = ({ challengeId, onBack, onSave }: ChallengeEditProps) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
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
    isActive: true,
    hints: [""],
    files: [] as FileAttachment[],
    creator: "",
    creatorUrl: "",
    externalSource: {
      ctfName: "",
      ctfUrl: "",
      originalAuthor: "",
      authorUrl: "",
      license: "unknown"
    } as ExternalSource,
    // NEW: Practice-related fields
    featuredOnPractice: false,
    availableInPractice: true,
    challengeType: 'practice' as 'practice' | 'live' | 'past_event'
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Calculate total points for multi-question challenges
  const totalPoints = formData.hasMultipleQuestions 
    ? questions.reduce((sum, q) => sum + q.points, 0)
    : formData.points;

  // Auto-adjust difficulty based on total points for multi-question challenges
  useEffect(() => {
    if (formData.hasMultipleQuestions) {
      let suggestedDifficulty = "easy";
      
      if (totalPoints > 300) {
        suggestedDifficulty = "hard";
      } else if (totalPoints > 100) {
        suggestedDifficulty = "medium";
      } else {
        suggestedDifficulty = "easy";
      }

      // Only auto-update if the current difficulty doesn't match the suggested one
      const currentDifficultyPoints = {
        easy: { min: 1, max: 100 },
        medium: { min: 101, max: 300 },
        hard: { min: 301, max: 1000 }
      }[formData.difficulty];

      if (totalPoints < currentDifficultyPoints.min || totalPoints > currentDifficultyPoints.max) {
        setFormData(prev => ({ ...prev, difficulty: suggestedDifficulty }));
      }
    }
  }, [totalPoints, formData.hasMultipleQuestions]);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      const challengeDoc = await getDoc(doc(db, "challenges", challengeId));
      if (challengeDoc.exists()) {
        const challengeData = challengeDoc.data();
        
        // Set form data from challenge
        setFormData({
          title: challengeData.title || "",
          description: challengeData.description || "",
          category: challengeData.category || "web",
          customCategory: challengeData.finalCategory || "",
          difficulty: challengeData.difficulty || "easy",
          points: challengeData.points || 100,
          flag: challengeData.flag || "",
          flagFormat: challengeData.flagFormat || "CTF{.*}",
          hasMultipleQuestions: challengeData.hasMultipleQuestions || false,
          isExternalChallenge: !!challengeData.attribution,
          isActive: challengeData.isActive !== false,
          hints: challengeData.hints || [""],
          files: challengeData.files || [],
          creator: challengeData.originalCreator?.name || "",
          creatorUrl: challengeData.originalCreator?.url || "",
          // NEW: Load practice fields
          featuredOnPractice: challengeData.featuredOnPractice || false,
          availableInPractice: challengeData.availableInPractice !== false,
          challengeType: challengeData.challengeType || 'practice',
          externalSource: {
            ctfName: challengeData.attribution?.ctfName || "",
            ctfUrl: challengeData.attribution?.ctfUrl || "",
            originalAuthor: challengeData.attribution?.originalAuthor || "",
            authorUrl: challengeData.attribution?.authorUrl || "",
            license: challengeData.attribution?.license || "unknown"
          }
        });

        // Set questions if it's a multi-question challenge
        if (challengeData.hasMultipleQuestions && challengeData.questions) {
          setQuestions(challengeData.questions);
        }

        // Show custom category if it exists
        if (challengeData.finalCategory) {
          setShowCustomCategory(true);
          setFormData(prev => ({ ...prev, category: "custom" }));
        }
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  // File upload function
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      const fileName = `challenge-files/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const challengeData = {
        ...formData,
        finalCategory: showCustomCategory ? formData.customCategory : formData.category,
        questions: formData.hasMultipleQuestions ? questions : [],
        hints: formData.hints.filter(hint => hint.trim() !== ""),
        // Use calculated total points
        totalPoints: totalPoints,
        // For multi-question challenges, ensure points field is consistent
        points: formData.hasMultipleQuestions ? totalPoints : formData.points,
        updatedAt: new Date(),
        updatedBy: user?.uid,
        updatedByName: user?.displayName || user?.email,
        // NEW: Include practice fields
        featuredOnPractice: formData.featuredOnPractice,
        availableInPractice: formData.availableInPractice,
        challengeType: formData.challengeType,
        ...(formData.isExternalChallenge && {
          attribution: {
            ...formData.externalSource,
            importedBy: user?.displayName || user?.email,
            importedById: user?.uid,
            importedAt: new Date()
          }
        }),
        ...(formData.creator && {
          originalCreator: {
            name: formData.creator,
            url: formData.creatorUrl
          }
        })
      };

      await updateDoc(doc(db, "challenges", challengeId), challengeData);
      alert("Challenge updated successfully!");
      onSave();
    } catch (error) {
      console.error("Error updating challenge:", error);
      alert("Error updating challenge. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper functions
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

  const addFileAttachment = async (type: 'file' | 'link') => {
    if (type === 'link') {
      const url = prompt("Enter the URL:");
      if (url) {
        try {
          new URL(url);
        } catch {
          alert("Please enter a valid URL");
          return;
        }

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
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = ".zip,.txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.py,.js,.html,.css,.xml,.json";
      
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          for (const file of Array.from(files)) {
            const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            
            setUploadingFiles(prev => new Set(prev).add(fileId));
            
            try {
              const tempFile: FileAttachment = {
                id: fileId,
                name: file.name,
                url: "uploading...",
                type: 'file'
              };
              
              setFormData(prev => ({
                ...prev,
                files: [...prev.files, tempFile]
              }));

              const fileUrl = await uploadFileToStorage(file);
              
              setFormData(prev => ({
                ...prev,
                files: prev.files.map(f => 
                  f.id === fileId ? { ...f, url: fileUrl } : f
                )
              }));
              
            } catch (error) {
              console.error(`Error uploading file ${file.name}:`, error);
              alert(`Failed to upload ${file.name}. Please try again.`);
              
              setFormData(prev => ({
                ...prev,
                files: prev.files.filter(f => f.id !== fileId)
              }));
            } finally {
              setUploadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
              });
            }
          }
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

  const getDifficultyDescription = () => {
    if (formData.hasMultipleQuestions) {
      return `Overall challenge difficulty based on ${questions.length} questions (${totalPoints} total points)`;
    }
    
    switch (formData.difficulty) {
      case "easy": return "Easy (1-100 points)";
      case "medium": return "Medium (101-300 points)";
      case "hard": return "Hard (301-500 points)";
      default: return "Select difficulty";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading challenge...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Challenge</CardTitle>
        <CardDescription>
          Update challenge details and configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Challenge Status</Label>
              <p className="text-sm text-muted-foreground">
                Active challenges are visible to users
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
            />
          </div>

          {/* Practice Visibility */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <Label className="text-base">Practice Visibility</Label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="availableInPractice"
                  checked={formData.availableInPractice}
                  onCheckedChange={(checked) => setFormData({...formData, availableInPractice: checked})}
                />
                <Label htmlFor="availableInPractice" className="text-sm">
                  Available in Practice
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featuredOnPractice"
                  checked={formData.featuredOnPractice}
                  onCheckedChange={(checked) => setFormData({...formData, featuredOnPractice: checked})}
                />
                <Label htmlFor="featuredOnPractice" className="text-sm">
                  <Star className="w-4 h-4 inline mr-1" />
                  Featured on Practice
                </Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="challengeType">Challenge Type</Label>
              <Select 
                value={formData.challengeType} 
                onValueChange={(value: 'practice' | 'live' | 'past_event') => setFormData({...formData, challengeType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice Challenge</SelectItem>
                  <SelectItem value="live">Live Event Challenge</SelectItem>
                  <SelectItem value="past_event">Past Event Challenge</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                "Practice" challenges appear in the Practice section. "Live Event" challenges are only available during events.
              </p>
            </div>
          </div>

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  {formData.hasMultipleQuestions && (
                    <Badge variant="outline" className="text-xs">
                      {totalPoints} total points
                    </Badge>
                  )}
                </div>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      Easy {formData.hasMultipleQuestions ? "(1-100 total points)" : "(1-100 points)"}
                    </SelectItem>
                    <SelectItem value="medium">
                      Medium {formData.hasMultipleQuestions ? "(101-300 total points)" : "(101-300 points)"}
                    </SelectItem>
                    <SelectItem value="hard">
                      Hard {formData.hasMultipleQuestions ? "(301-500 total points)" : "(301-500 points)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {getDifficultyDescription()}
                </p>
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
                <div>
                  <Label className="text-base">Challenge Questions</Label>
                  <p className="text-sm text-muted-foreground">
                    Total Points: <strong>{totalPoints}</strong> | Questions: {questions.length}
                  </p>
                </div>
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
                disabled={uploadingFiles.size > 0}
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
            
            {uploadingFiles.size > 0 && (
              <div className="text-sm text-muted-foreground">
                Uploading {uploadingFiles.size} file(s)... Please wait.
              </div>
            )}
            
            {formData.files.length > 0 && (
              <div className="space-y-2">
                {formData.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      {file.type === 'file' ? <FileText className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      <span className="text-sm">{file.name}</span>
                      {file.type === 'link' ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                          (View Link)
                        </a>
                      ) : file.url === "uploading..." ? (
                        <span className="text-xs text-orange-600">(Uploading...)</span>
                      ) : (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                          (Download)
                        </a>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.url === "uploading..."}
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
            <Button type="submit" disabled={saving || uploadingFiles.size > 0}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
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

export default ChallengeEdit;