export const LOCALE_MODE_STORAGE_KEY = "holo.locale.mode";
export const THEME_STORAGE_KEY = "holo.theme";
export const AUTH_TOKEN_KEY = "holo.auth.token";
export const AUTH_USER_KEY = "holo.auth.user";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const localStore = window.localStorage as Storage | undefined;
  return localStore?.getItem(AUTH_TOKEN_KEY) || null;
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  const localStore = window.localStorage as Storage | undefined;
  if (!localStore) return;
  
  if (token) {
    localStore.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStore.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthUser(): { username: string; role: string; userId?: string; twoFactorEnabled?: boolean } | null {
  if (typeof window === "undefined") {
    return null;
  }
  const localStore = window.localStorage as Storage | undefined;
  const userStr = localStore?.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setAuthUser(user: { username: string; role: string; userId?: string; twoFactorEnabled?: boolean } | null): void {
  if (typeof window === "undefined") {
    return;
  }
  const localStore = window.localStorage as Storage | undefined;
  if (!localStore) return;
  
  if (user) {
    localStore.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStore.removeItem(AUTH_USER_KEY);
  }
}

export function isLoggedIn(): boolean {
  return getAuthToken() !== null;
}

export function logout(): void {
  setAuthToken(null);
  setAuthUser(null);
}