import * as SecureStore from 'expo-secure-store';

const getBaseUrl = () => {
  // Read from environment variable, fallback to local server for development
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) { }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) { }
  }
};

/**
 * Secure Storage for sensitive items (like API keys) using Expo SecureStore on mobile.
 */
export const secureApiKeyStore = {
  getApiKey: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync('geminiApiKey');
    } catch (e) {
      console.error('Error fetching secure store key:', e);
      return null;
    }
  },
  setApiKey: async (value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync('geminiApiKey', value);
    } catch (e) {
      console.error('Error saving secure store key:', e);
    }
  },
  removeApiKey: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync('geminiApiKey');
    } catch (e) {
      console.error('Error deleting secure store key:', e);
    }
  }
};

/**
 * Standard fetch helper that appends JWT Authorization headers if they exist.
 */
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await storage.getItem('accessToken');
  const geminiApiKey = await secureApiKeyStore.getApiKey();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(geminiApiKey && { 'x-gemini-api-key': geminiApiKey }),
    ...(options.headers || {}),
  } as Record<string, string>;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Request failed with status ${response.status}`);
  }

  return data;
};
