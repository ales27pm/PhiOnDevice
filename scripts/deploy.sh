#!/bin/bash

# Deployment Script for Phi-4 Reasoning App

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Phi-4 Reasoning"
BUNDLE_ID="com.vibecode.phi4reasoning"
ENVIRONMENTS=("development" "staging" "production")

# Functions
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

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build-android [env]    Build Android APK/AAB"
    echo "  build-ios [env]        Build iOS IPA"
    echo "  deploy-android [env]   Deploy to Google Play"
    echo "  deploy-ios [env]       Deploy to App Store"
    echo "  deploy-expo [env]      Deploy to Expo"
    echo "  release [version]      Create new release"
    echo "  help                   Show this help"
    echo ""
    echo "Environments: development, staging, production"
    echo ""
    echo "Examples:"
    echo "  $0 build-android production"
    echo "  $0 deploy-ios staging"
    echo "  $0 release 1.2.0"
}

validate_environment() {
    local env=$1
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        print_error "Invalid environment: $env"
        echo "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
}

setup_environment() {
    local env=$1
    print_step "Setting up $env environment..."
    
    # Copy environment-specific env file
    if [ -f ".env.$env" ]; then
        cp ".env.$env" ".env"
        print_success "Environment file configured for $env"
    else
        print_warning "No .env.$env file found, using existing .env"
    fi
    
    # Update app.json with environment-specific settings
    case $env in
        "development")
            export EXPO_PUBLIC_ENVIRONMENT="development"
            export APP_SUFFIX="-dev"
            ;;
        "staging")
            export EXPO_PUBLIC_ENVIRONMENT="staging"
            export APP_SUFFIX="-staging"
            ;;
        "production")
            export EXPO_PUBLIC_ENVIRONMENT="production"
            export APP_SUFFIX=""
            ;;
    esac
}

increment_version() {
    local version_type=$1
    print_step "Incrementing $version_type version..."
    
    # Get current version from app.json
    current_version=$(bun run expo config --type public | jq -r '.expo.version')
    
    # Parse version components
    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    major=${VERSION_PARTS[0]}
    minor=${VERSION_PARTS[1]}
    patch=${VERSION_PARTS[2]}
    
    # Increment based on type
    case $version_type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
    esac
    
    new_version="$major.$minor.$patch"
    
    # Update app.json with new version
    temp_file=$(mktemp)
    bun run expo config --type public | jq ".expo.version = \"$new_version\"" > "$temp_file"
    mv "$temp_file" app.json
    
    print_success "Version updated to $new_version"
    echo "$new_version"
}

build_android() {
    local env=${1:-production}
    validate_environment "$env"
    setup_environment "$env"
    
    print_step "Building Android app for $env..."
    
    # Clean and prebuild
    bun run expo prebuild --platform android --clean
    
    # Build
    cd android
    if [ "$env" = "production" ]; then
        ./gradlew bundleRelease
        ./gradlew assembleRelease
        print_success "Built production Android APK and AAB"
    else
        ./gradlew bundleDebug
        ./gradlew assembleDebug
        print_success "Built debug Android APK and AAB"
    fi
    cd ..
}

build_ios() {
    local env=${1:-production}
    validate_environment "$env"
    setup_environment "$env"
    
    print_step "Building iOS app for $env..."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS builds can only be performed on macOS"
        exit 1
    fi
    
    # Clean and prebuild
    bun run expo prebuild --platform ios --clean
    
    # Install pods
    cd ios
    pod install
    
    # Build
    if [ "$env" = "production" ]; then
        xcodebuild -workspace Phi4Reasoning.xcworkspace \
            -scheme Phi4Reasoning \
            -configuration Release \
            -destination generic/platform=iOS \
            -archivePath build/Phi4Reasoning.xcarchive \
            archive
        
        # Export IPA
        xcodebuild -exportArchive \
            -archivePath build/Phi4Reasoning.xcarchive \
            -exportOptionsPlist exportOptions.plist \
            -exportPath build/
        
        print_success "Built production iOS IPA"
    else
        print_warning "Debug iOS builds not implemented via script"
    fi
    cd ..
}

deploy_android() {
    local env=${1:-production}
    validate_environment "$env"
    
    print_step "Deploying Android app to $env..."
    
    # Check if AAB exists
    if [ ! -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
        print_error "AAB file not found. Run build-android first."
        exit 1
    fi
    
    # Deploy using fastlane
    case $env in
        "production")
            fastlane android release
            ;;
        "staging")
            fastlane android beta
            ;;
        *)
            print_error "Android deployment not supported for $env environment"
            exit 1
            ;;
    esac
    
    print_success "Android app deployed to $env"
}

deploy_ios() {
    local env=${1:-production}
    validate_environment "$env"
    
    print_step "Deploying iOS app to $env..."
    
    # Check if IPA exists
    if [ ! -f "ios/build/Phi4Reasoning.ipa" ]; then
        print_error "IPA file not found. Run build-ios first."
        exit 1
    fi
    
    # Deploy using fastlane
    case $env in
        "production")
            fastlane ios release
            ;;
        "staging")
            fastlane ios beta
            ;;
        *)
            print_error "iOS deployment not supported for $env environment"
            exit 1
            ;;
    esac
    
    print_success "iOS app deployed to $env"
}

deploy_expo() {
    local env=${1:-development}
    validate_environment "$env"
    setup_environment "$env"
    
    print_step "Deploying to Expo for $env..."
    
    # Publish to Expo
    bun run expo publish --release-channel "$env"
    
    print_success "App published to Expo ($env channel)"
}

create_release() {
    local version=$1
    
    if [ -z "$version" ]; then
        print_error "Version number required for release"
        echo "Usage: $0 release <version>"
        exit 1
    fi
    
    print_step "Creating release $version..."
    
    # Validate version format
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format. Use semantic versioning (e.g., 1.2.3)"
        exit 1
    fi
    
    # Check if tag already exists
    if git tag | grep -q "^v$version$"; then
        print_error "Version $version already exists"
        exit 1
    fi
    
    # Update version in app.json
    temp_file=$(mktemp)
    bun run expo config --type public | jq ".expo.version = \"$version\"" > "$temp_file"
    mv "$temp_file" app.json
    
    # Commit version bump
    git add app.json
    git commit -m "chore: bump version to $version"
    
    # Create and push tag
    git tag "v$version"
    git push origin main
    git push origin "v$version"
    
    print_success "Release $version created and pushed"
    print_step "GitHub Actions will automatically build and deploy the release"
}

# Main script logic
case $1 in
    "build-android")
        build_android "$2"
        ;;
    "build-ios")
        build_ios "$2"
        ;;
    "deploy-android")
        deploy_android "$2"
        ;;
    "deploy-ios")
        deploy_ios "$2"
        ;;
    "deploy-expo")
        deploy_expo "$2"
        ;;
    "release")
        create_release "$2"
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac