'use client';

import { create } from 'zustand';
import { authAPI } from '@/lib/api';


const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,   
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { user } = response.data.data;
     
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: errorMessage, isAuthenticated: false });
      return { success: false, error: errorMessage };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      const { user } = response.data.data;
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();  
    } catch {
      
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  fetchUser: async () => {
    
    set({ isLoading: true });
    try {
      const response = await authAPI.getCurrentUser();
      const user = response.data.data.user;
      set({ user, isAuthenticated: true, isLoading: false });

    } catch (error) {
      const isNetworkError = !error.response;
      const status = error.response?.status;

      if (isNetworkError || (status && status >= 500)) {
       
        console.warn('fetchUser: server unreachable, keeping auth state. Status:', status ?? 'network error');
        set({ isLoading: false });
      } else if (status === 401) {
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  updateUser: (userData) => {
    set((state) => ({ user: { ...state.user, ...userData } }));
  },

  clearError: () => set({ error: null }),

  initialize: async () => {
   
    await get().fetchUser();
  },
}));

export default useAuthStore;