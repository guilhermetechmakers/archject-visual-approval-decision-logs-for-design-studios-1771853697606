# Archject - Visual Approval & Decision Logs for Design Studios

A lightweight, visual approval system for architecture firms, interior designers, and design studios. Replace scattered emails, chats, PDFs, and calls with a single structured approval layer—every client decision is presented visually, time-stamped, and stored as an auditable Decision Log.

## Features

- **Decision Cards** – Present options visually with side-by-side comparisons
- **No-Login Client Links** – Tokenized share links for frictionless client approvals
- **Exportable Logs** – Generate PDF/CSV Decision Logs with firm branding
- **Templates** – Opinionated templates for materials, layouts, and change requests
- **Project Workspaces** – Centralized management of decisions and assets

## Tech Stack

- React 18 + TypeScript
- Vite + SWC
- React Router 6
- TanStack React Query
- Tailwind CSS v3
- React Hook Form + Zod
- Sonner (toasts)
- Lucide React (icons)

## Getting Started

```bash
npm install
npm run build
```

## Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run preview` – Preview production build
- `npm run lint` – Run ESLint

## Project Structure

```
src/
├── components/     # UI components and layouts
├── lib/           # API utilities, utils
├── pages/         # Route pages
├── types/         # TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

## Routes

- `/` – Landing page
- `/login`, `/signup` – Authentication
- `/dashboard` – Dashboard (overview, projects, decisions, templates, exports, notifications, settings)
- `/dashboard/projects/:projectId` – Project workspace
- `/dashboard/projects/:projectId/decisions/:decisionId` – Decision detail
- `/client/:token` – Client portal (no-login approval)
