'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Key, Github, Zap } from 'lucide-react';
import { UserConfig, AzureOpenAIConfig } from '@/types';
import { apiClient } from '@/lib/api';

interface ConfigDialogProps {
  config: UserConfig | null;
  onConfigSave: (config: UserConfig) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigDialog({ config, onConfigSave, open, onOpenChange }: ConfigDialogProps) {
  const [formData, setFormData] = useState<UserConfig>({
    aiProvider: 'openai',
    apiKey: '',
    azureConfig: {
      apiKey: '',
      azureEndpoint: '',
      apiVersion: '2024-08-01-preview',
      deploymentName: '',
    },
    gitConfig: {
      username: '',
      email: '',
      githubToken: '',
      repositoryUrl: '',
    },
    sessionId: 'default',
    ...config,
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{ [key: string]: boolean } | null>(null);

  const handleInputChange = (field: string, value: string, isNestedField?: boolean, parentField?: string) => {
    if (isNestedField && parentField) {
      setFormData(prev => ({
        ...prev,
        [parentField]: {
          ...(prev as any)[parentField],
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    setValidationResults(null); // Clear previous validation
  };

  const generateSessionId = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFormData(prev => ({...prev, sessionId: newSessionId}));
  };

  const validateConfiguration = async () => {
    setIsValidating(true);
    try {
      const results = await apiClient.validateConfig(formData);
      setValidationResults(results);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationResults({ overall_valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (validationResults?.overall_valid) {
      onConfigSave(formData);
      onOpenChange(false);
    } else {
      alert('Please validate your configuration first');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* AI Provider Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <h3 className="text-lg font-medium">AI Provider</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aiProvider">Provider</Label>
              <select
                id="aiProvider"
                value={formData.aiProvider}
                onChange={(e) => handleInputChange('aiProvider', e.target.value as 'openai' | 'azure_openai' | 'anthropic')}
                className="w-full p-2 border rounded-md"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="azure_openai">Azure OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            
            {formData.aiProvider !== 'azure_openai' && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.aiProvider === 'openai' 
                    ? 'Get your API key from: https://platform.openai.com/api-keys'
                    : 'Get your API key from: https://console.anthropic.com/'
                  }
                </p>
              </div>
            )}

            {formData.aiProvider === 'azure_openai' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="azureApiKey">Azure OpenAI API Key</Label>
                  <Input
                    id="azureApiKey"
                    type="password"
                    placeholder="Enter your Azure OpenAI API key"
                    value={formData.azureConfig?.apiKey || ''}
                    onChange={(e) => handleInputChange('apiKey', e.target.value, true, 'azureConfig')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="azureEndpoint">Azure Endpoint</Label>
                  <Input
                    id="azureEndpoint"
                    placeholder="https://your-resource.openai.azure.com/"
                    value={formData.azureConfig?.azureEndpoint || ''}
                    onChange={(e) => handleInputChange('azureEndpoint', e.target.value, true, 'azureConfig')}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiVersion">API Version</Label>
                    <Input
                      id="apiVersion"
                      placeholder="2024-08-01-preview"
                      value={formData.azureConfig?.apiVersion || ''}
                      onChange={(e) => handleInputChange('apiVersion', e.target.value, true, 'azureConfig')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deploymentName">Deployment Name</Label>
                    <Input
                      id="deploymentName"
                      placeholder="gpt-4"
                      value={formData.azureConfig?.deploymentName || ''}
                      onChange={(e) => handleInputChange('deploymentName', e.target.value, true, 'azureConfig')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Git Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <h3 className="text-lg font-medium">Git Configuration</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Your GitHub username"
                  value={formData.gitConfig.username}
                  onChange={(e) => handleInputChange('username', e.target.value, true, 'gitConfig')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.gitConfig.email}
                  onChange={(e) => handleInputChange('email', e.target.value, true, 'gitConfig')}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
              <Input
                id="githubToken"
                type="password"
                placeholder="ghp_..."
                value={formData.gitConfig.githubToken}
                onChange={(e) => handleInputChange('githubToken', e.target.value, true, 'gitConfig')}
              />
              <p className="text-sm text-muted-foreground">
                Create a token at: https://github.com/settings/tokens (needs repo permissions)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">Repository URL</Label>
              <Input
                id="repositoryUrl"
                placeholder="https://github.com/username/repository"
                value={formData.gitConfig.repositoryUrl}
                onChange={(e) => handleInputChange('repositoryUrl', e.target.value, true, 'gitConfig')}
              />
              <p className="text-sm text-muted-foreground">
                The GitHub repository where your website will be deployed
              </p>
            </div>
          </div>

          {/* Session Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <h3 className="text-lg font-medium">Session Configuration</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sessionId">Session ID</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSessionId}
                >
                  Generate New
                </Button>
              </div>
              <Input
                id="sessionId"
                value={formData.sessionId}
                onChange={(e) => handleInputChange('sessionId', e.target.value)}
                placeholder="Unique session identifier"
              />
              <p className="text-sm text-muted-foreground">
                Each session maintains its own conversation memory. Generate a new ID for fresh conversations.
              </p>
            </div>
          </div>

          <Separator />

          {/* Validation Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <h3 className="text-lg font-medium">Validation</h3>
            </div>
            
            <Button 
              onClick={validateConfiguration} 
              disabled={isValidating || !formData.apiKey || !formData.gitConfig.githubToken}
              className="w-full"
            >
              {isValidating ? 'Validating...' : 'Validate Configuration'}
            </Button>
            
            {validationResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={validationResults.ai_api ? "default" : "destructive"}>
                    AI API: {validationResults.ai_api ? "Valid" : "Invalid"}
                  </Badge>
                  <Badge variant={validationResults.github_access ? "default" : "destructive"}>
                    GitHub: {validationResults.github_access ? "Valid" : "Invalid"}
                  </Badge>
                </div>
                
                <Badge 
                  variant={validationResults.overall_valid ? "default" : "destructive"}
                  className="w-full justify-center"
                >
                  {validationResults.overall_valid ? "Configuration Valid ✓" : "Configuration Invalid ✗"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!validationResults?.overall_valid}
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}