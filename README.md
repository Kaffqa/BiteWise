# BiteWise

![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)
![AI Powered](https://img.shields.io/badge/AI-Groq_%7C_Gemini-FF6F00?style=flat-square)

BiteWise is an advanced, AI-powered food tracking and personalized nutrition assistant. Designed for modern health-conscious individuals, the platform leverages computer vision and large language models to analyze dietary habits, estimate nutritional values, and ensure food safety based on personal medical profiles.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Technical Documentation](#technical-documentation)
    - [System Architecture](#system-architecture)
    - [Database Schema](#database-schema)
    - [Project Structure](#project-structure)
4. [Installation Guide](#installation-guide)
5. [Environment Configuration](#environment-configuration)

---

## Key Features

- **AI-Driven Visual Food Analysis**  
  Utilizing Groq (Primary) and Gemini (Fallback) APIs, users can capture or upload images of their meals. The platform accurately identifies the food, estimates portion sizes, and extracts key nutritional data.
  
- **Personalized Health & Safety Guardian**  
  BiteWise cross-references identified ingredients against the user's specific health profile. It actively flags potential allergens, dietary intolerances, and risks related to preexisting medical conditions.

- **Realtime Automated Notifications**  
  Powered by Supabase Realtime, the application proactively alerts users via a notification bell if they attempt to consume dangerous allergens or if a scanned meal exceeds their daily calorie targets.

- **Dynamic Macro Tracking & TDEE Calculation**  
  The system automatically calculates the user's Total Daily Energy Expenditure (TDEE) based on biometric data and lifestyle factors, offering a real-time dashboard to track daily nutritional targets.

---

## Technology Stack

### Frontend Application
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS v4
- **Icons:** Phosphor Icons & Lucide React

### Backend & Infrastructure
- **Database:** Supabase (PostgreSQL)
- **Realtime:** Supabase Realtime Subscriptions
- **Security:** Strict Row Level Security (RLS) policies

### Artificial Intelligence Services
- **Primary Provider:** Groq API (`llama-3.3-70b-versatile`) for high-speed, low-latency inference.
- **Alternative Provider:** Google Gemini API (`gemini-1.5-flash`) used as a seamless fallback.

---

## Technical Documentation

### System Architecture

1. **AI Fallback Orchestration Pattern:** 
   Located in `src/lib/providers/fallback-provider.ts`, the application uses a sophisticated adapter pattern to wrap multiple LLM providers. If the primary provider (Groq) fails due to rate limits or network issues, the system catches the error and seamlessly routes the payload to the secondary provider (Gemini) with zero downtime to the user.

2. **Realtime Data Sync:** 
   The application leverages PostgreSQL triggers and Supabase Realtime Channels to push automated alerts directly to the React frontend state, eliminating the need for client-side polling.

3. **Strict JSON Parsing:** 
   The application enforces strict response schemas (`response_format: { type: "json_object" }`) ensuring that all AI responses map perfectly to internal TypeScript interfaces without hallucinating markdown.

### Database Schema

The PostgreSQL database is highly normalized and optimized:

- `profiles`: User demographics, biometric metrics, and health goals.
- `food_scans` & `scan_items`: Historical ledger for AI analyses and detected ingredients.
- `meal_logs` & `daily_nutrition_summaries`: Tracks daily caloric and macronutrient intake.
- `user_ingredients`: Personalized dictionary of safe vs flagged ingredients.
- `notifications`: Stores automated system alerts, equipped with Realtime extensions and RLS.

### Project Structure

```text
├── src/
│   ├── components/       # Reusable modular UI components (Auth, Layout, UI primitives)
│   ├── contexts/         # Global state management providers
│   ├── hooks/            # Custom React hooks encapsulating data fetching and local state
│   ├── lib/              # Core utilities, AI providers, and Supabase client
│   ├── pages/            # Top-level route components acting as application views
│   └── types/            # Strict TypeScript definitions and API interfaces
├── supabase/
│   ├── schema.sql           # Database table definitions and triggers
│   └── storage-policies.sql # Security rules for Supabase object storage
├── package.json
└── vite.config.ts
```

---

## Installation Guide

Follow these instructions to deploy a local development environment of BiteWise.

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm or yarn
- **Supabase**: An active Supabase project
- **API Keys**: Access keys for Groq Console and Google Gemini Studio

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/BiteWise.git
   cd BiteWise
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Initialization**
   - Navigate to your Supabase project dashboard and open the SQL Editor.
   - Execute the SQL script located at `supabase/schema.sql` to generate the necessary tables and indexes.
   - Execute the script at `supabase/storage-policies.sql` to enforce storage security policies.
   - Run the custom SQL script to create the `notifications` table and RLS policies.

4. **Environment Variables**
   Duplicate the example environment file:
   ```bash
   cp .env.example .env
   ```
   *Refer to the Environment Configuration section below to populate the values.*

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Environment Configuration

Your `.env` file must contain the following keys:

| Variable Name | Description | Required |
|---------------|-------------|----------|
| `VITE_SUPABASE_URL` | The REST URL of your Supabase project. | Yes |
| `VITE_SUPABASE_ANON_KEY` | The anonymous public API key for Supabase. | Yes |
| `VITE_AI_PROVIDER` | Active AI provider (`groq`, `gemini`, or `fallback`). Defaults to `fallback`. | No |
| `VITE_GROQ_API_KEY` | Your Groq API key (Primary). | Yes* |
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key (Fallback). | Yes* |

*\* Note: For `fallback` mode, both API keys are required.*

---

*Documentation generated for technical assessment and repository evaluation.*