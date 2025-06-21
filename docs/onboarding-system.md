# Onboarding System Documentation

## Overview

The onboarding system automatically detects when a user hasn't completed their profile setup and guides them through a series of questions to collect important information.

## How It Works

### 1. Onboarding Detection
- When a user logs in or signs up, the system checks the `hasCompletedOnboarding` field in their profile
- If `hasCompletedOnboarding` is `false` or `undefined`, the onboarding flow is triggered
- Users see a welcome screen with a "Start Onboarding" button

### 2. Paginated Form
The onboarding form uses a paginated approach with questions stored in the `ONBOARDING_QUESTIONS` object:

```typescript
const ONBOARDING_QUESTIONS = {
    displayName: {
        title: "What should we call you?",
        subtitle: "This is how other users will see your name",
        type: "text",
        required: true,
        placeholder: "Enter your display name"
    },
    // ... more questions
};
```

### 3. Question Types
The system supports multiple question types:
- **text**: Simple text input
- **date**: Date picker
- **boolean**: Yes/No selection with styled buttons
- **multiSelect**: Multiple choice with selectable options
- **address**: Complex address form with multiple fields

### 4. Data Collection
The system collects the following information:
- **Display Name**: How the user wants to be called
- **Birthday**: For personalization
- **Job**: Professional information
- **Dietary Restrictions**: Food limitations (multi-select)
- **Food Preferences**: Favorite cuisines (multi-select)
- **Activity Preferences**: Interests and hobbies (multi-select)
- **General Availability**: Schedule availability (boolean)
- **Address**: Location information (optional)

## File Structure

```
src/
├── components/
│   └── onboarding/
│       └── OnboardingForm.tsx    # Main onboarding component
├── lib/
│   └── users.ts                  # Updated with onboarding fields
└── app/
    └── home/
        └── page.tsx              # Updated to check onboarding status
```

## User Profile Schema

The `UserProfile` interface has been extended with onboarding fields:

```typescript
export interface UserProfile {
    // ... existing fields
    hasCompletedOnboarding?: boolean;
    dietaryRestrictions?: string[];
    birthday?: Date;
    job?: string;
    generalAvailable?: boolean;
    activityPreferences?: string[];
    foodPreferences?: string[];
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
}
```

## User Experience Flow

1. **New User Signs Up**: `hasCompletedOnboarding` defaults to `false`
2. **Welcome Screen**: User sees onboarding invitation
3. **Onboarding Form**: 8-step paginated form with progress bar
4. **Data Validation**: Required fields are validated before proceeding
5. **Profile Update**: Data is saved to Firestore and `hasCompletedOnboarding` set to `true`
6. **Profile Display**: User sees their complete profile with all collected information

## Features

### Progress Tracking
- Visual progress bar showing completion percentage
- Step counter (e.g., "Step 3 of 8")
- Navigation between steps with Previous/Next buttons

### Form Validation
- Required field validation
- Proper data types for each field
- Error handling for save operations

### Responsive Design
- Mobile-friendly layout
- Accessible form controls
- Clean, modern UI with Tailwind CSS

### Data Persistence
- All data is saved to Firestore
- Profile can be updated later
- Data is displayed in the user profile

## Customization

### Adding New Questions
To add a new question:

1. Add the question to `ONBOARDING_QUESTIONS`
2. Add the field to `QUESTION_ORDER`
3. Update the `OnboardingData` interface
4. Add the field to the `UserProfile` interface
5. Update the form rendering logic if needed

### Modifying Question Types
The system is extensible for new question types by adding new cases to the `renderQuestion()` function.

### Styling
All styling uses Tailwind CSS classes and can be easily customized by modifying the className properties.

## Security Considerations

- All data is validated before saving
- User can only update their own profile
- Sensitive information (like address) is optional
- Data is stored securely in Firestore

## Future Enhancements

Potential improvements:
- Skip option for optional questions
- Conditional questions based on previous answers
- File upload for profile pictures
- Social media integration
- Preference-based recommendations 