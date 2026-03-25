import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  
  timeout: 10000,
});


axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const isNetworkError = !error.response;

    if (isNetworkError) {
      console.warn(`Network error on ${url} — keeping auth state intact`);
      return Promise.reject(error);
    }

    if (status === 401) {
      const isAuthEndpoint = url?.includes('/auth/login') || url?.includes('/auth/register');
      if (!isAuthEndpoint && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;