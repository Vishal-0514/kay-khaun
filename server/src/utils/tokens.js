import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL_MS = Number(process.env.REFRESH_TOKEN_DAYS || 30) * 24 * 60 * 60 * 1000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({ user: userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) });
  return token;
}

// A short-lived access token for API calls plus a long-lived refresh token that
// keeps the user signed in.
export async function issueSession(user) {
  return { accessToken: signAccessToken(user), refreshToken: await issueRefreshToken(user._id) };
}

// Trades a refresh token for a new pair. The old one is deleted in the same step,
// so a stolen token stops working as soon as either side uses it.
export async function rotateRefreshToken(token) {
  const old = await RefreshToken.findOneAndDelete({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  if (!old) return null;
  return { userId: old.user, refreshToken: await issueRefreshToken(old.user) };
}

export async function revokeRefreshToken(token) {
  await RefreshToken.deleteOne({ tokenHash: sha256(token) });
}
