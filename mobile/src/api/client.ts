import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

let userToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  userToken = token;
};

apiClient.interceptors.request.use(
  (config) => {
    if (userToken && config.headers) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
