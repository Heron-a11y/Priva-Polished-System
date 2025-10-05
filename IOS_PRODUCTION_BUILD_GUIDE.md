# 🍎 iOS Production Build Guide

## Prerequisites

### 1. Apple Developer Account
- [ ] Apple Developer Program membership ($99/year)
- [ ] App Store Connect access
- [ ] Valid Apple ID

### 2. Development Environment
- [ ] macOS (required for iOS development)
- [ ] Xcode 15+ installed
- [ ] iOS Simulator
- [ ] CocoaPods installed: `sudo gem install cocoapods`

### 3. EAS CLI Setup
- [ ] Node.js 18+ installed
- [ ] EAS CLI installed: `npm install -g @expo/eas-cli`
- [ ] EAS account created and logged in: `eas login`

## Production Build Process

### Step 1: Environment Setup

1. **Login to EAS:**
   ```bash
   eas login
   ```

2. **Verify EAS project:**
   ```bash
   eas project:info
   ```

### Step 2: Apple Developer Setup

1. **Create App in App Store Connect:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new app with bundle ID: `com.reedewree.arbodymeasurements`
   - Set app name: "AR Body Measurements"
   - Choose category: "Health & Fitness"

2. **Configure App Store Connect:**
   - Add app description
   - Upload screenshots
   - Set pricing and availability
   - Configure app information

### Step 3: Build Configuration

1. **Update EAS credentials:**
   ```bash
   eas credentials
   ```

2. **Configure iOS credentials:**
   - Select "iOS Distribution Certificate"
   - Select "App Store Connect API Key" or "App Store Connect Username/Password"
   - Configure provisioning profile

### Step 4: Production Build

#### Option A: Using Script (Recommended)
```bash
# On Windows
scripts\build-ios-production.bat

# On macOS
./scripts/build-ios-production.sh
```

#### Option B: Manual Build
```bash
# Clean and prepare
npx expo prebuild --platform ios --clean

# Install iOS dependencies (macOS only)
cd ios
pod install --repo-update
cd ..

# Build for production
eas build --platform ios --profile production
```

### Step 5: App Store Submission

1. **Download the .ipa file** from EAS build dashboard
2. **Upload to App Store Connect:**
   - Use Xcode Organizer or Transporter app
   - Or use EAS Submit: `eas submit --platform ios`

3. **Configure App Store listing:**
   - App description
   - Keywords
   - Screenshots
   - App preview videos
   - Privacy policy URL

4. **Submit for Review:**
   - Complete all required information
   - Submit for App Store review
   - Wait for approval (typically 24-48 hours)

## Build Profiles Explained

### Production Profile
- **Purpose:** App Store distribution
- **Configuration:** Release build, optimized for performance
- **Resource Class:** Large (for complex AR apps)
- **Distribution:** Store
- **Auto-increment:** Build number

### Preview Profile
- **Purpose:** Internal testing
- **Configuration:** Release build with development client
- **Resource Class:** Medium
- **Distribution:** Internal

## Troubleshooting

### Common Issues

1. **Build Fails with "No matching provisioning profile"**
   - Solution: Run `eas credentials` and reconfigure certificates

2. **ARKit not available on simulator**
   - Solution: Use physical device for testing AR features

3. **Pod install fails**
   - Solution: Update CocoaPods: `sudo gem update cocoapods`
   - Clear cache: `pod cache clean --all`

4. **Build timeout**
   - Solution: Use larger resource class or optimize build

### Performance Optimization

1. **Reduce bundle size:**
   - Remove unused assets
   - Optimize images
   - Use tree shaking

2. **Optimize AR performance:**
   - Reduce ARKit configuration complexity
   - Optimize frame processing
   - Use appropriate quality settings

## Monitoring and Analytics

### Build Monitoring
- EAS Build Dashboard: https://expo.dev/accounts/cocband/projects/ar-body-measurements/builds
- Build logs and status
- Download links for built apps

### App Store Analytics
- App Store Connect Analytics
- Download metrics
- User feedback
- Crash reports

## Security Considerations

1. **API Keys and Secrets:**
   - Store in EAS secrets: `eas secret:create`
   - Never commit to repository

2. **App Store Review:**
   - Ensure AR functionality is clearly described
   - Provide privacy policy
   - Test on multiple devices

3. **Data Privacy:**
   - Camera usage description
   - Location services description
   - Data collection transparency

## Next Steps After Build

1. **Test the build:**
   - Install on physical device
   - Test all AR features
   - Verify performance

2. **Prepare for submission:**
   - Create app screenshots
   - Write app description
   - Prepare marketing materials

3. **Submit to App Store:**
   - Complete App Store Connect setup
   - Submit for review
   - Monitor review status

## Support and Resources

- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **Apple Developer Docs:** https://developer.apple.com/documentation/
- **ARKit Documentation:** https://developer.apple.com/documentation/arkit/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

**Note:** This guide assumes you have a valid Apple Developer account and EAS CLI properly configured. For first-time setup, additional configuration may be required.


