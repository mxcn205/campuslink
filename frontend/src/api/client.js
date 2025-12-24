import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Projects
export const getProjects = (params) => api.get('/projects', { params });
export const getMyProjects = () => api.get('/projects/my');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const applyToProject = (id, data) => api.post(`/projects/${id}/apply`, data);
export const getMyApplications = () => api.get('/projects/applications/my');
export const updateApplication = (id, data) => api.put(`/projects/applications/${id}`, data);

// Submissions
export const submitWork = (projectId, data) => api.post(`/submissions/projects/${projectId}/submit`, data);
export const getMySubmissions = () => api.get('/submissions/my');
export const getSubmission = (id) => api.get(`/submissions/${id}`);
export const getProjectSubmissions = (projectId) => api.get(`/submissions/projects/${projectId}/list`);
export const reviewSubmission = (id, data) => api.post(`/submissions/${id}/review`, data);

export default api;
