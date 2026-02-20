export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins} min ${secs > 0 ? `${secs} sec` : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours} hr ${mins > 0 ? `${mins} min` : ''}`;
};

export const formatSpeed = (kmh) => {
  return `${Math.round(kmh)} km/h`;
};

export const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Add to your existing formatter.js - optional

// Format percentage
export const formatPercentage = (value, decimals = 0) => {
  return `${value.toFixed(decimals)}%`;
};

// Format currency (for future payment integration)
export const formatCurrency = (amount, currency = 'KES') => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format phone number
export const formatPhone = (phone) => {
  if (!phone) return 'N/A';
  // Format: +254 700 000 000
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return phone;
};

// Format bus capacity
export const formatCapacity = (current, total) => {
  return `${current}/${total} (${Math.round((current/total)*100)}%)`;
};

export const getRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffSeconds = Math.floor((now - then) / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};