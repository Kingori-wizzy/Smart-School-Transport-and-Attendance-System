// File: C:\Developer\SmartSchoolTransportandAttendanceSystem\frontend\src\utils\authEvents.js

/**
 * Dispatch an authentication event for socket reconnection
 * @param {string} type - The type of auth event ('login', 'logout', 'register', 'token-refresh')
 */
export const dispatchAuthEvent = (type) => {
  window.dispatchEvent(new CustomEvent('auth-change', { detail: type }));
};

/**
 * Add an auth event listener
 * @param {Function} callback - Function to call when auth event occurs
 * @returns {Function} - Cleanup function to remove listener
 */
export const onAuthChange = (callback) => {
  const handler = (event) => callback(event.detail);
  window.addEventListener('auth-change', handler);
  return () => window.removeEventListener('auth-change', handler);
};