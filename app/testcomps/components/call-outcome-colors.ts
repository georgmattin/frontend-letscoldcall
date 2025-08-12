// Shared color palette for call outcome badges
// Keys are lowercase outcome slugs from `call_history.call_outcome`
export type OutcomeColors = { bg: string; border: string; text: string };

export const CALL_OUTCOME_COLORS: Record<string, OutcomeColors> = {
  // Success / positive
  'meeting-scheduled': { bg: '#ECFDF5', border: '#10B981', text: '#047857' }, // emerald
  'meeting-booked': { bg: '#ECFDF5', border: '#10B981', text: '#047857' }, // alias
  sold: { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' }, // indigo
  positive: { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' }, // green
  interested: { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1' }, // sky

  // Follow-up
  callback: { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' }, // blue
  'callback-later': { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' }, // alias
  'left-voicemail': { bg: '#FDF4FF', border: '#D946EF', text: '#A21CAF' }, // fuchsia

  // Neutral / system
  neutral: { bg: '#F8FAFC', border: '#94A3B8', text: '#475569' }, // slate
  'not-available': { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' }, // slate light
  'no-answer': { bg: '#FFF7ED', border: '#FB923C', text: '#C2410C' }, // orange
  busy: { bg: '#FEFCE8', border: '#EAB308', text: '#A16207' }, // amber
  gatekeeper: { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' }, // violet

  // Negative
  'not-interested': { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C' }, // red
  negative: { bg: '#FFF1F2', border: '#F43F5E', text: '#E11D48' }, // rose-red
  'wrong-number': { bg: '#FFE4E6', border: '#FB7185', text: '#BE123C' }, // rose
  'do-not-call': { bg: '#FFF1F2', border: '#F43F5E', text: '#E11D48' }, // red-pink
};

export function getOutcomeColors(outcome?: string | null): OutcomeColors {
  const key = String(outcome || '').toLowerCase();
  return CALL_OUTCOME_COLORS[key] || { bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' };
}
