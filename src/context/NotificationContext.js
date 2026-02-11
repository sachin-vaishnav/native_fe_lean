import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

const getSocketUrl = () => {
  if (Platform.OS === 'web') return 'https://native-be-lean.onrender.com';
  const custom = Constants.expoConfig?.extra?.apiUrl;
  if (custom) return custom.replace(/\/api\/?$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:5001';
  return 'http://localhost:5001';
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch (_) {}
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    fetchUnreadCount();

    const s = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {});
    s.on('notification', () => {
      setUnreadCount((c) => c + 1);
    });
    s.on('connect_error', () => {});

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, token]);

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, hasUnread: unreadCount > 0 }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
