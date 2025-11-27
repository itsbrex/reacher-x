# 🆁 ReacherX

<div align="left">

**An AI-powered search engine to find potential customers on the web.**

[![Live Site](https://img.shields.io/badge/🚀_Live_Site-reacherx.com-000000?style=for-the-badge)](https://reacherx.com)

[![MIT License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge&logo=opensourceinitiative&logoColor=black)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-000000?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

</div>

> **Version 3.0** - A better, faster, and cheaper solution than ads to reach your audience.

## What is ReacherX?

ReacherX is an AI-powered search engine that helps you find potential customers on X (Twitter) and LinkedIn. Instead of spending money on ads, you can directly reach people who need your product or service right now.

**Key capabilities:**

- **AI keyword suggestions** - Describe what you offer, get intelligent search queries
- **Multi-platform search** - Search X (Twitter) and LinkedIn simultaneously
- **Direct outreach** - Reply directly to potential customers from the platform
- **Smart filtering** - AI-powered filtering to surface high-intent opportunities
- **Workspace management** - Organize searches for different products/services
- **Learning system** - Upvote/downvote results to improve suggestions over time

**[Try it live →](https://reacherx.com)**

## Features

### ▪️ AI-Powered Keyword Generation

Describe your product or service, and ReacherX generates intelligent search queries that find people expressing genuine need or frustration—not sellers or affiliates.

### ▪️ Exact Phrase Matching

Toggle exact phrase match ON for precise, targeted results, or OFF for broader discovery and more opportunities.

### ▪️ Direct Customer Outreach

Reply directly to potential customers from within ReacherX. Queue multiple replies and keep working while earlier replies are sending—no need to wait.

### ▪️ Smart AI Filtering

AI analyzes search results and scores them for usefulness, automatically filtering out noise and surfacing high-intent opportunities.

### ▪️ Workspace Management

Organize your customer search across different products or services. Manage multiple workspaces to keep your outreach organized.

### ▪️ Advanced Filtering & Sorting

Filter results by post type (Posts, Replies, Quotes) and sort by relevance, date, or engagement to find people faster.

### ▪️ Learning System

Upvote good results and downvote bad ones to teach the system what works for you. Get better keyword suggestions over time.

### ▪️ Keyword Pinning

Pin your best-performing keywords for quick reuse. Discover more people who need what you have with proven search queries.

## Requirements

- **Node.js**: 20.0.0 or higher
- **Package Manager**: pnpm 9.15.4 or higher (npm and yarn not supported)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Backend**: Convex (reactive database with TypeScript)
- **Authentication**: WorkOS AuthKit
- **UI**: shadcn/ui, Radix UI, Tailwind CSS
- **Language**: TypeScript
- **Social APIs**: Twitter API v2, LinkedIn API
- **AI**: OpenAI, Anthropic Claude, xAI Grok (configurable)
- **Email**: Resend
- **Analytics**: PostHog

## Getting Started

**⚠️ This project requires pnpm as the package manager. npm and yarn are not supported.**

```bash
git clone https://github.com/noobships/reacher-x.git
cd reacher-x
pnpm install
```

### Configuration

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your environment variables:

   - X (Twitter) API credentials (`X_CLIENT_ID`, `X_CLIENT_SECRET`)
   - Convex deployment URL (`NEXT_PUBLIC_CONVEX_URL`)
   - WorkOS credentials (`WORKOS_CLIENT_ID`, `WORKOS_API_KEY`)
   - AI API keys (OpenAI, Anthropic, or xAI)
   - Exa API key (for URL description)
   - Encryption password (`ENCRYPTION_PASSWORD`)

3. Set up Convex:

```bash
npx convex dev
```

4. Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000` to see the app.

## Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Check for linting issues
```

### Project Structure

```
reacher-x/
├── app/              # Next.js app router pages
│   ├── (webapp)/     # Main application routes
│   ├── api/          # API routes
│   └── home/         # Landing page
├── convex/           # Convex backend functions
│   ├── lib/          # Shared utilities
│   └── *.ts          # Convex queries, mutations, actions
├── features/         # Feature-based modules
│   ├── composer/     # Post/reply composer
│   ├── keywords/     # Keyword management
│   ├── search/       # Search functionality
│   ├── threads/      # Thread management
│   └── webapp/       # Web app components
├── shared/           # Shared utilities and components
│   ├── hooks/        # React hooks
│   ├── lib/          # Utility functions
│   └── ui/           # UI components
└── public/           # Static assets
```

## How It Works

| **Traditional Approach**                                                                                                                                     | **ReacherX Approach**                                                                                                                                                                                |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1.` Create ad campaigns<br>`2.` Set targeting parameters<br>`3.` Pay for impressions/clicks<br>`4.` Hope people see and engage<br>`5.` Wait for conversions | `1.` Describe what you offer<br>`2.` Get AI-generated search queries<br>`3.` Find people actively expressing need<br>`4.` Reply directly with solutions<br>`5.` Build relationships, not just clicks |

## Contributing

This is an open source project and contributions are welcome! Whether you:

| **Find bugs**              | **Have feature ideas** | **Want to contribute code** | **Know about AI/ML** |
| :------------------------- | :--------------------- | :-------------------------- | :------------------- |
| Report issues you discover | Suggest new features   | Submit pull requests        | Share AI expertise   |

**All skill levels welcome.**

## Current Status

| **Status** | **Feature**                           |
| :--------: | :------------------------------------ |
|    `✓`     | AI keyword generation working         |
|    `✓`     | X (Twitter) search and filtering      |
|    `✓`     | LinkedIn search support               |
|    `✓`     | Direct reply functionality            |
|    `✓`     | Workspace management                  |
|    `✓`     | AI-powered result filtering           |
|    `✓`     | Keyword pinning and reuse             |
|    `✓`     | Production deployment on Vercel       |
|    `○`     | Enhanced LinkedIn features (planned)  |
|    `○`     | Additional social platforms (planned) |

## Contact

Built by **[@noobships](https://github.com/noobships)**

[![Email](https://img.shields.io/badge/Email-creativecoder.crco@gmail.com-000000?style=for-the-badge&logo=gmail&logoColor=white)](mailto:creativecoder.crco@gmail.com)

[![Issues](https://img.shields.io/badge/Feedback-Open_an_Issue-white?style=for-the-badge&logo=github&logoColor=black)](https://github.com/noobships/reacher-x/issues)

## License

MIT License - use it however you want.

---

**Like this project? Give it a ⭐**
