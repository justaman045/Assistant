# Personal Dashboard

A full-stack personal productivity SaaS built with Next.js 15, Firebase, and OpenRouter AI. Source-available — you can read, learn from, and self-host this project. Commercial use is restricted (see [LICENSE](./LICENSE)).

## Features

| Feature | Description |
|---|---|
| **AI Content Creation** | Generate blog posts, tweets, emails with streaming output |
| **Planner** | Task manager with AI analysis and prioritization |
| **Finance Tracker** | Log income/expenses and ask AI questions about your spending |
| **Subscription Manager** | Track subscriptions with AI-powered optimization advice |
| **Roleplay Chat** | Persona-based AI chat partners with per-partner memory toggle |
| **Memory System** | Platform-wide personalization — AI learns your preferences across all features |
| **Brand Voice** | Define your writing tone; injected into all AI prompts |
| **Prompt Library** | Save and reuse custom prompts |
| **Calendar** | Personal calendar with event management |
| **Billing** | Razorpay subscription plans (Starter / Pro / Business) |
| **Referral System** | Credit-based referral program |
| **Admin Panel** | Manage OpenRouter API key rotation, usage tracking |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth + Database**: Firebase (Firestore + Auth)
- **AI**: OpenRouter (model-agnostic — works with GPT-4o, Claude, Gemini, etc.)
- **Payments**: Razorpay
- **Email**: Resend
- **Hosting**: Vercel

## Self-Hosting Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/dashboard.git
cd dashboard
npm install
```

### 2. Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Firestore** (start in production mode)
4. Generate a **Service Account** key: Project Settings → Service Accounts → Generate new private key
5. Deploy Firestore rules and indexes:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```

### 3. OpenRouter

Sign up at [openrouter.ai](https://openrouter.ai) and create an API key.

### 4. Razorpay (optional — required for billing)

1. Create an account at [razorpay.com](https://razorpay.com)
2. Create subscription plans in the Razorpay dashboard
3. Set up a webhook pointing to `https://your-domain.com/api/payments/webhook`

### 5. Resend (optional — required for transactional email)

Sign up at [resend.com](https://resend.com) and create an api key.

### 6. Environment variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase client config (from Firebase Console → Project Settings) |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Full JSON of your service account key, as one line |
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `RAZORPAY_KEY_ID` / `_SECRET` | Billing only | Razorpay API credentials |
| `RAZORPAY_PLAN_*` | Billing only | Plan IDs from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Billing only | From Razorpay webhook settings |
| `RESEND_API_KEY` | Email only | Resend API key |
| `CRON_SECRET` | Yes | Random string — `openssl rand -hex 32` |

### 7. Run locally

```bash
npm run dev
```

### 8. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

## Architecture

```
src/
├── app/
│   ├── (protected)/     # All authenticated pages (dashboard, planner, finance, etc.)
│   ├── api/             # API routes (AI streaming, payments, cron jobs)
│   ├── admin/           # Admin panel
│   ├── onboarding/      # New user flow
│   └── ...              # Public pages (landing, auth, terms, privacy)
├── components/          # Shared UI components
├── context/             # React context (Auth, Toast)
└── lib/                 # Business logic, Firebase helpers, AI utilities
```

### Key patterns

- **AI streaming**: All AI responses use Server-Sent Events (SSE) streamed from OpenRouter through Next.js API routes
- **Memory system**: `users/{uid}/memories/{memoryId}` in Firestore — extracted by LLM after each AI interaction, injected into future prompts across all features
- **Credit enforcement**: Server-side via Firebase Admin SDK — clients cannot bypass limits
- **Auth guard**: Layout component redirects unauthenticated users; all API routes verify Firebase ID tokens

## License

Source Available — see [LICENSE](./LICENSE). Personal self-hosting is permitted. Commercial use and running a competing hosted service are not.
