This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# hackathong

## Enhanced Video Analysis Features

### Improved Frame Extraction
- **1 frame per 2 seconds**: Videos are now analyzed more thoroughly with frame extraction every 2 seconds
- **Progress tracking**: Real-time progress bar shows frame extraction and analysis status
- **Better coverage**: Ensures comprehensive analysis of video content

### Smart Place Name Validation
- **Google Search Integration**: Validates place names by searching online to distinguish between:
  - Real business names (e.g., "Cali Spartan Restaurant")
  - Account names (e.g., "@calispartan")
  - Generic terms that aren't specific places
- **Context Analysis**: Uses location hints like "san jose", "bay area" to improve place identification
- **Confidence Scoring**: Each identified place gets a confidence score based on search results

### Enhanced Location Detection
- **Context Clues**: Extracts location hints from tags and captions
- **Multiple Validation**: Combines visual analysis with online search validation
- **Geocoding**: Provides real addresses and coordinates for validated places

### Setup Requirements
To enable Google search validation, add your SerpAPI key to your environment variables:
```bash
SERPAPI_KEY=your_api_key_here
```

Note: The system will work without the API key but place validation will be limited.
