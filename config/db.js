const mongoose = require('mongoose');

function buildUriFromParts() {
  const user = process.env.MONGO_USER;
  const pass = process.env.MONGO_PASS;
  const host = process.env.MONGO_HOST;
  const db = process.env.MONGO_DB || '';

  if (!user || !pass || !host) return null;

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);

  // Use the +srv form when host looks like a plain host (common with Atlas)
  const hostWithProtocol = host.startsWith('mongodb') ? host : host;

  const dbSegment = db ? `/${db}` : '';
  const options = '?retryWrites=true&w=majority';

  return `mongodb+srv://${u}:${p}@${hostWithProtocol}${dbSegment}${options}`;
}

// Prefer explicit parts (MONGO_USER/MONGO_PASS/MONGO_HOST) when provided.
// Fall back to MONGO_URI for backward compatibility.
const uri = (process.env.MONGO_USER && process.env.MONGO_PASS && process.env.MONGO_HOST)
  ? buildUriFromParts()
  : process.env.MONGO_URI || null;

if (!uri) {
  console.warn('No MongoDB connection string found. Set MONGO_URI or MONGO_USER/MONGO_PASS/MONGO_HOST.');
} else {
  mongoose.connect(uri)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

module.exports = mongoose;
