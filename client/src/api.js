// api.js — all HTTP calls to our backend go through this module.
// Change VITE_API_URL in .env to point at a different backend.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL });

/**
 * POST /api/analyze
 * @param {string} username
 * @param {boolean} refresh — set true to bypass the cache
 */
export async function analyzeUser(username, refresh = false) {
  const res = await api.post(
    `/api/analyze${refresh ? '?refresh=true' : ''}`,
    { username }
  );
  return res.data;
}
