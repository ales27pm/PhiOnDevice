/**
 * GitHub Integration Service
 * 
 * Provides GitHub API integration with secure credential handling.
 * Only loads credentials when GitHub operations are needed.
 */

import { createGitHubRequest, hasGitHubAccess, getGitHubConfig } from './githubEnv';
import { Analytics } from './analytics';
import { ErrorHandler } from './errorHandler';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    download_url: string;
    size: number;
  }>;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export class GitHubService {
  /**
   * Check if GitHub integration is available
   */
  async isAvailable(): Promise<boolean> {
    return await hasGitHubAccess();
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<any | null> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ GitHub credentials not available - using default mode');
        return null;
      }

      const response = await createGitHubRequest('');
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repoInfo = await response.json();
      
      Analytics.track('github_repo_info_fetched', {
        repo: repoInfo.full_name,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
      });

      return repoInfo;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.getRepositoryInfo');
      return null;
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(title: string, body: string, labels?: string[]): Promise<GitHubIssue | null> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ Cannot create GitHub issue - credentials not available');
        return null;
      }

      const issueData = {
        title,
        body,
        labels: labels || [],
      };

      const response = await createGitHubRequest('issues', {
        method: 'POST',
        body: JSON.stringify(issueData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create issue: ${response.status}`);
      }

      const issue = await response.json();
      
      Analytics.track('github_issue_created', {
        issue_number: issue.number,
        title: title.substring(0, 100),
      });

      console.log(`✅ GitHub issue created: #${issue.number}`);
      return issue;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.createIssue');
      return null;
    }
  }

  /**
   * Get issues from the repository
   */
  async getIssues(state: 'open' | 'closed' | 'all' = 'open', limit: number = 10): Promise<GitHubIssue[]> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ Cannot fetch GitHub issues - credentials not available');
        return [];
      }

      const response = await createGitHubRequest(`issues?state=${state}&per_page=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.status}`);
      }

      const issues = await response.json();
      
      Analytics.track('github_issues_fetched', {
        count: issues.length,
        state,
      });

      return issues;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.getIssues');
      return [];
    }
  }

  /**
   * Get releases from the repository
   */
  async getReleases(limit: number = 5): Promise<GitHubRelease[]> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ Cannot fetch GitHub releases - credentials not available');
        return [];
      }

      const response = await createGitHubRequest(`releases?per_page=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }

      const releases = await response.json();
      
      Analytics.track('github_releases_fetched', {
        count: releases.length,
      });

      return releases;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.getReleases');
      return [];
    }
  }

  /**
   * Create a new release
   */
  async createRelease(
    tagName: string,
    name: string,
    body: string,
    prerelease: boolean = false
  ): Promise<GitHubRelease | null> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ Cannot create GitHub release - credentials not available');
        return null;
      }

      const releaseData = {
        tag_name: tagName,
        name,
        body,
        prerelease,
        draft: false,
      };

      const response = await createGitHubRequest('releases', {
        method: 'POST',
        body: JSON.stringify(releaseData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create release: ${response.status}`);
      }

      const release = await response.json();
      
      Analytics.track('github_release_created', {
        tag_name: tagName,
        name: name.substring(0, 100),
        prerelease,
      });

      console.log(`✅ GitHub release created: ${tagName}`);
      return release;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.createRelease');
      return null;
    }
  }

  /**
   * Get recent commits
   */
  async getCommits(limit: number = 10): Promise<GitHubCommit[]> {
    try {
      if (!(await this.isAvailable())) {
        console.log('⚠️ Cannot fetch GitHub commits - credentials not available');
        return [];
      }

      const response = await createGitHubRequest(`commits?per_page=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.status}`);
      }

      const commits = await response.json();
      
      Analytics.track('github_commits_fetched', {
        count: commits.length,
      });

      return commits;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'GitHubService.getCommits');
      return [];
    }
  }

  /**
   * Get current GitHub configuration status
   */
  async getStatus(): Promise<{
    available: boolean;
    config?: {
      account: string;
      repo: string;
      repoUrl: string;
      hasToken: boolean;
    };
  }> {
    const available = await this.isAvailable();
    
    if (!available) {
      return { available: false };
    }

    const config = await getGitHubConfig();
    if (!config) {
      return { available: false };
    }

    return {
      available: true,
      config: {
        account: config.account,
        repo: config.repo,
        repoUrl: config.repoUrl,
        hasToken: !!config.token,
      },
    };
  }

  /**
   * Test GitHub API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!(await this.isAvailable())) {
        return false;
      }

      const response = await createGitHubRequest('');
      return response.ok;

    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const githubService = new GitHubService();

// Utility functions
export async function reportIssueToGitHub(
  title: string,
  description: string,
  errorInfo?: any
): Promise<boolean> {
  try {
    const fullBody = `
## Description
${description}

## Error Details
${errorInfo ? JSON.stringify(errorInfo, null, 2) : 'No additional error info'}

## Environment
- Platform: React Native
- Timestamp: ${new Date().toISOString()}
- App Version: 1.0.0

---
*This issue was automatically reported by the Advanced Agent System*
    `.trim();

    const issue = await githubService.createIssue(
      title,
      fullBody,
      ['bug', 'auto-reported']
    );

    return issue !== null;

  } catch (error) {
    console.error('Failed to report issue to GitHub:', error);
    return false;
  }
}

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const releases = await githubService.getReleases(1);
    return releases.length > 0 ? releases[0] : null;
  } catch (error) {
    console.error('Failed to get latest release:', error);
    return null;
  }
}