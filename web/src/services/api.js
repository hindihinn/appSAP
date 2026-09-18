import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const apiBase = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : '';
  return `${apiBase}${url}`;
};

export default api;
