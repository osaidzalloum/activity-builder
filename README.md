# Activity Builder | منشئ الأنشطة

![CI](https://github.com/osaidzalloum/activity-builder/actions/workflows/ci.yml/badge.svg)

An Arabic-first (RTL) platform where teachers create interactive activities (multiple choice, ordering, and matching) and share them with students via a link. Students solve them with instant feedback, no account needed.

🔗 **Live demo:** https://activity-builder-chi.vercel.app/

![Demo](docs/demo.gif)

## Features

- Three question types: multiple choice, ordering (drag and drop), and matching (tap to pair)
- Teacher accounts with email authentication (Supabase Auth)
- Activities stored in PostgreSQL and shared through a unique link
- Row Level Security: anyone can view an activity, only its owner can edit or delete it
- Protected routes with redirect back to the requested page after login
- Autosave with debounce, plus an unsaved changes indicator and warning before leaving
- Drag-and-drop ordering with keyboard and button alternatives for accessibility
- Create, edit, and delete questions in a reusable modal form (closes on Escape or backdrop click)
- Dynamic form fields: add and remove ordering items and matching pairs on the fly
- Per-type validation with clear inline error messages, including duplicate detection
- Student mode: one question at a time, instant feedback, progress bar, and final score
- Shuffled ordering items, guaranteed never to start in the correct order
- Full RTL support for Arabic
- Import ready-made questions from Open Trivia DB through a serverless API route
- Student results: students enter a name, attempts are saved, and teachers see scores, averages, and per-question success rates
- Reorder questions in the editor with a drag handle (mouse, touch, or keyboard)

## Tech Stack

- React + TypeScript (Vite)
- React Router
- Supabase (PostgreSQL, Auth, Row Level Security)
- Zod (runtime validation)
- dnd-kit (drag and drop)
- Vitest + React Testing Library
- GitHub Actions (CI)
- CSS with custom properties
- Deployed on Vercel

## What I Learned

### Security & Data
- Securing data with Row Level Security instead of relying on hidden keys, including policies across related tables (anyone can submit an attempt, only the owner can read it)
- Detecting silent RLS failures: updates that succeed with zero affected rows, and inserts that fail when chained with `.select()`
- Validating database data at runtime with Zod, deriving TypeScript types from the same schemas
- Linking answers to stable question IDs instead of array positions, and migrating legacy data when a stored shape changes
- Keeping secret API keys off the client with a serverless proxy

### React Patterns
- Designing components around shared interfaces (`onAnswer`, `onFinish`) so new question types and features plug in without rewrites
- Handling async data with loading/error/not-found states, and avoiding race conditions in effects
- Debouncing autosave, with a ref-based revision counter so edits made during a save are never lost
- Resetting state with the `key` prop, colocating state, and extracting custom hooks
- Code splitting with `React.lazy` and `Suspense`

### TypeScript
- Modeling question types as a discriminated union with exhaustive `never` checks, so the compiler lists every place to update when a type is added
- Migrating a JavaScript codebase to TypeScript incrementally without breaking the app

### Testing & CI
- Extracting logic into pure functions to make it testable
- Testing components by role and accessible name, and mocking randomness with `vi.mock` only where needed
- Writing regression tests that lock in fixed bugs
- Running type checks, tests, and builds on every push with GitHub Actions

## Project Structure

```
.github/
└── workflows/
    └── ci.yml               # Type check, tests, and build on every push
api/
└── trivia.ts                # Serverless function proxying the trivia API
supabase/
└── schema.sql               # Tables (activities, attempts) and RLS policies
src/
├── types.ts                 # Shared types: questions, activities, play props
├── schemas.ts               # Zod schemas (source of truth for question types)
├── vite-env.d.ts            # Types for environment variables
├── pages/
│   ├── DashboardPage.tsx    # Teacher's list of activities
│   ├── EditorPage.tsx       # Loads, edits, and saves one activity
│   ├── BuilderPage.tsx      # Question management UI (used by the editor)
│   ├── ActivityPage.tsx     # Loads an activity from a shareable link
│   ├── PlayPage.tsx         # Student play flow (used by the activity page)
│   ├── ResultsPage.tsx      # Attempts and per-question stats for the teacher
│   └── LoginPage.tsx
├── components/
│   ├── form/                # Form fields for each question type
│   ├── play/                # Play components for each question type
│   ├── Modal.tsx
│   ├── RequireAuth.tsx      # Redirects to login for protected routes
│   ├── QuestionForm.tsx
│   ├── QuestionItem.tsx
│   └── QuestionList.tsx
├── context/
│   ├── AuthContext.ts       # The context object
│   ├── AuthProvider.tsx     # Session state and auth actions
│   └── useAuth.ts           # Hook to read auth state anywhere 
├── hooks/
│   └── useSortSensors.ts    # Shared drag-and-drop sensors
├── test/
│   └── setup.ts             # Test setup (jest-dom matchers, cleanup)
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── trivia.ts            # Fetches and maps trivia questions
└── utils/
    ├── shuffle.ts
    └── validateQuestion.ts  # Pure validation logic, unit tested    
```

## Run Locally

1. Create a free project on [Supabase](https://supabase.com) and run the SQL in `supabase/schema.sql` in the SQL Editor.
2. Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

3. Install and run:

```bash
npm install
npm run dev
```

To run the API routes locally (used by question import), use the Vercel CLI instead:

```bash
npm install -g vercel
vercel dev
```

Run the tests:

```bash
npm test
```

## Roadmap

- [x] Multiple choice questions
- [x] Ordering questions with drag and drop
- [x] Matching questions
- [x] User accounts and shareable activity links (Supabase)
- [x] TypeScript migration
- [x] Autosave in the editor
- [x] Runtime validation of database data (Zod)
- [x] Student results and per-question statistics for teachers
- [x] Store question IDs with each answer so stats stay accurate after a teacher edits questions
- [x] Reorder questions with drag and drop in the editor
- [x] Tests for ordering and matching questions