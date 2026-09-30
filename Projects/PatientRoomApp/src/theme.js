// src/theme.js

// ─────────────────────────────────────────────────────────
// COLORS
// Neutral base + one accent per role + semantic statuses
// ─────────────────────────────────────────────────────────
export const colors = {
  // Neutrals
  ink900: '#0F172A',   // headings, hero numbers
  ink700: '#334155',   // body text
  ink500: '#64748B',   // secondary text, captions
  ink300: '#CBD5E1',   // borders, dividers
  ink100: '#F1F5F9',   // subtle surfaces, chips
  ink50:  '#F8FAFC',   // screen background
  white:  '#FFFFFF',   // cards

  // Accent (per role — pick one at screen level)
  patient:      '#0F766E',   // deep teal
  patientSoft:  '#F0FDFA',
  patientInk:   '#134E4A',

  admin:        '#B91C1C',   // deep red
  adminSoft:    '#FEF2F2',
  adminInk:     '#7F1D1D',

  // Semantic
  success:      '#15803D',
  successSoft:  '#DCFCE7',
  warning:      '#B45309',
  warningSoft:  '#FEF3C7',
  danger:       '#B91C1C',
  dangerSoft:   '#FEE2E2',
  info:         '#0369A1',
  infoSoft:     '#E0F2FE',
};

// ─────────────────────────────────────────────────────────
// SPACING (8pt grid)
// ─────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─────────────────────────────────────────────────────────
// RADIUS
// ─────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

// ─────────────────────────────────────────────────────────
// ELEVATION (soft, never harsh)
// ─────────────────────────────────────────────────────────
export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
};

// ─────────────────────────────────────────────────────────
// TYPOGRAPHY (max 3 sizes per screen — pick from here)
// ─────────────────────────────────────────────────────────
export const type = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink900,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.ink900,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink900,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink700,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink900,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink500,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink500,
  },
};

// ─────────────────────────────────────────────────────────
// ICONS (Feather via @expo/vector-icons)
// ─────────────────────────────────────────────────────────
export const iconSize = {
  inline: 16,
  ui: 20,
  tab: 22,
  hero: 32,
};