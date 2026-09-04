import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.felag.app';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[API Error ${error.response.status}] ${error.config?.url}:`, error.response.data);
    } else if (error.request) {
      console.error(`[API Network Error] No response received from ${error.config?.baseURL}${error.config?.url}:`, error.message);
    } else {
      console.error('[API Error]', error.message);
    }
    return Promise.reject(error);
  }
);
