#!/usr/bin/env node

/**
 * System Prompt Update Script
 * 
 * Updates system prompt to use GitHub credentials only when needed
 * while keeping regular environment variables for other operations.
 */

const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT_UPDATE = `
# GitHub Integration Environment Handling

When GitHub operations are requested:
1. Load GitHub credentials from .specialenv/.env (NEVER from regular .env)
2. Use githubService for GitHub API operations
3. Always check availability with hasGitHubAccess() first
4. Fallback gracefully when GitHub credentials are not available

GitHub Credentials (NEVER store in regular files):
- Account: ales27pm
- Repository: native-monGARS
- Token: [SECURED in .specialenv/.env]

For all other operations, use default environment variables from the main .env file.

## Security Rules:
- NEVER include GitHub token in any file except .specialenv/.env
- NEVER commit .specialenv/ directory to version control
- NEVER log or display the GitHub token value
- Always use the githubEnv utility for GitHub credential access
- Use regular environment variables for all non-GitHub operations

## GitHub Operation Flow:
1. Check if GitHub access is needed
2. Load credentials only when required using githubEnv.loadGitHubCredentials()
3. Perform GitHub operations with proper error handling
4. Fallback to local-only mode when GitHub is unavailable
`;

console.log('📝 System Prompt Update for GitHub Integration');
console.log(SYSTEM_PROMPT_UPDATE);

// Verify .specialenv/.env exists and is properly configured
const specialEnvPath = path.join(__dirname, '..', '.specialenv', '.env');
if (fs.existsSync(specialEnvPath)) {
  console.log('✅ GitHub credentials file exists at .specialenv/.env');
  
  // Check if it's in .gitignore
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.specialenv/')) {
      console.log('✅ .specialenv/ directory is properly gitignored');
    } else {
      console.log('⚠️ WARNING: .specialenv/ should be added to .gitignore');
    }
  }
  
  // Verify credentials format (without exposing token)
  const envContent = fs.readFileSync(specialEnvPath, 'utf8');
  const hasAccount = envContent.includes('GITHUB_ACCOUNT=ales27pm');
  const hasRepo = envContent.includes('GITHUB_REPO=native-monGARS');
  const hasToken = envContent.includes('GITHUB_TOKEN=ghp_');
  
  console.log(`✅ GitHub Account: ${hasAccount ? 'Configured' : 'Missing'}`);
  console.log(`✅ GitHub Repository: ${hasRepo ? 'Configured' : 'Missing'}`);
  console.log(`✅ GitHub Token: ${hasToken ? 'Configured' : 'Missing'}`);
  
  if (hasAccount && hasRepo && hasToken) {
    console.log('🎉 GitHub credentials are properly configured!');
  } else {
    console.log('❌ Some GitHub credentials are missing');
  }
  
} else {
  console.log('❌ GitHub credentials file not found at .specialenv/.env');
}

console.log('\n🔒 Security Reminder:');
console.log('- GitHub token is stored in .specialenv/.env (gitignored)');
console.log('- Token is never exposed in regular app files');
console.log('- Credentials are only loaded when GitHub operations are needed');
console.log('- System falls back to local-only mode when GitHub is unavailable');

console.log('\n📱 Usage in App:');
console.log('- Use githubService for all GitHub operations');
console.log('- Check availability with hasGitHubAccess()');
console.log('- System automatically loads credentials when needed');
console.log('- Regular .env file is used for all other environment variables');

process.exit(0);