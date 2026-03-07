// AdScale – light theme color palette
export const C = {
  // Page structure
  pageBg:        "#f1f5f9",
  card:          "#ffffff",
  cardAlt:       "#f8fafc",
  hover:         "#f8fafc",
  inputBg:       "#f8fafc",

  // Borders
  border:        "#e2e8f0",
  borderMid:     "#cbd5e1",
  borderStrong:  "#94a3b8",

  // Text
  text:          "#1e293b",
  textSub:       "#475569",
  textMuted:     "#94a3b8",

  // Brand / Accent — indigo
  accent:        "#6366f1",
  accentHover:   "#4f46e5",
  accentLight:   "#eef2ff",
  accentMid:     "#818cf8",

  // Status
  green:         "#10b981",
  greenLight:    "#d1fae5",
  greenText:     "#065f46",

  amber:         "#f59e0b",
  amberLight:    "#fef3c7",
  amberText:     "#92400e",

  red:           "#ef4444",
  redLight:      "#fee2e2",
  redText:       "#991b1b",

  blue:          "#3b82f6",
  blueLight:     "#dbeafe",
  blueText:      "#1e40af",

  purple:        "#8b5cf6",
  purpleLight:   "#ede9fe",
  purpleText:    "#5b21b6",

  teal:          "#0d9488",
  tealLight:     "#ccfbf1",

  orange:        "#f97316",
  orangeLight:   "#ffedd5",

  // Shadows
  shadow:        "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:      "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
  shadowLg:      "0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.04)",

  // Sidebar
  sidebar:            "#ffffff",
  sidebarBorder:      "#e2e8f0",
  sidebarActive:      "#eef2ff",
  sidebarActiveText:  "#4338ca",
  sidebarText:        "#64748b",
  sidebarHover:       "#f8fafc",

  // Misc
  radius:   12,
  radiusSm: 8,
} as const;

export type LangStr = (he: string, en: string) => string;
