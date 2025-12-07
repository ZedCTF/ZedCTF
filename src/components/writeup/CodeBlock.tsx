// src/components/writeup/CodeBlock.tsx
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

const CodeBlock = ({ code, language = 'bash', showLineNumbers = true }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');
  const lineCount = lines.length;

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      <div className="flex text-sm bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
        {showLineNumbers && (
          <div className="flex-none py-4 pr-4 pl-4 text-right select-none border-r border-gray-700 bg-gray-950 text-gray-400">
            {Array.from({ length: lineCount }, (_, i) => i + 1).map(num => (
              <div key={num} className="leading-6">{num}</div>
            ))}
          </div>
        )}
        
        <div className="flex-1 overflow-x-auto">
          <pre className="p-4 overflow-x-auto">
            <code className={`language-${language}`}>
              {code}
            </code>
          </pre>
        </div>
      </div>
      
      {language && (
        <div className="absolute top-0 left-4 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-b">
          {language}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;