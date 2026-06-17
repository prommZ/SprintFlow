# SprintFlow — Personal Scrum Dashboard

A full-stack personal productivity system combining Agile/Scrum methodology with daily task management, habit tracking, goal setting, sprint planning, and analytics.

## 🚀 Features

- **Dashboard** — Today's tasks, productivity score, quick actions
- **Task Management** — Full CRUD with search, filter, sort, archive, Eisenhower matrix
- **Scrum Board** — Drag-and-drop Kanban board (Backlog → To Do → In Progress → Review → Done)
- **Sprint Planning** — Create sprints, track velocity, burndown charts
- **Daily Standup** — Log daily scrum answers, view history
- **End-of-Day Review** — Reflect on the day, auto-calculated metrics
- **Habit Tracker** — Daily habits, streaks, completion heatmap
- **Goals** — Long-term goals with milestones and progress tracking
- **Notes Vault** — Personal knowledge management with categories and search
- **Analytics** — Productivity trends, focus hours, sprint velocity, workload analysis
- **Focus Mode** — Pomodoro timer with session tracking
- **Calendar** — Monthly view with task visualization
- **Auto Carry Forward** — Incomplete tasks automatically move to the next day
- **Smart Workload Analysis** — Warnings when days are overloaded

## 🛠 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React.js, Vite, Tailwind CSS v3, Recharts, dnd-kit |
| Backend   | Node.js, Express.js, JWT, bcrypt |
| Database  | MongoDB Atlas, Mongoose |
| Auth      | JWT Bearer tokens, bcryptjs hashing |

## 📁 Project Structure

```
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Layout + Shared components
│   │   ├── context/           # Auth context
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   ├── pages/             # Route pages (14 pages)
│   │   └── services/          # API service layer
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # DB connection
│   │   ├── controllers/       # Route handlers (10 controllers)
│   │   ├── middleware/        # Auth + Error handling
│   │   ├── models/            # Mongoose schemas (9 models)
│   │   ├── routes/            # API routes (10 route files)
│   │   └── validators/        # Input validation
│   └── server.js              # Express entry point
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone and Setup

```bash
cd TO-DO-LIST-ANTIGRAVITY
```

### 2. Configure Environment

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sprintflow
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=30d
```

### 3. Start Backend

```bash
cd server
npm install
npm run dev
```

### 4. Start Frontend

```bash
cd client
npm install
npm run dev
```

### 5. Open Browser

Visit [http://localhost:5173](http://localhost:5173)

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/auth/register | Register user |
| POST   | /api/auth/login | Login user |
| GET    | /api/auth/me | Get current user |
| GET    | /api/tasks | List tasks (filter, search, sort) |
| POST   | /api/tasks | Create task |
| PUT    | /api/tasks/:id | Update task |
| PATCH  | /api/tasks/reorder | Board reorder |
| GET    | /api/sprints | List sprints |
| POST   | /api/sprints/:id/complete | Complete sprint |
| GET    | /api/sprints/:id/metrics | Burndown data |
| POST   | /api/standups | Create standup |
| POST   | /api/reviews | Create review |
| POST   | /api/habits/:id/complete | Toggle habit |
| GET    | /api/analytics/dashboard | Dashboard metrics |
| GET    | /api/analytics/workload | Workload analysis |

## 🎨 Design

- Dark theme only (#0F1115 background)
- Minimalist, no bright colors
- Inter font family
- Smooth animations
- Responsive (mobile + desktop)

## License

MIT
