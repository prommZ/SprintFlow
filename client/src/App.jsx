import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/shared/Toast';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Tasks from '@/pages/Tasks';
import Board from '@/pages/Board';
import Sprints from '@/pages/Sprints';
import CalendarPage from '@/pages/Calendar';
import Standup from '@/pages/Standup';
import Review from '@/pages/Review';
import Habits from '@/pages/Habits';
import Goals from '@/pages/Goals';
import Notes from '@/pages/Notes';
import Analytics from '@/pages/Analytics';
import Profile from '@/pages/Profile';
import ArchivePage from '@/pages/Archive';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/board" element={<Board />} />
              <Route path="/sprints" element={<Sprints />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/standup" element={<Standup />} />
              <Route path="/review" element={<Review />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
