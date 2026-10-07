# Activity Builder | منشئ الأنشطة

An Arabic-first (RTL) web app for teachers to build interactive activities (multiple choice and ordering) and for students to solve them with instant feedback.

🔗 **Live demo:** https://activity-builder-chi.vercel.app/

![Demo](docs/demo.gif)

## Features

- Two question types: multiple choice and ordering
- Drag-and-drop ordering with keyboard and button alternatives for accessibility
- Create, edit, and delete questions in a reusable modal form (closes on Escape or backdrop click)
- Dynamic form fields: add and remove ordering items on the fly
- Input validation with inline error messages
- Questions persist across sessions using localStorage, with safe parsing and data migration
- Student mode: one question at a time, instant feedback, progress bar, and final score
- Shuffled ordering items, guaranteed never to start in the correct order
- Full RTL support for Arabic
- Client-side routing with active link highlighting

## Tech Stack

- React (Vite)
- React Router
- dnd-kit (drag and drop)
- CSS with custom properties
- Deployed on Vercel

## What I Learned

- Designing components around a shared interface (`onAnswer`) so new question types plug in without changing the play page
- Lifting state up to share data between routes
- Resetting component state using the `key` prop instead of syncing with `useEffect`
- Handling stale state (e.g. deleting a question while it is being edited)
- Validating and migrating data from external sources like localStorage before using it
- Refactoring code structure without changing behavior
- Building accessible drag and drop with keyboard and button alternatives
- Cleaning up event listeners in `useEffect`

## Run Locally

```bash
npm install
npm run dev
```

## Roadmap

- [x] Multiple choice questions
- [x] Ordering questions with drag and drop
- [ ] Matching questions
- [ ] User accounts and shareable activity links (Supabase)
- [ ] TypeScript migration