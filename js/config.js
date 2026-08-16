// Sleepy Hollows Website - Configuration
// =========================================================
// Instructions for YouTube API Key security:
// 1. Go to Google Cloud Console (https://console.cloud.google.com/).
// 2. Select your project and go to "APIs & Services" > "Credentials".
// 3. Edit your API Key and under "API restrictions", select "Restrict key".
// 4. Under "Application restrictions", select "Websites (HTTP referrers)".
// 5. Add the following allowed URLs:
//    - http://localhost:3000/*
//    - http://127.0.0.1:3000/*
//    - https://sleepyhollows.com/*
//    - https://*.sleepyhollows.com/*
// This prevents anyone from stealing and using your API Key on other domains.

const CONFIG = {
  // Replace this placeholder with your actual Google/YouTube API v3 Key
  YOUTUBE_API_KEY: "YOUR_YOUTUBE_API_KEY_HERE"
};
