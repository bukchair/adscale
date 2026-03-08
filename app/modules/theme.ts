// AdScale – dynamic theme using CSS custom properties
// Works with both light and dark themes defined in globals.css
export const C = {
  // Page structure
  pageBg:        "var(--c-bg)",
  card:          "var(--c-card)",
  cardAlt:       "var(--c-card-alt)",
  hover:         "var(--c-hover)",
  inputBg:       "var(--c-input-bg)",

  // Borders
  border:        "var(--c-border)",
  borderMid:     "var(--c-border-mid)",
  borderStrong:  "var(--c-border-strong)",

  // Text
  text:          "var(--c-text)",
  textSub:       "var(--c-text-sub)",
  textMuted:     "var(--c-text-muted)",

  // Brand / Accent — indigo
  accent:        "var(--c-accent)",
  accentHover:   "var(--c-accent-hover)",
  accentLight:   "var(--c-accent-light)",
  accentMid:     "var(--c-accent-mid)",

  // Alpha variants (use instead of `${C.accent}22` hex-alpha patterns)
  accentA:       "var(--c-accent-a)",   // ~13% opacity — replaces ${C.accent}22
  accentA2:      "var(--c-accent-a2)",  // ~20% opacity — replaces ${C.accent}33
  greenA:        "var(--c-green-a)",    // ~20% opacity — replaces ${C.green}33
  redA:          "var(--c-red-a)",      // ~20% opacity — replaces ${C.red}33
  purpleA:       "var(--c-purple-a)",   // ~13% opacity — replaces ${C.purple}22
  purpleA2:      "var(--c-purple-a2)",  // ~20% opacity — replaces ${C.purple}33
  purpleA3:      "var(--c-purple-a3)",  // ~3% opacity  — replaces ${C.purple}08

  // Status
  green:         "var(--c-green)",
  greenLight:    "var(--c-green-light)",
  greenText:     "var(--c-green-text)",

  amber:         "var(--c-amber)",
  amberLight:    "var(--c-amber-light)",
  amberText:     "var(--c-amber-text)",

  red:           "var(--c-red)",
  redLight:      "var(--c-red-light)",
  redText:       "var(--c-red-text)",

  blue:          "var(--c-blue)",
  blueLight:     "var(--c-blue-light)",
  blueText:      "var(--c-blue-text)",

  purple:        "var(--c-purple)",
  purpleLight:   "var(--c-purple-light)",
  purpleText:    "var(--c-purple-text)",

  teal:          "var(--c-teal)",
  tealLight:     "var(--c-teal-light)",

  orange:        "var(--c-orange)",
  orangeLight:   "var(--c-orange-light)",

  // Shadows
  shadow:        "var(--c-shadow)",
  shadowMd:      "var(--c-shadow-md)",
  shadowLg:      "var(--c-shadow-lg)",

  // Sidebar
  sidebar:            "var(--c-sidebar)",
  sidebarBorder:      "var(--c-sidebar-border)",
  sidebarActive:      "var(--c-sidebar-active)",
  sidebarActiveText:  "var(--c-sidebar-active-text)",
  sidebarText:        "var(--c-sidebar-text)",
  sidebarHover:       "var(--c-sidebar-hover)",

  // Misc
  radius:   12,
  radiusSm: 8,
} as const;

export type LangStr = (he: string, en: string) => string;
