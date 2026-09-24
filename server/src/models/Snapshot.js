// models/Snapshot.js — Mongoose schema for caching results in MongoDB.

import mongoose from 'mongoose';

const SnapshotSchema = new mongoose.Schema({
  // Store username lowercased so lookups are case-insensitive.
  username: { type: String, required: true, lowercase: true, index: true },

  analysis: { type: Object, required: true },
  report: { type: Object, required: true },
  reportSource: { type: String, enum: ['llm', 'fallback'], required: true },

  // createdAt is used for the 6-hour cache check and the 7-day TTL index.
  createdAt: { type: Date, default: Date.now },
});

// Automatically delete documents 7 days after createdAt.
// This prevents the Atlas free tier from filling up.
SnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('Snapshot', SnapshotSchema);
