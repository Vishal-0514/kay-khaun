import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import Saved from '../models/Saved.js';
import { learnedSummary } from '../services/taste.js';

// The user's own food data: saved dishes, history, and what taste learning
// picked up. Everything here can be removed by the user.

const OPENED_DEDUPE_MS = 60 * 60 * 1000;
const PAGE = 30;
const LEARNING_KINDS = ['opened', 'ordered', 'not_for_me'];
const HISTORY_KINDS = ['ordered', 'plan'];

const savedView = (s) => ({ ...s.item, savedAt: s.createdAt });
const historyView = (a) => ({ id: a._id, kind: a.kind, at: a.createdAt, item: a.item ?? null, app: a.app ?? null, plan: a.kind === 'plan' ? a.plan : null });

export async function listSaved(req, res) {
  const saved = await Saved.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, items: saved.map(savedView) });
}

// Saving is something they asked for directly, so it works with memory off.
export async function saveItem(req, res) {
  const { item } = req.body;
  const saved = await Saved.findOneAndUpdate(
    { user: req.user._id, 'item.id': item.id },
    { $set: { item }, $setOnInsert: { user: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  // Saving it means it's no longer "Not for me".
  await Activity.deleteMany({ user: req.user._id, kind: 'not_for_me', 'item.id': item.id });
  res.json({ success: true, item: savedView(saved) });
}

export async function unsaveItem(req, res) {
  await Saved.deleteOne({ user: req.user._id, 'item.id': req.params.itemId });
  res.json({ success: true });
}

// opened / ordered / not_for_me. Only while "Remember my taste" is on.
export async function recordActivity(req, res) {
  if (!req.user.memoryEnabled) return res.json({ success: true, recorded: false });
  const { kind, item, app } = req.body;
  if (kind === 'opened') {
    const recent = await Activity.exists({ user: req.user._id, kind: 'opened', 'item.id': item.id, createdAt: { $gt: new Date(Date.now() - OPENED_DEDUPE_MS) } });
    if (recent) return res.json({ success: true, recorded: false });
  }
  if (kind === 'not_for_me') await Saved.deleteOne({ user: req.user._id, 'item.id': item.id });
  await Activity.create({ user: req.user._id, kind, item, app: kind === 'ordered' ? app ?? null : null });
  res.json({ success: true, recorded: true });
}

// "Save this day" from the plan screen.
export async function savePlan(req, res) {
  const entry = await Activity.create({ user: req.user._id, kind: 'plan', plan: req.body });
  res.json({ success: true, entry: historyView(entry.toObject()) });
}

// Newest first; pass ?before=<ISO date> for the next page.
export async function listHistory(req, res) {
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const filter = { user: req.user._id, kind: { $in: HISTORY_KINDS } };
  if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
  const entries = await Activity.find(filter).sort({ createdAt: -1 }).limit(PAGE + 1).lean();
  res.json({ success: true, entries: entries.slice(0, PAGE).map(historyView), more: entries.length > PAGE });
}

export async function removeHistory(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, error: 'Not found' });
  await Activity.deleteOne({ _id: req.params.id, user: req.user._id, kind: { $in: HISTORY_KINDS } });
  res.json({ success: true });
}

export async function clearHistory(req, res) {
  await Activity.deleteMany({ user: req.user._id, kind: { $in: HISTORY_KINDS } });
  res.json({ success: true });
}

export async function getLearned(req, res) {
  res.json({ success: true, learned: await learnedSummary(req.user) });
}

// "Clear what I've learned": forgets opens, orders and "Not for me".
export async function clearLearned(req, res) {
  await Activity.deleteMany({ user: req.user._id, kind: { $in: LEARNING_KINDS } });
  res.json({ success: true, learned: await learnedSummary(req.user) });
}
