# Quick Start - Deploy ORDERS App

This is a simplified guide to get your app published as quickly as possible.

## Step 1: Install Required Tools (5 minutes)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create account at expo.dev if you don't have one)
eas login
```

## Step 2: Configure Your Project (5 minutes)

```bash
# Initialize EAS Build
eas build:configure

# This will:
# 1. Ask you to create/select an Expo project
# 2. Update app.json with your project ID
```

## Step 3: Add Your Environment Variables (5 minutes)

```bash
# Add Supabase credentials
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_SUPABASE_URL"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY"
```

**Note**: You can skip Orange Money and Paystack for now and add them later.

## Step 4: Build for Android (30-45 minutes)

```bash
# Create a production build for Google Play Store
eas build --platform android --profile production
```

This will:
- Build your app in the cloud (no need for local Android Studio)
- Generate an `.aab` file (Android App Bundle)
- Provide a download link when complete

## Step 5: Build for iOS (30-45 minutes)

```bash
# Create a production build for Apple App Store
eas build --platform ios --profile production
```

**Important**: You'll need an Apple Developer account ($99/year). EAS will guide you through certificate setup.

## Step 6: Prepare Store Listings

While builds are running, prepare your store content:

### Required Assets
1. **App Icon**: 1024x1024 PNG (already at `assets/images/icon.png`)
2. **Screenshots**:
   - Take 3-4 screenshots of your app
   - Resize to 1080x1920 for Android
   - Resize to 1290x2796 for iOS

### Required Text
1. **Short Description** (80 chars):
   ```
   Livraison rapide de produits locaux avec suivi en temps réel
   ```

2. **Full Description**: See `APP_STORE_DEPLOYMENT_GUIDE.md` for template

3. **Privacy Policy**: Create a simple document at your website or use a generator

## Step 7: Upload to Google Play Store (30 minutes)

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Complete store listing with assets and text
4. Upload the `.aab` file from Step 4
5. Complete all required sections
6. Submit for review

## Step 8: Upload to Apple App Store (30 minutes)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Complete app information with assets and text
4. The build from Step 5 should auto-upload
5. Select the build and complete all sections
6. Submit for review

## Total Time: ~3-4 hours

- **Setup & Configuration**: 30 minutes
- **Builds**: 1-2 hours (mostly waiting)
- **Store Listings**: 1-2 hours

## Need Help?

See the detailed `APP_STORE_DEPLOYMENT_GUIDE.md` for:
- Troubleshooting common issues
- Detailed screenshots requirements
- Store optimization tips
- Update procedures

## Quick Commands Reference

```bash
# Build both platforms at once
eas build --platform all --profile production

# Build preview/test version (APK for Android)
eas build --platform android --profile preview

# Check build status
eas build:list

# Automatic submission after build
eas submit --platform android --latest
eas submit --platform ios --latest

# Update app version (before new build)
# Manually edit app.json and increment version numbers
```

## Important Notes

1. **Bundle Identifiers**: Already configured as `com.ordersapp.mobile` - change if needed in `app.json`

2. **Test Accounts**: When submitting to stores, provide test credentials:
   - Create test accounts for Client, Driver, and Merchant roles
   - Document them for reviewers

3. **Review Time**:
   - Google Play: 1-3 days typically
   - Apple App Store: 1-3 days typically

4. **Orange Money**: Can be enabled after app is live - not required for initial submission

5. **App Updates**: When you need to update:
   - Increment version in `app.json`
   - Run build command with `--auto-increment` flag
   - Upload to stores

---

**Ready to Deploy?** Start with Step 1! 🚀
