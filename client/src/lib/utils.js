import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 'High': return 'text-danger bg-danger-muted';
    case 'Medium': return 'text-warning bg-warning-muted';
    case 'Low': return 'text-success bg-success-muted';
    default: return 'text-muted-foreground bg-surface-3';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'done': return 'text-success bg-success-muted';
    case 'inprogress': return 'text-accent bg-accent-muted';
    case 'review': return 'text-warning bg-warning-muted';
    case 'todo': return 'text-foreground bg-surface-3';
    case 'backlog': return 'text-muted-foreground bg-surface-3';
    default: return 'text-muted-foreground bg-surface-3';
  }
}

export const STATUSES = ['backlog', 'todo', 'inprogress', 'review', 'done'];

export function formatStatusLabel(status) {
  switch (status) {
    case 'backlog': return 'Backlog';
    case 'todo': return 'To Do';
    case 'inprogress': return 'In Progress';
    case 'review': return 'Review';
    case 'done': return 'Done';
    default: return status;
  }
}
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const EISENHOWER = [
  { key: 'urgent-important', label: 'Urgent & Important', color: 'text-danger' },
  { key: 'important', label: 'Important', color: 'text-warning' },
  { key: 'urgent', label: 'Urgent', color: 'text-accent' },
  { key: 'later', label: 'Later', color: 'text-muted-foreground' },
];
