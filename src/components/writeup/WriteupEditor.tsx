// src/components/writeup/WriteupEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Copy, Trash2, ChevronUp, ChevronDown, 
  Terminal, Lightbulb, Eye, EyeOff, Bold, Italic, 
  Link as LinkIcon, List, ListOrdered, Type,
  Image as ImageIcon, Code as CodeIcon, Quote, Heading,
  ChevronRight, Check, X, Maximize2, Minimize2, Heading2, Heading3,
  FileText, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface WriteupStep {
  id: string;
  title: string;
  description: string;
  code?: string;
  language?: string;
  hintUsed?: string;
}

interface WriteupEditorProps {
  onContentChange: (content: string) => void;
  challengeHints?: string[];
  challengeTitle?: string;
  initialContent?: string;
}

const WriteupEditor: React.FC<WriteupEditorProps> = ({
  onContentChange,
  challengeHints = [],
  challengeTitle = '',
  initialContent = ''
}) => {
  // Parse markdown content into steps
  const parseMarkdownToSteps = (markdown: string): WriteupStep[] => {
    if (!markdown || markdown.trim() === '') {
      return [{ id: '1', title: 'Initial Reconnaissance', description: '', code: '', language: 'bash' }];
    }
    
    // Split by step markers (## Step X:)
    const stepRegex = /## Step (\d+): (.+?)\n\n([\s\S]*?)(?=\n## Step \d+:|$)/g;
    const matches = [...markdown.matchAll(stepRegex)];
    
    if (matches.length > 0) {
      return matches.map((match, index) => {
        const stepNumber = match[1];
        const title = match[2];
        let content = match[3].trim();
        
        // Extract hint if present
        let hintUsed = '';
        const hintRegex = /> 💡 \*\*Hint Used:\*\* (.+?)\n\n/;
        const hintMatch = content.match(hintRegex);
        if (hintMatch) {
          hintUsed = hintMatch[1];
          content = content.replace(hintRegex, '').trim();
        }
        
        // Extract code blocks
        let code = '';
        let language = 'bash';
        const codeRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
        const codeMatches = [...content.matchAll(codeRegex)];
        
        if (codeMatches.length > 0) {
          // Take the last code block
          const lastCode = codeMatches[codeMatches.length - 1];
          language = lastCode[1] || 'bash';
          code = lastCode[2].trim();
          
          // Remove code blocks from description
          content = content.replace(codeRegex, '').trim();
        }
        
        return {
          id: `step-${stepNumber}`,
          title: title,
          description: content,
          code: code,
          language: language,
          hintUsed: hintUsed
        };
      });
    }
    
    // If no step markers found, check for other headers
    const headerRegex = /## (.+?)\n\n([\s\S]*?)(?=\n## |$)/g;
    const headerMatches = [...markdown.matchAll(headerRegex)];
    
    if (headerMatches.length > 0) {
      return headerMatches.map((match, index) => {
        const title = match[1];
        let content = match[2].trim();
        
        // Extract code blocks
        let code = '';
        let language = 'bash';
        const codeRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
        const codeMatches = [...content.matchAll(codeRegex)];
        
        if (codeMatches.length > 0) {
          const lastCode = codeMatches[codeMatches.length - 1];
          language = lastCode[1] || 'bash';
          code = lastCode[2].trim();
          content = content.replace(codeRegex, '').trim();
        }
        
        return {
          id: `step-${index + 1}`,
          title: title,
          description: content,
          code: code,
          language: language,
          hintUsed: ''
        };
      });
    }
    
    // Single step for all content
    return [{
      id: '1',
      title: 'Solution',
      description: markdown,
      code: '',
      language: 'bash'
    }];
  };

  const [steps, setSteps] = useState<WriteupStep[]>(() => parseMarkdownToSteps(initialContent));
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'steps' | 'markdown'>('steps');
  
  const descriptionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const codeRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const titleRefs = useRef<(HTMLInputElement | null)[]>([]);
  const markdownRef = useRef<HTMLTextAreaElement>(null);

  // Initialize markdown editor with content
  useEffect(() => {
    if (viewMode === 'markdown' && markdownRef.current && initialContent) {
      if (!markdownRef.current.value) {
        markdownRef.current.value = initialContent;
      }
    }
  }, [viewMode, initialContent]);

  // Generate markdown from steps
  const generateMarkdownFromSteps = (stepsArray: WriteupStep[]): string => {
    return stepsArray.map((step, index) => {
      let stepContent = '';
      
      // Add step title
      if (step.title.trim()) {
        stepContent += `## Step ${index + 1}: ${step.title}\n\n`;
      } else {
        stepContent += `## Step ${index + 1}\n\n`;
      }
      
      // Add description
      stepContent += `${step.description}\n\n`;
      
      // Add code block if exists
      if (step.code?.trim()) {
        stepContent += `\`\`\`${step.language || 'bash'}\n${step.code}\n\`\`\`\n\n`;
      }
      
      // Add hint if used
      if (step.hintUsed) {
        stepContent += `> 💡 **Hint Used:** ${step.hintUsed}\n\n`;
      }
      
      return stepContent;
    }).join('\n---\n\n');
  };

  // Generate content from current mode
  const generateContent = (): string => {
    if (viewMode === 'markdown' && markdownRef.current) {
      return markdownRef.current.value;
    }
    
    return generateMarkdownFromSteps(steps);
  };

  // Update parent when content changes
  useEffect(() => {
    const content = generateContent();
    onContentChange(content);
  }, [steps, viewMode]);

  // Handle markdown changes
  const handleMarkdownChange = (value: string) => {
    onContentChange(value);
  };

  // Convert markdown to steps
  const convertToSteps = () => {
    if (markdownRef.current) {
      const markdown = markdownRef.current.value;
      const newSteps = parseMarkdownToSteps(markdown);
      setSteps(newSteps);
      setViewMode('steps');
    }
  };

  const convertToMarkdown = () => {
    setViewMode('markdown');
    if (markdownRef.current) {
      markdownRef.current.value = generateMarkdownFromSteps(steps);
    }
  };

  // Add a new step
  const addStep = () => {
    const newStep: WriteupStep = {
      id: Date.now().toString(),
      title: `Step ${steps.length + 1}`,
      description: '',
      code: '',
      language: 'bash'
    };
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
  };

  // Update a step
  const updateStep = (id: string, field: keyof WriteupStep, value: string) => {
    const updatedSteps = steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    );
    setSteps(updatedSteps);
  };

  // Remove a step
  const removeStep = (id: string) => {
    if (steps.length > 1) {
      const updatedSteps = steps.filter(step => step.id !== id);
      setSteps(updatedSteps);
    }
  };

  // Move step up/down
  const moveStep = (id: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(step => step.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < steps.length - 1)
    ) {
      const newSteps = [...steps];
      const newIndex = direction === 'up' ? index - 1 : direction === 'down' ? index + 1 : index;
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      setSteps(newSteps);
    }
  };

  // Copy code to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Use a hint for a specific step
  const useHint = (stepId: string, hint: string) => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      const updatedDescription = step.description 
        ? `${step.description}\n\n💡 **Hint:** ${hint}`
        : `💡 **Hint:** ${hint}`;
      updateStep(stepId, 'description', updatedDescription);
      updateStep(stepId, 'hintUsed', hint);
    }
  };

  // Remove hint from step
  const removeHint = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (step?.hintUsed) {
      // Remove the hint from description
      const hintPattern = new RegExp(`💡 \\*\\*Hint:\\*\\* ${step.hintUsed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      const descriptionWithoutHint = step.description.replace(hintPattern, '').trim();
      updateStep(stepId, 'description', descriptionWithoutHint);
      updateStep(stepId, 'hintUsed', '');
    }
  };

  // Insert markdown at cursor position
  const insertMarkdown = (textarea: HTMLTextAreaElement | null, syntax: string) => {
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newText = syntax.replace('{selected}', selectedText || 'text');
    
    const newValue = 
      textarea.value.substring(0, start) + 
      newText + 
      textarea.value.substring(end);
    
    textarea.value = newValue;
    
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
    
    const stepIndex = descriptionRefs.current.indexOf(textarea);
    if (stepIndex !== -1) {
      updateStep(steps[stepIndex].id, 'description', newValue);
    }
    
    const newCursorPos = start + newText.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Formatting buttons configuration
  const formattingButtons = [
    { icon: <Bold className="w-4 h-4" />, syntax: '**{selected}**', label: 'Bold' },
    { icon: <Italic className="w-4 h-4" />, syntax: '*{selected}*', label: 'Italic' },
    { icon: <CodeIcon className="w-4 h-4" />, syntax: '`{selected}`', label: 'Inline Code' },
    { icon: <Heading2 className="w-4 h-4" />, syntax: '## {selected}', label: 'Heading 2' },
    { icon: <Heading3 className="w-4 h-4" />, syntax: '### {selected}', label: 'Heading 3' },
    { icon: <List className="w-4 h-4" />, syntax: '- {selected}', label: 'Bullet List' },
    { icon: <ListOrdered className="w-4 h-4" />, syntax: '1. {selected}', label: 'Numbered List' },
    { icon: <Quote className="w-4 h-4" />, syntax: '> {selected}', label: 'Quote' },
    { icon: <LinkIcon className="w-4 h-4" />, syntax: '[{selected}](url)', label: 'Link' },
    { icon: <ImageIcon className="w-4 h-4" />, syntax: '![{selected}](image-url)', label: 'Image' },
  ];

  // Get content preview
  const getPreviewContent = () => {
    return generateContent();
  };

  // Render code block in preview
  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'bash';
    
    return !inline ? (
      <div className="relative group">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
            className="h-6 px-2"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          className="rounded-lg !mt-0"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  // Parse and reload steps from markdown
  const reloadStepsFromMarkdown = () => {
    if (markdownRef.current) {
      const markdown = markdownRef.current.value;
      const newSteps = parseMarkdownToSteps(markdown);
      setSteps(newSteps);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Step-by-Step Solution</h3>
          <Badge variant="outline">{steps.length} step{steps.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Preview
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadStepsFromMarkdown}
            className="flex items-center gap-2"
            title="Reload steps from markdown"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Steps
          </Button>
        </div>
      </div>

      {/* Steps Builder & Preview */}
      <div className={`${showPreview ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
        {/* Steps Builder */}
        <div className={`${showPreview ? '' : 'space-y-4'}`}>
          {steps.map((step, index) => (
            <Card key={step.id} className="relative group mb-4">
              <CardContent className="p-4 sm:p-6">
                {/* Step Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Step {index + 1}
                    </Badge>
                    {step.hintUsed && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Hint Used
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 self-end sm:self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={index === steps.length - 1}
                      title="Move down"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        title="Remove step"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step Title */}
                <div className="space-y-2 mb-4">
                  <Label className="flex items-center gap-2">
                    <Heading className="w-4 h-4" />
                    Step Title
                  </Label>
                  <Input
                    ref={el => titleRefs.current[index] = el}
                    value={step.title}
                    onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                    placeholder={`Enter a descriptive title for step ${index + 1}`}
                    className="font-medium"
                  />
                </div>

                {/* Step Description with Formatting */}
                <div className="space-y-2 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <Label className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Description
                      {challengeHints.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 ml-2"
                            >
                              <Lightbulb className="w-3 h-3 mr-1" />
                              Add Hint
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {challengeHints.map((hint, hintIndex) => (
                              <DropdownMenuItem
                                key={hintIndex}
                                onClick={() => useHint(step.id, hint)}
                                disabled={step.hintUsed === hint}
                              >
                                <div className="flex items-center gap-2">
                                  {step.hintUsed === hint ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Lightbulb className="w-3 h-3" />
                                  )}
                                  <div>
                                    <div className="font-medium">Hint {hintIndex + 1}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">{hint}</div>
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-1 justify-start">
                      {formattingButtons.slice(0, 5).map((btn, btnIndex) => (
                        <Button
                          key={btnIndex}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => insertMarkdown(descriptionRefs.current[index], btn.syntax)}
                          title={btn.label}
                        >
                          {btn.icon}
                        </Button>
                      ))}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="More formatting options"
                          >
                            ⋮
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {formattingButtons.slice(5).map((btn, btnIndex) => (
                            <DropdownMenuItem
                              key={btnIndex}
                              onClick={() => insertMarkdown(descriptionRefs.current[index], btn.syntax)}
                            >
                              <div className="flex items-center gap-2">
                                {btn.icon}
                                <span>{btn.label}</span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Textarea
                    ref={el => descriptionRefs.current[index] = el}
                    value={step.description}
                    onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                    placeholder={`Describe what you did in step ${index + 1}...`}
                    rows={8}
                    className="min-h-[200px] resize-y font-mono text-sm"
                  />
                </div>

                {/* Hint Used */}
                {step.hintUsed && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">Hint Used</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHint(step.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm mt-1 text-green-800">{step.hintUsed}</p>
                  </div>
                )}

                {/* Code Block */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Label className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Code Snippet
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={step.language || 'bash'}
                        onChange={(e) => updateStep(step.id, 'language', e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-background w-full sm:w-auto"
                      >
                        <option value="bash">bash</option>
                        <option value="python">python</option>
                        <option value="javascript">javascript</option>
                        <option value="php">php</option>
                        <option value="sql">sql</option>
                        <option value="powershell">powershell</option>
                        <option value="html">html</option>
                        <option value="css">css</option>
                      </select>
                      {step.code?.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(step.code!)}
                          className="flex items-center gap-1 whitespace-nowrap"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden sm:inline">Copy</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    ref={el => codeRefs.current[index] = el}
                    value={step.code || ''}
                    onChange={(e) => updateStep(step.id, 'code', e.target.value)}
                    placeholder={`# Enter your code here`}
                    className="font-mono text-sm"
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Step Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addStep}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Step
          </Button>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className={`border rounded-lg bg-card ${isFullscreen ? 'fixed inset-0 z-50 p-4' : ''}`}>
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <h3 className="font-semibold">Live Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {getPreviewContent().split(/\s+/).filter(Boolean).length} words
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[600px]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    code: CodeBlock
                  }}
                >
                  {getPreviewContent() || '## Your write-up will appear here\n\nStart adding steps to see your solution preview.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Raw Markdown Editor (hidden by default, toggle with button) */}
      <div className="mt-8">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            View/Edit Raw Markdown
          </summary>
          <div className="mt-4">
            <Textarea
              ref={markdownRef}
              defaultValue={initialContent}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              className="w-full min-h-[300px] font-mono text-sm"
              placeholder="Raw markdown content..."
            />
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={convertToSteps}
              >
                Parse to Steps
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reloadStepsFromMarkdown}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reload Steps
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default WriteupEditor;