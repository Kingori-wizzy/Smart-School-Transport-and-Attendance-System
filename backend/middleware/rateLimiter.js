// File: backend/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 * 60 * 1000 = 15 minutes)
 * @param {number} options.max - Maximum number of requests per window (default: 100)
 * @param {string} options.message - Error message (default: 'Too many requests, please try again later.')
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    ...rest
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...rest
  });
};

// Pre-configured rate limiters for different use cases

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * Medium rate limiter for API endpoints
 * 100 requests per 15 minutes
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please slow down.'
});

/**
 * Light rate limiter for public endpoints
 * 30 requests per minute
 */
const publicLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests, please try again later.'
});

/**
 * SMS rate limiter - very strict
 * 10 requests per hour
 */
const smsLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'SMS limit exceeded. Please try again later.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  publicLimiter,
  smsLimiter
};