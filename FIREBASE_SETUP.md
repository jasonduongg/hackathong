# Firebase Setup Guide

This guide will help you set up Firebase Authentication and Firestore Database for your Next.js application.

## Prerequisites

- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name and follow the setup wizard
4. Enable Google Analytics (optional but recommended)

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database
5. Click "Done"

## Step 4: Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

1. Copy the `env.example` file to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Replace the placeholder values in `.env.local` with your actual Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## Step 6: Set up Firestore Security Rules

1. In your Firebase project, go to "Firestore Database" > "Rules"
2. Replace the default rules with the following (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read all user profiles (for now)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

## Step 7: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth` to test the authentication

3. Try creating a new account and signing in

## Features Included

### Authentication
- ✅ Email/password sign up and sign in
- ✅ User authentication state management
- ✅ Sign out functionality
- ✅ Protected routes (can be implemented)

### User Management
- ✅ User profile creation in Firestore
- ✅ User profile reading and updating
- ✅ User profile display and editing
- ✅ User data validation

### Components
- ✅ `SignInForm` - Email/password sign in
- ✅ `SignUpForm` - Email/password registration
- ✅ `UserProfile` - Profile display and editing
- ✅ `AuthContext` - Global authentication state

### Database Operations
- ✅ Create user profiles
- ✅ Read user profiles
- ✅ Update user profiles
- ✅ Delete user profiles
- ✅ Query users by email

## File Structure

```
src/
├── lib/
│   ├── firebase.ts          # Firebase configuration
│   ├── auth.ts              # Authentication utilities
│   └── users.ts             # User database operations
├── contexts/
│   └── AuthContext.tsx      # Authentication context
├── components/
│   └── auth/
│       ├── SignInForm.tsx   # Sign in form
│       ├── SignUpForm.tsx   # Sign up form
│       └── UserProfile.tsx  # User profile component
└── app/
    └── auth/
        └── page.tsx         # Authentication page
```

## Next Steps

1. **Secure Firestore Rules**: Update the security rules to be more restrictive for production
2. **Add More Authentication Methods**: Implement Google, GitHub, or other OAuth providers
3. **Add Password Reset**: Implement password reset functionality
4. **Add Email Verification**: Enable email verification for new accounts
5. **Add User Roles**: Implement role-based access control
6. **Add Profile Pictures**: Implement image upload functionality

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/user-not-found)"**: User doesn't exist, try signing up first
2. **"Firebase: Error (auth/wrong-password)"**: Incorrect password
3. **"Firebase: Error (auth/email-already-in-use)"**: Email is already registered
4. **"Firebase: Error (auth/weak-password)"**: Password is too weak (must be at least 6 characters)

### Environment Variables Not Working

1. Make sure your `.env.local` file is in the root directory
2. Restart your development server after adding environment variables
3. Check that all environment variable names start with `NEXT_PUBLIC_`

### Firestore Permission Denied

1. Check your Firestore security rules
2. Make sure you're authenticated when trying to access the database
3. Verify that your Firebase configuration is correct

## Security Considerations

1. **Environment Variables**: Never commit your `.env.local` file to version control
2. **Firestore Rules**: Always secure your Firestore rules before going to production
3. **API Keys**: The Firebase API key is safe to expose in client-side code, but keep other secrets secure
4. **User Data**: Validate and sanitize all user input before storing in the database

## Production Deployment

1. Update Firestore security rules for production
2. Enable additional authentication methods if needed
3. Set up proper error monitoring
4. Configure Firebase hosting if needed
5. Set up proper CORS policies 