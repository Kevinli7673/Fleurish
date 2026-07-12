# Fleurish 🌸

[![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deno](https://img.shields.io/badge/Deno-white?style=for-the-badge&logo=deno&logoColor=black)](https://deno.land/)

> A premium, gamified social plant identification and health diagnostic mobile application designed to help you discover, log, and care for nature around you.

---

## 🏆 Hackathon Submission
This project was developed and submitted as a group entry for **Knight Hacks' Bloom Knights 2026** (a intensive 12-hour hackathon). 

---

## ✨ Features

- 📸 **AI Plant Scanner & Identification**
  Identify any flower, leaf, or plant instantly using your camera! Integrates with Plant.id v3 and Supabase Edge Functions to return scientific names, common names, families, and light/water requirements.

- 🩺 **Automated AI Plant Doctor**
  Trigger health diagnostics on save! If activated, the virtual AI Doctor analyzes your photo along with your location, date, and custom notes (detecting keywords like *spots*, *brown*, *dry*, *yellowing*) to instantly chat and deliver diagnostic care recommendations.

- 🏡 **My Garden**
  Filter your collection in real-time with responsive search. Tracks:
  - **My Collection**: Real-time list of all your logged sightings (with options to delete).
  - **Favorites**: Automatically populates from plant sightings you liked in the feed.
  - **Want to Find**: Active gamified list recommending database plants you haven't discovered yet.

- 👥 **Social Feed & Notifications**
  See what plants your friends are logging nearby. Toggle bookmarks, like posts, and check the bell icon for dynamic notifications showing when new plant findings are spotted in your area.

- 🏆 **Gamified Leaderboard**
  Climb the ranks! Compete with friends and local players on the leaderboard sorted by total "bloom counts" logged.

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo (SDK 51), Expo Router (File-based Routing), TypeScript, Expo Linear Gradient, Lucide/Vector Icons.
- **Backend & Database**: Supabase (PostgreSQL database with RLS policies, trigger-based streaks/feed events, and Storage Buckets for photo uploads).
- **Edge Runtime**: Deno-powered Supabase Edge Functions (`identify-plant` for AI classification; `create-find` for transactional inserts; `get-leaderboard` for rank calculations).

---

## 🚀 Setup & Execution

### 1. Prerequisites
Ensure you have Node.js and the Supabase CLI installed on your machine.

### 2. Running the Mobile Application
1. Navigate to the `Mobile` directory:
   ```bash
   cd Mobile
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the Expo Go Metro server:
   ```bash
   npx expo start --tunnel --clear
   ```
4. Scan the QR code using the **Expo Go** application on your iOS or Android device.

### 3. Deploying Supabase Edge Functions (Optional)
If modifying the backend edge functions, deploy them to your Supabase project:
```bash
cd backend
npx supabase functions deploy identify-plant --no-verify-jwt
```
