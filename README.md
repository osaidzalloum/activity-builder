# Activity Builder | منشئ الأنشطة

An Arabic-first (RTL) web app for teachers to build interactive activities (multiple choice, ordering, and matching) and for students to solve them with instant feedback.

🔗 **Live demo:** https://activity-builder-chi.vercel.app/

![Demo](docs/demo.gif)

## Features

- Three question types: multiple choice, ordering (drag and drop), and matching (tap to pair)
- Drag-and-drop ordering with keyboard and button alternatives for accessibility
- Create, edit, and delete questions in a reusable modal form (closes on Escape or backdrop click)
- Dynamic form fields: add and remove ordering items and matching pairs on the fly
- Per-type validation with clear inline error messages, including duplicate detection
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
- Mapping question types to components with a lookup object instead of growing conditionals
- Lifting state up to share data between routes, and keeping state colocated where it is used
- Resetting component state using the `key` prop instead of syncing with `useEffect`
- Handling stale state (e.g. deleting a question while it is being edited)
- Validating and migrating data from external sources like localStorage before using it
- Refactoring code structure without changing behavior
- Building accessible drag and drop with keyboard and button alternatives
- Cleaning up event listeners in `useEffect`

## Project Structure
src/
├── pages/ # BuilderPage (teacher) and PlayPage (student)
├── components/
│ ├── form/ # Form fields for each question type
│ ├── play/ # Play components for each question type
│ ├── Modal.jsx
│ ├── QuestionForm.jsx
│ ├── QuestionItem.jsx
│ └── QuestionList.jsx
└── utils/ # Shared helpers (shuffle)

## Run Locally

```bash
npm install
npm run dev
```

## Roadmap

- [x] Multiple choice questions
- [x] Ordering questions with drag and drop
- [x] Matching questions
- [ ] User accounts and shareable activity links (Supabase)
- [ ] TypeScript migration