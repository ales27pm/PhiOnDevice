/**
 * GitHub Environment Configuration Handler
 * 
 * This utility loads GitHub-specific environment variables only when needed
 * for GitHub operations, while keeping regular app environment separate.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface GitHubConfig {
  account: string;
  repo: string;
  token: string;
  repoUrl: string;
  apiBase: string;
  branch: string;
}

class GitHubEnvironment {
  private config: GitHubConfig | null = null;
  private isLoaded = false;

  /**
   * Load GitHub credentials only when GitHub operations are needed
   */
  async loadGitHubCredentials(): Promise<GitHubConfig | null> {
    if (this.isLoaded && this.config) {
      return this.config;
    }

    try {
      // Only load if we're in a development environment and need GitHub access
      if (__DEV__) {
        // In development, we can access the special env file
        const envPath = `${FileSystem.documentDirectory}../../../.specialenv/.env`;
        
        try {
          const envContent = await FileSystem.readAsStringAsync(envPath);
          const envVars = this.parseEnvFile(envContent);
          
          if (envVars.GITHUB_TOKEN && envVars.GITHUB_ACCOUNT && envVars.GITHUB_REPO) {
            this.config = {
              account: envVars.GITHUB_ACCOUNT,
              repo: envVars.GITHUB_REPO,
              token: envVars.GITHUB_TOKEN,
              repoUrl: envVars.GITHUB_REPO_URL || `https://github.com/${envVars.GITHUB_ACCOUNT}/${envVars.GITHUB_REPO}`,
              apiBase: envVars.GITHUB_API_BASE || 'https://api.github.com',
              branch: envVars.GITHUB_BRANCH || 'main'
            };
            
            this.isLoaded = true;
            console.log('✅ GitHub credentials loaded successfully');
            return this.config;
          }
        } catch (fileError) {
          console.log('⚠️ Special GitHub env file not found - using default settings');
        }
      }
      
      // Fallback to default/public settings when GitHub creds not available
      this.config = null;
      this.isLoaded = true;
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to load GitHub credentials:', error);
      this.config = null;
      this.isLoaded = true;
      return null;
    }
  }

  /**
   * Parse .env file content into key-value pairs
   */
  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }
      
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        envVars[key] = value;
      }
    }
    
    return envVars;
  }

  /**
   * Get GitHub config if available, null otherwise
   */
  async getGitHubConfig(): Promise<GitHubConfig | null> {
    return await this.loadGitHubCredentials();
  }

  /**
   * Check if GitHub credentials are available
   */
  async hasGitHubCredentials(): Promise<boolean> {
    const config = await this.loadGitHubCredentials();
    return config !== null;
  }

  /**
   * Get GitHub API headers with authentication if available
   */
  async getGitHubApiHeaders(): Promise<Record<string, string>> {
    const config = await this.loadGitHubCredentials();
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    
    if (config?.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }
    
    return headers;
  }

  /**
   * Create a GitHub API URL
   */
  async createGitHubApiUrl(endpoint: string): Promise<string> {
    const config = await this.loadGitHubCredentials();
    const apiBase = config?.apiBase || 'https://api.github.com';
    const account = config?.account || 'default-account';
    const repo = config?.repo || 'default-repo';
    
    // Handle different endpoint patterns
    if (endpoint.startsWith('/')) {
      return `${apiBase}${endpoint}`;
    } else if (endpoint.includes('repos/')) {
      return `${apiBase}/${endpoint}`;
    } else {
      return `${apiBase}/repos/${account}/${repo}/${endpoint}`;
    }
  }

  /**
   * Reset the loaded configuration (for testing or credential updates)
   */
  reset(): void {
    this.config = null;
    this.isLoaded = false;
  }
}

// Singleton instance
export const githubEnv = new GitHubEnvironment();

// Utility functions for easy access
export async function getGitHubConfig(): Promise<GitHubConfig | null> {
  return await githubEnv.getGitHubConfig();
}

export async function hasGitHubAccess(): Promise<boolean> {
  return await githubEnv.hasGitHubCredentials();
}

export async function createGitHubRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = await githubEnv.createGitHubApiUrl(endpoint);
  const headers = await githubEnv.getGitHubApiHeaders();
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
  
  console.log(`🔗 GitHub API Request: ${url}`);
  return fetch(url, requestOptions);
}

// Export types
export type { GitHubConfig };