'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  File, 
  Code2, 
  Image, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { FileOperation } from '@/types';

interface FilePreviewProps {
  files: FileOperation[];
  commitMessage: string;
}

export function FilePreview({ files, commitMessage }: FilePreviewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFileExpansion = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const getFileIcon = (filePath: string, operation: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (operation === 'create') return <Plus className="w-4 h-4 text-green-500" />;
    if (operation === 'update') return <Edit className="w-4 h-4 text-blue-500" />;
    if (operation === 'delete') return <Trash2 className="w-4 h-4 text-red-500" />;
    
    switch (ext) {
      case 'html':
      case 'htm':
        return <Code2 className="w-4 h-4 text-orange-500" />;
      case 'css':
        return <Code2 className="w-4 h-4 text-blue-500" />;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <Code2 className="w-4 h-4 text-yellow-500" />;
      case 'json':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'md':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="w-4 h-4 text-purple-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOperationBadge = (operation: string) => {
    const configs = {
      create: { label: 'Create', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
      update: { label: 'Update', variant: 'default' as const, className: 'bg-blue-500 hover:bg-blue-600' },
      delete: { label: 'Delete', variant: 'destructive' as const, className: '' },
    };
    
    const config = configs[operation as keyof typeof configs] || { label: operation, variant: 'secondary' as const, className: '' };
    
    return (
      <Badge 
        variant={config.variant} 
        className={`text-xs ${config.className}`}
      >
        {config.label}
      </Badge>
    );
  };

  const getLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'text';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Deployment Preview
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Commit message:</span>
          <Badge variant="outline">{commitMessage}</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFileExpansion(file.filePath)}
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.filePath, file.operation)}
                    <span className="font-mono text-sm">{file.filePath}</span>
                    {getOperationBadge(file.operation)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.content && (
                      <Badge variant="secondary" className="text-xs">
                        {file.content.split('\n').length} lines
                      </Badge>
                    )}
                    {expandedFiles.has(file.filePath) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
                
                {expandedFiles.has(file.filePath) && file.content && file.operation !== 'delete' && (
                  <>
                    <Separator />
                    <div className="p-3 bg-muted/30">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-background p-3 rounded border">
                        <code className={`language-${getLanguage(file.filePath)}`}>
                          {file.content}
                        </code>
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex justify-between items-center mt-4 pt-3 border-t text-sm text-muted-foreground">
          <span>{files.length} file{files.length !== 1 ? 's' : ''} ready for deployment</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Plus className="w-3 h-3 text-green-500" />
              {files.filter(f => f.operation === 'create').length} new
            </span>
            <span className="flex items-center gap-1">
              <Edit className="w-3 h-3 text-blue-500" />
              {files.filter(f => f.operation === 'update').length} modified
            </span>
            <span className="flex items-center gap-1">
              <Trash2 className="w-3 h-3 text-red-500" />
              {files.filter(f => f.operation === 'delete').length} deleted
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}