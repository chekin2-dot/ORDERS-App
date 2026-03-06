# Pre-Launch Checklist - ORDERS App

Use this checklist to ensure you're ready to launch on Google Play Store and Apple App Store.

---

## Phase 1: Accounts & Tools Setup ✅

- [ ] **Expo Account**
  - Created at [expo.dev](https://expo.dev)
  - Email verified

- [ ] **Google Play Console Account**
  - Created at [play.google.com/console](https://play.google.com/console)
  - $25 registration fee paid
  - Account verified

- [ ] **Apple Developer Account**
  - Created at [developer.apple.com](https://developer.apple.com)
  - $99 annual fee paid
  - Account verified

- [ ] **EAS CLI Installed**
  - Run: `npm install -g eas-cli`
  - Run: `eas login`

---

## Phase 2: App Configuration ✅

- [ ] **Bundle Identifiers**
  - iOS: `com.ordersapp.mobile` (or customize in `app.json`)
  - Android: `com.ordersapp.mobile` (or customize in `app.json`)

- [ ] **App.json Updated**
  - App name: "ORDERS App"
  - Version: 1.0.0
  - Permissions configured
  - Privacy descriptions added (in French)

- [ ] **EAS Project Configured**
  - Run: `eas build:configure`
  - Project ID added to `app.json`

- [ ] **Environment Variables Set**
  - Supabase URL added
  - Supabase Anon Key added
  - (Optional) Orange Money credentials
  - (Optional) Paystack credentials

---

## Phase 3: App Assets 🎨

### Required Assets

- [ ] **App Icon**
  - Size: 1024x1024 pixels
  - Format: PNG (no transparency)
  - File ready: `assets/images/icon.png`
  - Professionally designed
  - Clearly represents your brand

- [ ] **Android Screenshots** (minimum 2, recommended 4-8)
  - Size: 1080x1920 pixels or larger
  - Shows key features:
    - [ ] Onboarding/Welcome screen
    - [ ] Home screen (Client/Driver/Merchant)
    - [ ] Order placement flow
    - [ ] Messaging interface
    - [ ] Profile/Settings screen

- [ ] **iOS Screenshots** (minimum 3)
  - Size: 1290x2796 pixels (iPhone 14 Pro Max)
  - Shows same key features as Android

- [ ] **Feature Graphic** (Android only)
  - Size: 1024x500 pixels
  - Showcases app name and key features

### Screenshot Tips
- Use real data, not placeholder text
- Show the app in action
- Consider adding text overlays to highlight features
- Use high-quality device frames (optional)

---

## Phase 4: Store Listing Content 📝

- [ ] **Short Description** (80 characters)
  ```
  Livraison rapide de produits locaux avec suivi en temps réel
  ```

- [ ] **Full Description**
  - Compelling opening paragraph
  - Key features listed
  - Benefits for each user type (Client, Driver, Merchant)
  - Call to action
  - See template in `APP_STORE_DEPLOYMENT_GUIDE.md`

- [ ] **Keywords** (Apple only, 100 characters)
  ```
  livraison,courses,épicerie,express,local,commerçant,livreur,orange money
  ```

- [ ] **Category Selected**
  - Primary: Shopping or Business
  - Secondary: (optional)

- [ ] **Privacy Policy**
  - Created using `PRIVACY_POLICY_TEMPLATE.md`
  - Customized with your details
  - Hosted online (URL ready)
  - Legal review completed (recommended)

- [ ] **Support Information**
  - Support email set up
  - Support URL (if you have a website)
  - Response plan for user inquiries

---

## Phase 5: Testing 🧪

- [ ] **App Functionality**
  - [ ] Client registration works
  - [ ] Merchant registration works
  - [ ] Driver registration works
  - [ ] Order placement works
  - [ ] Payment flow works (or gracefully handled if not ready)
  - [ ] Messaging works between all user types
  - [ ] Location services work
  - [ ] Photo upload works
  - [ ] Notifications work

- [ ] **Test Accounts Created**
  - [ ] Test Client account
    - Email: ________________
    - Password: ________________
  - [ ] Test Merchant account
    - Email: ________________
    - Password: ________________
  - [ ] Test Driver account
    - Email: ________________
    - Password: ________________

- [ ] **Build Testing**
  - [ ] Android preview build tested (APK)
  - [ ] iOS preview build tested (if possible)
  - [ ] No critical bugs found
  - [ ] Performance is acceptable

---

## Phase 6: Production Builds 🔨

- [ ] **Android Production Build**
  - Run: `npm run build:android` or `eas build --platform android --profile production`
  - Build successful
  - AAB file downloaded
  - AAB file tested (optional)

- [ ] **iOS Production Build**
  - Run: `npm run build:ios` or `eas build --platform ios --profile production`
  - Build successful
  - IPA file ready
  - Uploaded to App Store Connect (automatic)

---

## Phase 7: Google Play Store Submission 🤖

- [ ] **App Created in Play Console**
  - App name: ORDERS App
  - Default language: French

- [ ] **Store Listing Completed**
  - [ ] App details filled
  - [ ] Screenshots uploaded
  - [ ] Feature graphic uploaded
  - [ ] Icon uploaded
  - [ ] Categorization set

- [ ] **App Content**
  - [ ] Privacy policy URL added
  - [ ] App access described
  - [ ] Ads declaration (No ads)
  - [ ] Content rating questionnaire completed
  - [ ] Target audience selected
  - [ ] Data safety form completed

- [ ] **Release**
  - [ ] AAB file uploaded
  - [ ] Release notes written
  - [ ] Countries/regions selected
  - [ ] Rollout percentage set (start with 100%)

- [ ] **Submission**
  - [ ] All sections show green checkmarks
  - [ ] Submitted for review
  - [ ] Confirmation email received

---

## Phase 8: Apple App Store Submission 🍎

- [ ] **App Created in App Store Connect**
  - App name: ORDERS App
  - Bundle ID: com.ordersapp.mobile
  - SKU: ordersapp-001

- [ ] **App Information**
  - [ ] Category: Shopping/Business
  - [ ] Privacy policy URL added
  - [ ] Subtitle (30 chars)
  - [ ] Keywords added

- [ ] **Pricing & Availability**
  - [ ] Price: Free
  - [ ] Availability: Selected countries

- [ ] **App Store Listing**
  - [ ] Screenshots uploaded (all required sizes)
  - [ ] Description added
  - [ ] Promotional text added
  - [ ] Support URL added

- [ ] **Build Selection**
  - [ ] Build from EAS visible in App Store Connect
  - [ ] Build selected for submission

- [ ] **App Review Information**
  - [ ] Test account credentials provided
  - [ ] Demo/testing notes added
  - [ ] Contact information provided

- [ ] **Submission**
  - [ ] All sections completed
  - [ ] Submitted for review
  - [ ] Confirmation email received

---

## Phase 9: Post-Submission 📬

- [ ] **Monitoring**
  - [ ] Check review status daily
  - [ ] Respond to reviewer questions within 24 hours
  - [ ] Monitor for rejection emails

- [ ] **If Rejected**
  - [ ] Read rejection reason carefully
  - [ ] Fix the issues
  - [ ] Resubmit quickly

- [ ] **If Approved**
  - [ ] Celebrate! 🎉
  - [ ] Share download links
  - [ ] Begin marketing efforts
  - [ ] Set up analytics
  - [ ] Monitor crash reports
  - [ ] Respond to user reviews

---

## Phase 10: Launch Preparation 🚀

- [ ] **Marketing Materials**
  - [ ] Social media posts prepared
  - [ ] Email announcement ready
  - [ ] Press release (if applicable)

- [ ] **User Support**
  - [ ] FAQ document created
  - [ ] Support team briefed
  - [ ] Response templates ready

- [ ] **Monitoring Setup**
  - [ ] Analytics configured
  - [ ] Error tracking enabled
  - [ ] Performance monitoring active

- [ ] **Scaling Preparation**
  - [ ] Supabase plan adequate for initial users
  - [ ] Payment systems ready for volume
  - [ ] Server capacity planned

---

## Important Reminders

### Orange Money Integration
- ✅ Can be enabled after launch
- ✅ Not required for initial submission
- ✅ Update via app update when ready

### Typical Timeline
- **Builds**: 30-60 minutes each
- **Store listing preparation**: 2-3 hours
- **Review time**: 1-3 days per store
- **Total from start to approval**: 3-7 days

### Common Reasons for Rejection
1. Missing privacy policy
2. Incomplete app information
3. Broken functionality
4. Missing test account credentials
5. Permission descriptions unclear

### After Launch
- Monitor reviews daily
- Respond to user feedback
- Plan first update within 2-4 weeks
- Track key metrics (downloads, active users, retention)

---

## Quick Reference

### Build Commands
```bash
# Android production
npm run build:android

# iOS production
npm run build:ios

# Both platforms
npm run build:all

# Check build status
eas build:list
```

### Submission Commands
```bash
# Submit to Google Play
npm run submit:android

# Submit to App Store
npm run submit:ios
```

### Support Links
- [Expo Documentation](https://docs.expo.dev)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS Build Docs](https://docs.expo.dev/build/introduction)

---

## Final Checklist Before Pressing "Submit"

- [ ] App has been thoroughly tested
- [ ] All store content is proofread
- [ ] Privacy policy is live and accurate
- [ ] Test accounts work
- [ ] Screenshots accurately represent the app
- [ ] Support email is monitored
- [ ] Ready to respond to reviewers
- [ ] Marketing materials are prepared
- [ ] Team is aware of launch
- [ ] Celebration plan in place! 🎊

---

**Good luck with your launch! You've got this! 🚀**
