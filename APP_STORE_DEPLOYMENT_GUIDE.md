# ORDERS App - Store Deployment Guide

This guide will help you deploy ORDERS App to both Google Play Store and Apple App Store.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [App Store Assets Required](#app-store-assets-required)
3. [Setup Steps](#setup-steps)
4. [Building for Production](#building-for-production)
5. [Publishing to Google Play Store](#publishing-to-google-play-store)
6. [Publishing to Apple App Store](#publishing-to-apple-app-store)
7. [Post-Launch Updates](#post-launch-updates)

---

## Prerequisites

Before you begin, ensure you have:

### Accounts
- **Expo Account**: Sign up at [expo.dev](https://expo.dev)
- **Google Play Console Account**: $25 one-time fee at [play.google.com/console](https://play.google.com/console)
- **Apple Developer Account**: $99/year at [developer.apple.com](https://developer.apple.com)

### Tools
- **Node.js**: Version 18 or higher
- **EAS CLI**: Install globally with `npm install -g eas-cli`
- **Expo CLI**: Install globally with `npm install -g expo-cli`

### Development Environment
- A Mac computer (required for iOS builds with local setup)
- OR use EAS Build (cloud-based, works on any OS)

---

## App Store Assets Required

### 1. App Icon
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency)
- **Current**: `assets/images/icon.png` (update if needed)
- **Requirements**:
  - Square shape
  - High resolution
  - No rounded corners (stores will apply their own)
  - Represents your brand clearly

### 2. Screenshots

#### iOS Screenshots (Required Sizes)
- **iPhone 6.7"** (iPhone 14 Pro Max): 1290 x 2796 pixels (minimum 3 screenshots)
- **iPhone 6.5"** (iPhone 11 Pro Max): 1242 x 2688 pixels
- **iPad Pro 12.9"**: 2048 x 2732 pixels (if supporting iPad)

#### Android Screenshots (Required Sizes)
- **Phone**: 1080 x 1920 pixels minimum (minimum 2 screenshots)
- **Tablet**: 1536 x 2048 pixels (optional but recommended)

**Screenshot Tips**:
- Capture main screens: Onboarding, Home, Order Flow, Messages, Profile
- Show key features: Driver tracking, Payment, Messaging
- Use real data (not lorem ipsum)
- Consider adding text overlays to highlight features

### 3. Feature Graphic (Android Only)
- **Size**: 1024 x 500 pixels
- **Format**: PNG or JPG
- **Purpose**: Displayed at the top of your store listing
- **Content**: Showcase your app's name, logo, and key feature

### 4. App Store Text Content

#### Short Description (Google Play)
- **Length**: Up to 80 characters
- **Example**: "Livraison rapide de produits locaux avec suivi en temps réel"

#### Full Description (Both Stores)
- **Length**: Up to 4000 characters (Google), 4000 bytes (Apple)
- **Example**:
```
ORDERS App - Votre plateforme de livraison locale

Commandez des produits frais et locaux auprès de commerçants de votre quartier avec livraison express en 10 minutes ou standard en 30 minutes.

POUR LES CLIENTS:
✓ Découvrez les commerçants près de chez vous
✓ Parcourez des catalogues variés (alimentation, pharmacie, etc.)
✓ Commandez en quelques clics
✓ Suivez votre livreur en temps réel
✓ Payez par Orange Money ou carte bancaire
✓ Communiquez directement avec votre livreur

POUR LES COMMERÇANTS:
✓ Créez votre boutique en ligne
✓ Gérez votre catalogue produits
✓ Recevez des commandes instantanément
✓ Suivez vos ventes et revenus
✓ Paiements quotidiens automatiques

POUR LES LIVREURS:
✓ Acceptez des courses en temps réel
✓ Gagnez 1 000 F par livraison standard
✓ Gagnez 1 500 F par livraison express
✓ Suivez vos gains quotidiens (90% pour vous, 10% commission)
✓ Paiements quotidiens via Orange Money
✓ Choisissez vos horaires de travail

Téléchargez ORDERS App et rejoignez la communauté locale de commerce et livraison!
```

#### Keywords (Apple App Store)
- **Length**: Up to 100 characters, comma-separated
- **Example**: "livraison,courses,épicerie,express,local,commerçant,livreur,orange money,food delivery"

#### Privacy Policy URL
- **Required**: Yes, for both stores
- **Action**: Create a privacy policy document and host it online
- **Content Should Include**:
  - What data you collect (location, photos, phone numbers)
  - How you use the data (matching orders, payments)
  - Third-party services (Supabase, Orange Money, Paystack)
  - User rights (access, deletion)

#### Support URL
- **Required**: Yes
- **Example**: Your website or a dedicated support page
- **Should Include**: Contact email, FAQs, troubleshooting

---

## Setup Steps

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Follow the prompts to login with your Expo account.

### Step 3: Configure Your Project

The project is already configured with `app.json` and `eas.json`. However, you need to:

1. **Update Bundle Identifiers** (if needed):
   - iOS: `com.ordersapp.mobile` (in `app.json`)
   - Android: `com.ordersapp.mobile` (in `app.json`)

2. **Create Expo Project**:
```bash
eas build:configure
```

This will:
- Create an Expo project if you don't have one
- Update your `app.json` with the project ID

### Step 4: Update Environment Variables

Create a production environment file or configure secrets:

```bash
# Add Supabase credentials
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-anon-key"

# Add payment credentials (when ready)
eas secret:create --scope project --name EXPO_PUBLIC_ORANGE_MONEY_API_KEY --value "your-orange-money-key"
eas secret:create --scope project --name EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY --value "your-paystack-key"
```

---

## Building for Production

### Build for Android (APK for testing)

```bash
eas build --platform android --profile preview
```

This creates an APK file you can install on Android devices for testing.

### Build for Android (AAB for Play Store)

```bash
eas build --platform android --profile production
```

This creates an Android App Bundle (.aab) file required by Google Play Store.

### Build for iOS (Simulator for testing)

```bash
eas build --platform ios --profile preview
```

### Build for iOS (App Store)

```bash
eas build --platform ios --profile production
```

**Note**: For iOS production builds, you'll need:
- An Apple Developer account
- To create an App Store app listing first
- To configure certificates and provisioning profiles (EAS handles this automatically)

### Build for Both Platforms

```bash
eas build --platform all --profile production
```

---

## Publishing to Google Play Store

### Step 1: Create App Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in app details:
   - **App name**: ORDERS App
   - **Default language**: French (Français)
   - **App or game**: App
   - **Free or paid**: Free

### Step 2: Complete Store Listing

Navigate to "Store listing" section and provide:

1. **App details**:
   - App name
   - Short description
   - Full description

2. **Graphics**:
   - App icon (512 x 512)
   - Feature graphic (1024 x 500)
   - Phone screenshots (minimum 2)
   - Tablet screenshots (optional)

3. **Categorization**:
   - **Category**: Shopping or Business
   - **Content rating**: Complete questionnaire

4. **Contact details**:
   - Email
   - Website (optional)
   - Privacy policy URL (required)

### Step 3: Set Up App Content

1. **Privacy policy**: Add your privacy policy URL
2. **App access**: Describe any login requirements
3. **Ads**: Indicate if app contains ads (No)
4. **Content rating**: Complete the questionnaire
5. **Target audience**: Select age groups
6. **Data safety**: Describe data collection and usage

### Step 4: Upload Your App

1. Navigate to "Production" → "Releases"
2. Click "Create new release"
3. Upload the `.aab` file from EAS Build
4. Add release notes
5. Review and roll out

### Step 5: Submit for Review

1. Complete all sections (marked with checkmarks)
2. Click "Submit for review"
3. Wait for approval (typically 1-3 days)

---

## Publishing to Apple App Store

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in app information:
   - **Platform**: iOS
   - **Name**: ORDERS App
   - **Primary Language**: French
   - **Bundle ID**: com.ordersapp.mobile
   - **SKU**: ordersapp-001 (or any unique identifier)

### Step 2: Complete App Information

Navigate through the tabs:

1. **App Information**:
   - Category: Shopping or Business
   - Privacy Policy URL
   - Subtitle (30 characters)
   - Keywords

2. **Pricing and Availability**:
   - Price: Free
   - Availability: All countries or specific ones

### Step 3: Prepare for Submission

1. **Screenshots**: Upload required screenshots
2. **App Preview** (optional): Upload video demos
3. **Promotional Text**: Short description
4. **Description**: Full app description
5. **Keywords**: Comma-separated keywords
6. **Support URL**: Your support website
7. **Marketing URL** (optional): Your marketing website

### Step 4: Build and Upload

1. **Run production build**:
```bash
eas build --platform ios --profile production
```

2. **Upload to App Store**:
   - EAS Build automatically uploads to App Store Connect
   - Or use `eas submit --platform ios`

3. **Select build**: In App Store Connect, select the uploaded build

### Step 5: App Review Information

1. **Sign-in required**: Provide test account credentials
   - Email: test-client@ordersapp.com
   - Password: TestPassword123
   - Notes: "Test account with sample data"

2. **Contact information**:
   - First name, Last name
   - Phone number
   - Email address

3. **Notes**: Add any notes for reviewers about testing

### Step 6: Submit for Review

1. Complete all sections
2. Click "Submit for Review"
3. Wait for approval (typically 1-3 days)

---

## Post-Launch Updates

### Updating the App

When you need to release updates:

1. **Update version numbers**:
   - In `app.json`: Increment `version` (e.g., "1.0.0" → "1.0.1")
   - iOS: Increment `buildNumber`
   - Android: Increment `versionCode`

2. **Build new version**:
```bash
eas build --platform all --profile production --auto-increment
```

3. **Submit to stores**:
   - Google Play: Upload new AAB in Play Console
   - App Store: Upload new build via EAS or Xcode

### Automated Submission with EAS Submit

```bash
# Android
eas submit --platform android --latest

# iOS
eas submit --platform ios --latest
```

### Monitoring

- **Google Play Console**: Monitor crashes, ratings, reviews
- **App Store Connect**: Monitor crashes, ratings, reviews
- **Supabase Dashboard**: Monitor database usage and errors
- Set up alerts for critical errors

---

## Troubleshooting

### Common Build Issues

**Error: Missing bundle identifier**
- Solution: Ensure `app.json` has `bundleIdentifier` (iOS) and `package` (Android)

**Error: Missing credentials**
- Solution: Run `eas credentials` to configure certificates

**Error: Build failed with "duplicate symbols"**
- Solution: Clear cache with `eas build --clear-cache`

### Common Submission Issues

**Google Play: "App is not signed"**
- Solution: Use AAB format (`--profile production`)

**Apple: "Missing required info"**
- Solution: Complete all fields in App Store Connect

**Both: "Privacy policy required"**
- Solution: Create and host a privacy policy document

---

## Support

- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **EAS Build**: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- **EAS Submit**: [docs.expo.dev/submit/introduction](https://docs.expo.dev/submit/introduction)
- **Google Play Console Help**: [support.google.com/googleplay](https://support.google.com/googleplay)
- **App Store Connect Help**: [developer.apple.com/help](https://developer.apple.com/help)

---

## Checklist Before Submission

### Pre-Build Checklist
- [ ] App icon is 1024x1024 and looks professional
- [ ] Bundle identifiers are unique and correct
- [ ] All permissions are properly described
- [ ] Environment variables are configured
- [ ] Privacy policy is created and hosted
- [ ] Support URL is set up

### Pre-Submission Checklist
- [ ] Screenshots are high quality and showcase key features
- [ ] App description is compelling and accurate
- [ ] Keywords are relevant and optimized
- [ ] Content rating questionnaire is completed
- [ ] Test accounts are provided (if login required)
- [ ] App has been thoroughly tested
- [ ] Orange Money integration is ready (or temporarily disabled)

### Post-Submission Checklist
- [ ] Monitor review status daily
- [ ] Respond to reviewer questions promptly
- [ ] Prepare marketing materials for launch
- [ ] Set up analytics and monitoring
- [ ] Plan user acquisition strategy

---

Good luck with your app store launch! 🚀
