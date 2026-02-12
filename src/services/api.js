import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Web: Render API. Native: use extra.apiUrl from app.json
const getBaseUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5001/api';
  const custom = Constants.expoConfig?.extra?.apiUrl;
  if (custom) return custom;
  // Android emulator: 10.0.2.2 = host machine
  if (Platform.OS === 'android') return 'http://10.0.2.2:5001/api';
  // iOS simulator: localhost. For physical device, set extra.apiUrl in app.json
  return 'http://localhost:5001/api';
};
const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Config
export const configAPI = {
  getConfig: () => api.get('/config'),
};

// Auth APIs - email OTP
export const authAPI = {
  sendOTP: (email) => api.post('/auth/send-otp', { email }, { timeout: 35000 }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  findEmail: (mobile) => api.post('/auth/find-email', { mobile }),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data, { timeout: 60000 }),
  uploadImage: (imageBase64, folder) => api.post('/user/upload-image', { image: imageBase64, folder }, { timeout: 30000 }),
  getDashboard: () => api.get('/user/dashboard'),
  savePushToken: (token) => api.post('/user/push-token', { token }),
};

// Loan APIs
export const loanAPI = {
  apply: (data) => api.post('/loan/apply', data),
  getMyLoans: () => api.get('/loan/my-loans'),
  getLoanDetails: (id) => api.get(`/loan/${id}`),
};

// EMI APIs
export const emiAPI = {
  getPending: () => api.get('/emi/pending'),
  getToday: () => api.get('/emi/today'),
  getLoanEMIs: (loanId) => api.get(`/emi/loan/${loanId}`),
  getEMI: (id) => api.get(`/emi/${id}`),
};

// Payment APIs
export const paymentAPI = {
  createOrder: (emiId) => api.post('/payment/create-order', { emiId }),
  verifyPayment: (data) => api.post('/payment/verify', data),
  payMultiple: (emiIds) => api.post('/payment/pay-multiple', { emiIds }),
  simulatePayment: (emiId) => api.post('/payment/simulate', { emiId }),
};

// Notification APIs
export const notificationAPI = {
  getMy: (filter) => api.get('/notifications', { params: { filter } }),
  getAdmin: (filter) => api.get('/notifications/admin', { params: { filter } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getAdmins: () => api.get('/admin/admins'),
  createUser: (data) => api.post('/admin/users', data),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  getPendingLoans: () => api.get('/admin/loans/pending'),
  approveLoan: (id, data) => api.put(`/admin/loans/${id}/approve`, data || {}),
  rejectLoan: (id, reason) => api.put(`/admin/loans/${id}/reject`, { reason }),
  deleteLoan: (id) => api.delete(`/admin/loans/${id}`),
  processOverdues: () => api.post('/admin/process-overdues'),
  getTodayEMIs: () => api.get('/admin/emis/today'),
  getTotalEMIs: () => api.get('/admin/emis/total'),
  markEMIPaid: (emiId) => api.put(`/admin/emis/${emiId}/mark-paid`),
};

export default api;
