#!/bin/bash

# Setup Environment Script for Phi-4 Reasoning App

set -e

echo "🚀 Setting up Phi-4 Reasoning development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_step "Checking requirements..."
    
    # Check for Bun
    if ! command -v bun &> /dev/null; then
        print_error "Bun is required but not installed. Please install it from https://bun.sh"
        exit 1
    fi
    
    # Check for Git
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed."
        exit 1
    fi
    
    # Check for Expo CLI
    if ! command -v expo &> /dev/null; then
        print_warning "Expo CLI not found. Installing globally..."
        bun install -g @expo/cli
    fi
    
    print_success "All requirements satisfied"
}

# Setup environment variables
setup_env() {
    print_step "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Created .env from .env.example. Please update with your actual values."
        else
            print_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install Node dependencies
    bun install
    
    print_success "Dependencies installed"
}

# Setup iOS (macOS only)
setup_ios() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_step "Setting up iOS development..."
        
        # Check for Xcode
        if ! command -v xcodebuild &> /dev/null; then
            print_warning "Xcode not found. Please install Xcode from the App Store."
        else
            print_success "Xcode is available"
        fi
        
        # Check for CocoaPods
        if ! command -v pod &> /dev/null; then
            print_warning "CocoaPods not found. Installing..."
            sudo gem install cocoapods
        fi
        
        # Prebuild iOS
        print_step "Pre-building iOS project..."
        bun run expo prebuild --platform ios --clean
        
        # Install iOS dependencies
        if [ -d "ios/" ]; then
            cd ios/
            pod install
            cd ..
            print_success "iOS setup complete"
        fi
    else
        print_warning "Skipping iOS setup (not on macOS)"
    fi
}

# Setup Android
setup_android() {
    print_step "Setting up Android development..."
    
    # Check for Java
    if ! command -v java &> /dev/null; then
        print_warning "Java not found. Please install Java JDK 17."
    else
        print_success "Java is available"
    fi
    
    # Check for Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME not set. Please install Android Studio and set ANDROID_HOME."
    else
        print_success "Android SDK is configured"
    fi
    
    # Prebuild Android
    print_step "Pre-building Android project..."
    bun run expo prebuild --platform android --clean
    
    print_success "Android setup complete"
}

# Setup Git hooks
setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and tests before commit
echo "Running pre-commit checks..."

# Run TypeScript check
bun run tsc --noEmit
if [ $? -ne 0 ]; then
    echo "TypeScript check failed. Please fix errors before committing."
    exit 1
fi

# Run ESLint
bun run lint
if [ $? -ne 0 ]; then
    echo "ESLint check failed. Please fix linting errors before committing."
    exit 1
fi

# Run Prettier
bun run prettier --check .
if [ $? -ne 0 ]; then
    echo "Prettier check failed. Please format your code before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    print_success "Git hooks configured"
}

# Create development scripts
create_scripts() {
    print_step "Creating development scripts..."
    
    # Update package.json scripts
    bun run json -I -f package.json -e 'this.scripts = {
        ...this.scripts,
        "dev": "expo start",
        "dev:ios": "expo start --ios",
        "dev:android": "expo start --android",
        "dev:web": "expo start --web",
        "build:ios": "expo build:ios",
        "build:android": "expo build:android",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
        "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
        "format": "prettier --write .",
        "format:check": "prettier --check .",
        "type-check": "tsc --noEmit",
        "prebuild:ios": "expo prebuild --platform ios --clean",
        "prebuild:android": "expo prebuild --platform android --clean",
        "clean": "expo r -c",
        "reset": "bun run clean && rm -rf node_modules && bun install"
    }' 2>/dev/null || print_warning "Could not update package.json scripts automatically"
    
    print_success "Development scripts ready"
}

# Main setup function
main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Phi-4 Reasoning App Setup                   ║"
    echo "║              On-Device AI Development Environment           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_requirements
    setup_env
    install_dependencies
    setup_ios
    setup_android
    setup_git_hooks
    create_scripts
    
    echo ""
    print_success "🎉 Setup complete!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update .env file with your API keys"
    echo "2. Run 'bun run dev' to start development server"
    echo "3. Run 'bun run dev:ios' or 'bun run dev:android' for platform-specific development"
    echo ""
    echo -e "${BLUE}Available commands:${NC}"
    echo "• bun run dev          - Start Expo development server"
    echo "• bun run test         - Run test suite"
    echo "• bun run lint         - Run linting"
    echo "• bun run format       - Format code"
    echo "• bun run type-check   - Check TypeScript"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Run main function
main "$@"