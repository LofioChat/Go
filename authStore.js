import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../utils/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/login", credentials);
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
          return { success: true, requiresOtp: data.requiresOtp };
        } catch (err) {
          const msg = err.response?.data?.message || "Login failed";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/register", userData);
          set({ isLoading: false });
          return { success: true, userId: data.userId };
        } catch (err) {
          const msg = err.response?.data?.message || "Registration failed";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      verifyOtp: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/verify-otp", payload);
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || "OTP verification failed";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      resendOtp: async (payload) => {
        try {
          await api.post("/auth/resend-otp", payload);
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message };
        }
      },

      forgotPassword: async (identifier) => {
        try {
          await api.post("/auth/forgot-password", { identifier });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message };
        }
      },

      resetPassword: async (payload) => {
        try {
          await api.post("/auth/reset-password", payload);
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message };
        }
      },

      updateProfile: async (updates) => {
        try {
          const { data } = await api.patch("/users/me", updates);
          set({ user: data.user });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message };
        }
      },

      logout: () => {
        delete api.defaults.headers.common["Authorization"];
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data.user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "nexachat-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
