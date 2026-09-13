export function readBrowserStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Authentication remains available in memory when storage is blocked.
  }
}

export function removeBrowserStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // There is no persisted value to remove when storage is blocked.
  }
}
