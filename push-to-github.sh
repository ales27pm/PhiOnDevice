#!/bin/bash

# PhiOnDevice GitHub Push Script
# This script helps push the PhiOnDevice repository to GitHub

echo "🚀 PhiOnDevice GitHub Push Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Current Repository Status:${NC}"
echo "Repository: PhiOnDevice"
echo "Account: ales27pm"
echo "Local Path: $(pwd)"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in PhiOnDevice repository directory${NC}"
    exit 1
fi

# Check git status
echo -e "${BLUE}📋 Git Status:${NC}"
git status --short
echo ""

# Show recent commits
echo -e "${BLUE}📝 Recent Commits:${NC}"
git log --oneline -5
echo ""

# Check for GitHub token
if [ -f ".specialenv/.env" ]; then
    echo -e "${GREEN}✅ GitHub credentials file found${NC}"
    source .specialenv/.env
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${YELLOW}⚠️ Warning: GITHUB_TOKEN not set in .specialenv/.env${NC}"
    else
        echo -e "${GREEN}✅ GitHub token configured${NC}"
    fi
else
    echo -e "${RED}❌ No .specialenv/.env file found${NC}"
    echo "Create it with:"
    echo "mkdir -p .specialenv"
    echo "echo 'GITHUB_TOKEN=your_token_here' > .specialenv/.env"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Push Instructions:${NC}"
echo ""

echo -e "${YELLOW}1. Create GitHub Repository:${NC}"
echo "   - Go to: https://github.com/new"
echo "   - Repository name: PhiOnDevice"
echo "   - Description: Advanced AI Agent System with Local Phi-4-mini-reasoning LLM"
echo "   - Make it Public"
echo "   - Don't initialize with README"
echo ""

echo -e "${YELLOW}2. Update GitHub Token (if needed):${NC}"
echo "   - Go to: https://github.com/settings/tokens"
echo "   - Generate new token with 'repo' permissions"
echo "   - Update .specialenv/.env with new token"
echo ""

echo -e "${YELLOW}3. Push to GitHub:${NC}"
echo "   git remote add origin https://github.com/ales27pm/PhiOnDevice.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

# Attempt automatic push if token is available
if [ ! -z "$GITHUB_TOKEN" ]; then
    echo -e "${BLUE}🚀 Attempting automatic push...${NC}"
    
    # Remove existing remotes
    git remote remove origin 2>/dev/null || true
    git remote remove phiondevice 2>/dev/null || true
    
    # Add new remote with token
    git remote add origin "https://${GITHUB_ACCOUNT}:${GITHUB_TOKEN}@github.com/${GITHUB_ACCOUNT}/${GITHUB_REPO}.git"
    
    # Attempt push
    if git push -u origin main; then
        echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
        echo -e "${GREEN}🎉 Repository available at: https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPO}${NC}"
    else
        echo -e "${RED}❌ Push failed - possibly invalid token or repository doesn't exist${NC}"
        echo ""
        echo -e "${YELLOW}Manual steps:${NC}"
        echo "1. Create repository at: https://github.com/new"
        echo "2. Update token in .specialenv/.env"
        echo "3. Run: git push -u origin main"
    fi
else
    echo -e "${YELLOW}⚠️ Automatic push skipped - no GitHub token configured${NC}"
fi

echo ""
echo -e "${BLUE}📁 Repository Contents:${NC}"
echo "✅ Advanced Agent System (4,000+ lines of code)"
echo "✅ Local Phi-4-mini-reasoning LLM integration"
echo "✅ TurboModule specifications"
echo "✅ GitHub Actions CI/CD pipeline"
echo "✅ Comprehensive documentation"
echo "✅ MIT License"
echo ""

echo -e "${GREEN}🎯 PhiOnDevice is ready for deployment!${NC}"