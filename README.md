# Tresta - Testimonial Management Platform

**A modern, full-stack platform for collecting, managing, and displaying customer testimonials with embeddable widgets.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-green)](https://www.prisma.io/)
[![MVP Launch](https://img.shields.io/badge/MVP-launch%20checklist-blue)](MVP_LAUNCH_CHECKLIST.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

> **📊 Launch readiness:** tracked in the [MVP launch checklist](MVP_LAUNCH_CHECKLIST.md).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## 🌟 Overview

Tresta is a comprehensive testimonial management platform that enables businesses to:

- 🎯 Collect verified testimonials from customers via customizable forms
- 🛡️ Automatically moderate content with advanced sentiment analysis
- ✅ Manage and moderate testimonials with OAuth verification and bulk actions
- 🎨 Display testimonials on any website using embeddable widgets
- 📊 Track testimonial performance and analytics

Built as a **Turborepo monorepo** with modern TypeScript tooling, Tresta provides a seamless experience for both platform owners and end-users.

> **🔒 Repository status:** Tresta is now closed-source and maintained as a private codebase.

**Recent Updates (November 2025):**

- ✅ Live widget preview embedded in the dashboard builder with instant config sync
- ✅ WCAG 2.1 AA accessibility sweep for the widget (keyboard nav, ARIA, live regions)
- ✅ CSP compliance toolkit with runtime validator + CI audit script
- ✅ Auto-moderation system with heuristic rules and optional AI classification
- ✅ Google OAuth verification with trust badges
- ✅ Custom account settings with GDPR compliance
- ✅ Integrated moderation UI with bulk actions

---

## ✨ Features

### Core Features (MVP - Completed)

- ✅ **OAuth Verification** - Google Sign-In for verified testimonials with trust badges
- ✅ **Auto-Moderation** - Hybrid moderation with heuristic rules and optional AI classification (OpenAI Moderation API)
- ✅ **Avatar Support** - Auto-sync from OAuth providers, Azure Blob Storage integration
- ✅ **Embeddable Widgets** - Standalone JavaScript widgets (carousel, grid, masonry, wall, list, marquee)
- ✅ **Project Management** - Create and manage multiple testimonial projects
- ✅ **Testimonial Forms** - Public-facing forms with customizable branding
  - Field visibility toggles (rating, role, company, avatar, video, Google verification)
  - Field requirement controls (require rating/role/company/avatar/video)
  - Submission behavior controls (require Google verification, anonymous submission toggle)
  - Notification preference per project (notify owner on new submission)
- ✅ **Admin Dashboard** - Full-featured management interface with bulk moderation
- ✅ **Source Tracking** - IP address, user agent, and source metadata capture
- ✅ **Custom Account Settings** - Profile management with privacy transparency page
- ✅ **Data Export & Deletion** - GDPR-compliant data portability and account deletion

### Moderation Features

- 🛡️ **Sentiment Analysis** - Weighted keyword detection with negation handling and 5-category scoring
- 🤖 **Profanity Detection** - Multi-category filtering (severe, mild, offensive) with obfuscation detection
- 🚫 **Spam Detection** - Pattern matching for excessive caps, repetition, URLs, and promotional language
- 🧠 **AI Classification** - Optional OpenAI Moderation API integration for hate speech, harassment, and violence detection
- 📊 **Risk Scoring** - 0-1 scale for problematic content identification
- ⚙️ **Project-Level Settings** - Configurable moderation rules and auto-approval
- 🔍 **Inline Moderation UI** - Integrated filters, badges, and bulk actions
- 📦 **Batch Processing** - Bulk approve/flag/reject with fixed action bar
- 🔄 **Migration Tools** - Scripts to moderate existing testimonials

### Widget Features

- 🎨 **6 Layout Types**: Carousel, Grid, Masonry, Wall, List, Marquee
- 🎭 **Theme Customization**: Colors, fonts, border radius via data attributes
- 🔧 **Configurable Settings**: Ratings, dates, author info, autoplay
- 📦 **Lightweight**: Preact-based widget (~42 KB gzipped), CDN-ready
- ⚡ **Auto-initialization**: Detects and initializes from script tags
- 🎯 **Performance**: Optimized IIFE bundle for fast loading
- ✅ **Verified Badges**: Display OAuth verification status in all layouts
- ♿ **Accessibility**: WCAG 2.1 AA compliant (keyboard nav, focus states, screen readers)
- 🛡️ **CSP Compliance**: Runtime validator + CI audit script for strict security policies
- 🧪 **Dashboard Live Preview**: Real-time preview panel with layout switching + loading states

### Authentication & Security

- 🔐 **Clerk Authentication** - Secure user management and OAuth
- 🛡️ **CORS Protection** - Configured for secure cross-origin requests
- 🔒 **JWT Tokens** - Bearer token authentication for API
- 🔑 **OAuth Providers** - Google (testimonial verification), GitHub (platform login)
- 🚫 **Rate Limiting** - Redis-backed multi-tier protection (API, email, admin, public, per-key)

### Coming Soon (In Development)

- 📊 **Analytics Dashboard** - Detailed source tracking and performance metrics
- 🎬 **Rich Media** - Video and audio testimonial support (routes implemented)
- 🌐 **Multi-Language** - Internationalization support
- 🔗 **Webhooks** - Integration with external services
- 🧠 **Smart AI Selection** - Intelligent testimonial optimization

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: [Clerk](https://clerk.com/)
- **State Management**: TanStack Query v5 + Zustand
- **Forms**: react-hook-form + Zod validation
- **OAuth**: @react-oauth/google

### Backend

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Clerk Express SDK
- **File Storage**: Azure Blob Storage
- **OAuth Verification**: google-auth-library

### Widget

- **Framework**: Preact (lightweight React alternative)
- **Build**: Vite (IIFE format)
- **Distribution**: CDN-ready standalone library
- **Dependencies**: clsx, DOMPurify

### Infrastructure

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Database Migrations**: Prisma Migrate

---

## 🏗️ Architecture

```
tresta/
├── apps/
│   ├── web/                 # Next.js 15 frontend (App Router)
│   │   ├── app/             # Routes and layouts
│   │   │   ├── (auth)/      # Auth routes (sign-in, sign-up)
│   │   │   ├── (dashboard)/ # Protected dashboard routes
│   │   │   └── (public)/    # Public testimonial submission
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities, queries, schemas
│   │   └── hooks/           # Custom React hooks
│   │
│   └── api/                 # Express API server
│       ├── src/
│       │   ├── controllers/ # Route handlers
│       │   ├── middleware/  # Authentication, CORS, error handling
│       │   ├── routes/      # API route definitions
│       │   ├── services/    # Business logic (Azure, OAuth)
│       │   ├── validators/  # Request validation
│       │   └── webhooks/    # Clerk user sync
│       └── types/           # TypeScript definitions
│
├── packages/
│   ├── database/            # Prisma schema and client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── generated/   # Prisma Client (custom output)
│   │
│   ├── widget/              # Embeddable widget library
│   │   ├── src/
│   │   │   ├── widget.ts    # Main entry point
│   │   │   ├── carousel.ts  # Carousel layout
│   │   │   ├── renderer.ts  # DOM rendering
│   │   │   └── styles.ts    # CSS-in-JS styles
│   │   └── vite.config.ts
│   │
│   ├── ui/                  # shadcn/ui components
│   │   └── src/components/
│   │
│   ├── types/               # Shared TypeScript types
│   ├── eslint-config/       # Shared ESLint configs
│   └── typescript-config/   # Shared tsconfig.json
│
└── turbo.json              # Turborepo pipeline config
```

### Data Flow

1. **Testimonial Submission**: Public form → Express API → PostgreSQL → Azure Blob (avatars)
2. **OAuth Verification**: Google Sign-In → Token verification → Database update
3. **Widget Rendering**: Script tag → Fetch public API → Render testimonials → Display verified badges
4. **Admin Management**: Next.js dashboard → TanStack Query → Express API → Database

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **pnpm**: 8.x or higher
- **PostgreSQL**: 14.x or higher
- **Azure Blob Storage**: Account with connection string
- **Clerk**: Account with publishable key and secret key
- **Google OAuth**: Client ID and secret (for verification)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/anubhabx/tresta.git
   cd tresta
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   **API (apps/api/.env)**

   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/tresta"

   # Clerk
   CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   CLERK_WEBHOOK_SIGNING_SECRET="whsec_..."

   # Azure Blob Storage
   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
   AZURE_STORAGE_CONTAINER_NAME="tresta-uploads"

   # Google OAuth
   GOOGLE_OAUTH_CLIENT_ID="your_client_id.apps.googleusercontent.com"
   GOOGLE_OAUTH_CLIENT_SECRET="your_client_secret"

   PORT=8000
   ```

   **Web (apps/web/.env.local)**

   ```bash
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."

   # API
   NEXT_PUBLIC_API_URL="http://localhost:8000"

   # Google OAuth
   NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID="your_client_id.apps.googleusercontent.com"
   ```

4. **Set up database**

   ```bash
   # Generate Prisma Client
   pnpm generate

   # Run migrations
   cd packages/database
   pnpm prisma migrate dev
   ```

5. **Start development servers**

   ```bash
   # Start all apps in parallel
   pnpm dev

   # Or start individually
   pnpm dev --filter web   # Next.js (http://localhost:3000)
   pnpm dev --filter api   # Express API + workers (http://localhost:8000)
   ```

---

## 💻 Development

### Common Commands

```bash
# Development
pnpm dev                    # Run all apps
pnpm dev --filter web       # Run Next.js only
pnpm dev --filter api       # Run API + workers

# Database
pnpm generate               # Generate Prisma Client
cd packages/database && pnpm prisma migrate dev   # Create migration
cd packages/database && pnpm prisma studio        # Open Prisma Studio

# Widget
cd packages/widget && pnpm build    # Build widget library
cd packages/widget && pnpm demo     # Preview widget demos

# Building
pnpm build                  # Build all packages (respects dependency graph)
pnpm lint                   # Lint all packages
pnpm validate:release       # Lint, typecheck, test, and build in one pass
```

### Project-Specific Conventions

- **Import Paths**: Use workspace aliases (`@workspace/ui`, `@workspace/database`, etc.)
- **File Extensions**: Use `.ts` extension for TypeScript files (including imports)
- **Type Safety**: All API responses use standardized `ResponseHandler` class
- **Error Handling**: Custom error classes extending `ApiError` base
- **Query Keys**: Array format with entity type first (`["projects", "list", page]`)

### Adding UI Components

```bash
# Add shadcn/ui component to the workspace
pnpm dlx shadcn@latest add button -c apps/web
```

This places components in `packages/ui/src/components` and makes them available via:

```tsx
import { Button } from "@workspace/ui/components/button";
```

---

## 📦 Deployment

### Build for Production

```bash
# Build all packages
pnpm build

# Individual builds
pnpm build --filter web
pnpm build --filter api
pnpm build --filter widget
```

### Environment Setup

- **Frontend**: Deploy Next.js to Vercel/Netlify
- **Backend**: Deploy Express API to Railway/Render/Fly.io
- **Database**: PostgreSQL on Railway/Supabase/Neon
- **Storage**: Azure Blob Storage (production tier)
- **CDN**: Serve widget from CDN (Cloudflare/Fastly)

### Database Migrations

```bash
# Production migrations
cd packages/database
pnpm prisma migrate deploy
```

---

## 📚 Documentation

Comprehensive documentation is available in the repository:

### Project Documentation

- **[MVP Launch Checklist](MVP_LAUNCH_CHECKLIST.md)** - Launch blockers, validation scope, and post-launch follow-ups
- **[Widget Package Guide](packages/widget/README.md)** - Widget package overview, development, and build details
- **[Admin App Notes](apps/admin/README.md)** - Admin app setup and local development notes

### Technical Documentation

- **[Project Form UX](apps/web/docs/PROJECT_FORM_UX.md)** - Project form behavior and UX decisions
- **[Widget Preview Notes](apps/web/components/widgets/WIDGET_PREVIEW_README.md)** - Dashboard widget preview implementation notes
- **[Widget Security Notes](packages/widget/src/security/README.md)** - CSP and sanitization guidance for embeds
- **[Widget Telemetry Notes](packages/widget/src/telemetry/README.md)** - Widget telemetry design notes
- **[Widget Components Notes](packages/widget/src/components/README.md)** - Widget component-level implementation notes
- **[Shared ESLint Config](packages/eslint-config/README.md)** - Monorepo lint conventions
- **[Shared TypeScript Config](packages/typescript-config/README.md)** - Base TypeScript configuration guidance

### Quick Links

- 🚀 **[Getting Started](#getting-started)** - Setup and development
- ✅ **[Launch Checklist](MVP_LAUNCH_CHECKLIST.md)** - Current launch readiness status
- 🎨 **[Widget Layouts](packages/widget/README.md)** - Widget customization
- 🔐 **[Authentication](apps/api/src/middleware/auth.middleware.ts)** - Auth implementation
- 📊 **[Database Schema](packages/database/prisma/schema.prisma)** - Data models

---

## 🤝 Contributing

Tresta is maintained as a closed-source project. Code changes are limited to authorized collaborators with repository access.

If you need to propose a change, bug fix, or feature request, please contact the maintainers directly to coordinate the appropriate internal workflow.

### Development Workflow

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Update documentation for new features
- Test changes locally before submitting PR

### Quality Gates Before Push / Merge

- Local pre-push (optional):

   ```bash
   pnpm hooks:install
   ```

   This enables `.githooks/pre-push`, which runs:

   ```bash
   pnpm quality:check
   ```

- Before merge to `main`: require GitHub Actions checks from `.github/workflows/ci-quality-checks.yml` in branch protection settings.
   - Require `quality-gate`
   - Require both `Vercel Build Check (web)` and `Vercel Build Check (admin)`

---

## 📄 License

This repository is proprietary and not licensed for public use, redistribution, or modification. See the [LICENSE](LICENSE) file for the current terms.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Clerk](https://clerk.com/) - Authentication and user management
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Turborepo](https://turbo.build/) - High-performance build system

---

## 📧 Contact

**Anubhab Patnaik** - [@anubhabx](https://github.com/anubhabx)

Project Link: [https://github.com/anubhabx/tresta](https://github.com/anubhabx/tresta)

---

**Built with ❤️ using TypeScript and modern web technologies**
