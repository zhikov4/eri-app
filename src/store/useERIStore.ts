import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  displayName: string;
  tier: 'free' | 'pro' | 'studio';
}

interface ERIState {
  user: User | null;
  isFocusMode: boolean;
  setUser: (user: User | null) => void;
  setFocusMode: (isActive: boolean) => void;
}

export const useERIStore = create<ERIState>((set) => ({
  user: null,
  isFocusMode: false,
  setUser: (user) => set({ user }),
  setFocusMode: (isActive) => set({ isFocusMode: isActive }),
}));