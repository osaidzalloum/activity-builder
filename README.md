# Activity Builder | منشئ الأنشطة

An Arabic-first (RTL) platform where teachers create interactive activities (multiple choice, ordering, and matching) and share them with students via a link. Students solve them with instant feedback, no account needed.

🔗 **Live demo:** https://activity-builder-chi.vercel.app/

![Demo](docs/demo.gif)

## Features

- Three question types: multiple choice, ordering (drag and drop), and matching (tap to pair)
- Teacher accounts with email authentication (Supabase Auth)
- Activities stored in PostgreSQL and shared through a unique link
- Row Level Security: anyone can view an activity, only its owner can edit or delete it
- Protected routes with redirect back to the requested page after login
- Unsaved changes indicator and warning before leaving the editor
- Drag-and-drop ordering with keyboard and button alternatives for accessibility
- Create, edit, and delete questions in a reusable modal form (closes on Escape or backdrop click)
- Dynamic form fields: add and remove ordering items and matching pairs on the fly
- Per-type validation with clear inline error messages, including duplicate detection
- Student mode: one question at a time, instant feedback, progress bar, and final score
- Shuffled ordering items, guaranteed never to start in the correct order
- Full RTL support for Arabic

## Tech Stack

- React (Vite)
- React Router
- Supabase (PostgreSQL, Auth, Row Level Security)
- dnd-kit (drag and drop)
- CSS with custom properties
- Deployed on Vercel

## What I Learned

- Securing data with Row Level Security instead of relying on hidden keys
- Detecting silent update failures caused by RLS (checking affected rows)
- Sharing auth state across the app with React Context and a custom hook
- Handling async data fetching with loading, error, and not-found states, and avoiding race conditions
- Designing components around a shared interface (`onAnswer`) so new question types plug in without changing the play page
- Mapping question types to components with a lookup object instead of growing conditionals
- Lifting state up to share data between routes, and keeping state colocated where it is used
- Resetting component state using the `key` prop instead of syncing with `useEffect`
- Handling stale state (e.g. deleting a question while it is being edited)
- Refactoring code structure without changing behavior
- Building accessible drag and drop with keyboard and button alternatives
- Cleaning up event listeners and subscriptions in `useEffect`

## Project Structure

```
src/
├── pages/
│   ├── DashboardPage.jsx    # Teacher's list of activities
│   ├── EditorPage.jsx       # Loads, edits, and saves one activity
│   ├── BuilderPage.jsx      # Question management UI (used by the editor)
│   ├── ActivityPage.jsx     # Loads an activity from a shareable link
│   ├── PlayPage.jsx         # Student play flow (used by the activity page)
│   └── LoginPage.jsx
├── components/
│   ├── form/                # Form fields for each question type
│   ├── play/                # Play components for each question type
│   ├── Modal.jsx
│   ├── RequireAuth.jsx      # Redirects to login for protected routes
│   ├── QuestionForm.jsx
│   ├── QuestionItem.jsx
│   └── QuestionList.jsx
├── context/
│   └── AuthContext.jsx      # Auth state and useAuth hook
├── lib/
│   └── supabase.js          # Supabase client
└── utils/
    └── shuffle.js
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

## Roadmap

- [x] Multiple choice questions
- [x] Ordering questions with drag and drop
- [x] Matching questions
- [x] User accounts and shareable activity links (Supabase)
- [ ] Autosave in the editor
- [ ] TypeScript migration