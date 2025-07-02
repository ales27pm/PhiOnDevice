#!/usr/bin/env node

/**
 * Test GitHub Connection with Special Environment Credentials
 */

const fs = require('fs');
const path = require('path');

async function testGitHubConnection() {
  try {
    // Load credentials from .specialenv/.env
    const specialEnvPath = path.join(__dirname, '.specialenv', '.env');
    
    if (!fs.existsSync(specialEnvPath)) {
      console.log('❌ .specialenv/.env file not found');
      return false;
    }

    const envContent = fs.readFileSync(specialEnvPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });

    console.log('🔍 Testing GitHub Connection...');
    console.log(`Account: ${envVars.GITHUB_ACCOUNT}`);
    console.log(`Repository: ${envVars.GITHUB_REPO}`);
    console.log(`Token: ${envVars.GITHUB_TOKEN ? 'Configured ✅' : 'Missing ❌'}`);

    if (!envVars.GITHUB_TOKEN || !envVars.GITHUB_ACCOUNT || !envVars.GITHUB_REPO) {
      console.log('❌ Missing required credentials');
      return false;
    }

    // Test GitHub API connection
    const apiUrl = `https://api.github.com/repos/${envVars.GITHUB_ACCOUNT}/${envVars.GITHUB_REPO}`;
    
    console.log(`🌐 Testing API connection to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${envVars.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PhiOnDevice-Test'
      }
    });

    console.log(`📡 Response Status: ${response.status}`);

    if (response.ok) {
      const repoData = await response.json();
      console.log('✅ GitHub connection successful!');
      console.log(`📂 Repository: ${repoData.full_name}`);
      console.log(`🌟 Stars: ${repoData.stargazers_count}`);
      console.log(`🍴 Forks: ${repoData.forks_count}`);
      console.log(`📅 Updated: ${repoData.updated_at}`);
      return true;
    } else {
      const errorData = await response.text();
      console.log('❌ GitHub API Error:', response.status, errorData);
      return false;
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Run the test
testGitHubConnection().then(success => {
  process.exit(success ? 0 : 1);
});