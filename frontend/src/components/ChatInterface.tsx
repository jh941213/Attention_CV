'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Send, Bot, User, Code, FileText, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { ChatMessage, UserConfig, CodeGenerationResponse, FileOperation } from '@/types';
import { apiClient } from '@/lib/api';
import { FilePreview } from './FilePreview';

interface ChatInterfaceProps {
  config: UserConfig;
}

export function ChatInterface({ config }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI GitHub Pages generator. Tell me what kind of website you\'d like to create, and I\'ll help you build and deploy it! 🚀',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileOperation[]>([]);
  const [pendingCommitMessage, setPendingCommitMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.generateCode(
        inputValue,
        config,
        messages.slice(-10) // Send last 10 messages for context
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.files.length > 0) {
        setPendingFiles(response.files);
        setPendingCommitMessage(response.commitMessage || 'Update website');
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleDeployFiles = async () => {
    if (!pendingFiles.length || isDeploying) return;

    setIsDeploying(true);
    
    try {
      const response = await apiClient.commitAndPush(
        pendingFiles,
        pendingCommitMessage,
        config
      );

      const deployMessage: ChatMessage = {
        role: 'assistant',
        content: response.success 
          ? `🎉 Successfully deployed! ${response.pagesUrl ? `Your site is available at: ${response.pagesUrl}` : 'Check your repository for the changes.'}`
          : `Deployment failed: ${response.message}`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, deployMessage]);
      
      if (response.success) {
        setPendingFiles([]);
        setPendingCommitMessage('');
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Deployment error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </Avatar>
                
                <Card className={`${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <Bot className="w-4 h-4" />
              </Avatar>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="border-t bg-muted/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="font-medium">Files ready for deployment</span>
              <Badge variant="secondary">{pendingFiles.length} files</Badge>
            </div>
            
            <Button 
              onClick={handleDeployFiles} 
              disabled={isDeploying}
              className="flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Deploy to GitHub Pages
                </>
              )}
            </Button>
          </div>
          
          <FilePreview files={pendingFiles} commitMessage={pendingCommitMessage} />
        </div>
      )}

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Describe the website you want to create..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Code className="w-3 h-3" />
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}