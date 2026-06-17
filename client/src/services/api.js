import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sprintflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sprintflow_token');
      localStorage.removeItem('sprintflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { message: 'Network error' });
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getToday: (params) => api.get('/tasks/today', { params }),
  getArchived: (params) => api.get('/tasks/archived', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  archive: (id) => api.post(`/tasks/${id}/archive`),
  restore: (id) => api.post(`/tasks/${id}/restore`),
  reorder: (tasks) => api.patch('/tasks/reorder', { tasks }),
  carryForward: () => api.post('/tasks/carry-forward'),
};

// Sprints API
export const sprintsAPI = {
  getAll: (params) => api.get('/sprints', { params }),
  getActive: () => api.get('/sprints/active'),
  get: (id) => api.get(`/sprints/${id}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  delete: (id) => api.delete(`/sprints/${id}`),
  complete: (id, data) => api.post(`/sprints/${id}/complete`, data),
  getMetrics: (id) => api.get(`/sprints/${id}/metrics`),
};

// Standups API
export const standupsAPI = {
  getAll: (params) => api.get('/standups', { params }),
  getToday: () => api.get('/standups/today'),
  create: (data) => api.post('/standups', data),
  delete: (id) => api.delete(`/standups/${id}`),
};

// Reviews API
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getToday: () => api.get('/reviews/today'),
  create: (data) => api.post('/reviews', data),
};

// Habits API
export const habitsAPI = {
  getAll: (params) => api.get('/habits', { params }),
  getStats: (params) => api.get('/habits/stats', { params }),
  create: (data) => api.post('/habits', data),
  update: (id, data) => api.put(`/habits/${id}`, data),
  delete: (id) => api.delete(`/habits/${id}`),
  complete: (id, data) => api.post(`/habits/${id}/complete`, data),
};

// Goals API
export const goalsAPI = {
  getAll: (params) => api.get('/goals', { params }),
  get: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  updateMilestones: (id, milestones) => api.patch(`/goals/${id}/milestones`, { milestones }),
  linkTask: (id, taskId) => api.post(`/goals/${id}/link-task`, { taskId }),
  unlinkTask: (id, taskId) => api.delete(`/goals/${id}/link-task/${taskId}`),
};

// Notes API
export const notesAPI = {
  getAll: (params) => api.get('/notes', { params }),
  get: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  togglePin: (id) => api.patch(`/notes/${id}/pin`),
};

// Focus API
export const focusAPI = {
  start: (data) => api.post('/focus/start', data),
  end: (data) => api.post('/focus/end', data),
  getActive: () => api.get('/focus/active'),
  getSessions: (params) => api.get('/focus/sessions', { params }),
  getStats: (params) => api.get('/focus/stats', { params }),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getProductivity: (params) => api.get('/analytics/productivity', { params }),
  getWorkload: (params) => api.get('/analytics/workload', { params }),
  getSprintPerformance: (params) => api.get('/analytics/sprint-performance', { params }),
};

export default api;
