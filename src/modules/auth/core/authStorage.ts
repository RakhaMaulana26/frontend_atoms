const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'user';

const safeGet = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
};

const safeRemove = (storage: Storage, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const migrateLegacyAuthStorage = (): void => {
  const sessionToken = safeGet(sessionStorage, AUTH_TOKEN_KEY);
  const sessionUser = safeGet(sessionStorage, AUTH_USER_KEY);

  if (sessionToken && sessionUser) {
    safeSet(localStorage, AUTH_TOKEN_KEY, sessionToken);
    safeSet(localStorage, AUTH_USER_KEY, sessionUser);
    safeRemove(sessionStorage, AUTH_TOKEN_KEY);
    safeRemove(sessionStorage, AUTH_USER_KEY);
    return;
  }
};

export const getStoredToken = (): string | null => {
  return safeGet(localStorage, AUTH_TOKEN_KEY);
};

export const getStoredUser = (): string | null => {
  return safeGet(localStorage, AUTH_USER_KEY);
};

export const setStoredAuth = (token: string, user: string): void => {
  safeSet(localStorage, AUTH_TOKEN_KEY, token);
  safeSet(localStorage, AUTH_USER_KEY, user);
  safeRemove(sessionStorage, AUTH_TOKEN_KEY);
  safeRemove(sessionStorage, AUTH_USER_KEY);
};

export const clearStoredAuth = (): void => {
  safeRemove(localStorage, AUTH_TOKEN_KEY);
  safeRemove(localStorage, AUTH_USER_KEY);
  safeRemove(sessionStorage, AUTH_TOKEN_KEY);
  safeRemove(sessionStorage, AUTH_USER_KEY);
};

export const hasStoredToken = (): boolean => Boolean(getStoredToken());
