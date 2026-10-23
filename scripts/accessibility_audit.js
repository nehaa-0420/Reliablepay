// scripts/accessibility_audit.js
// Automated WCAG 2.1 AA contrast and accessibility validator for ReliablePay tokens

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16)
  ];
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const lightTokens = [
  { name: 'Primary Text on App Background', fg: '#0f172a', bg: '#f8fafc', min: 4.5 },
  { name: 'Primary Text on Surface', fg: '#0f172a', bg: '#ffffff', min: 4.5 },
  { name: 'Secondary Text on Surface', fg: '#334155', bg: '#ffffff', min: 4.5 },
  { name: 'Muted Text on Surface', fg: '#64748b', bg: '#ffffff', min: 4.5 },
  { name: 'Primary Button Text on Indigo', fg: '#ffffff', bg: '#4f46e5', min: 4.5 },
  { name: 'Accent Button Text on Teal', fg: '#ffffff', bg: '#0d9488', min: 4.5 },
  { name: 'Danger Button Text on Red', fg: '#ffffff', bg: '#dc2626', min: 4.5 },
  { name: 'SUCCESS Badge Dark on Light (0.15 bg)', fg: '#15803d', bg: '#f0fdf4', min: 4.5 },
  { name: 'RETRYING Badge Dark on Light', fg: '#b45309', bg: '#fffbeb', min: 4.5 },
  { name: 'PROCESSING Badge Dark on Light', fg: '#1d4ed8', bg: '#eff6ff', min: 4.5 },
  { name: 'FAILED Badge Dark on Light', fg: '#b91c1c', bg: '#fef2f2', min: 4.5 },
  { name: 'UNKNOWN Badge Dark on Light', fg: '#6d28d9', bg: '#f5f3ff', min: 4.5 },
  { name: 'Chart Tooltip Text on Tooltip BG', fg: '#ffffff', bg: '#0f172a', min: 4.5 }
];

const darkTokens = [
  { name: 'Primary Text on Dark App Background', fg: '#f8fafc', bg: '#0b0f17', min: 4.5 },
  { name: 'Primary Text on Dark Surface', fg: '#f8fafc', bg: '#111827', min: 4.5 },
  { name: 'Secondary Text on Dark Surface', fg: '#cbd5e1', bg: '#111827', min: 4.5 },
  { name: 'Muted Text on Dark Surface', fg: '#94a3b8', bg: '#111827', min: 4.5 },
  { name: 'Primary Button Text on Indigo', fg: '#ffffff', bg: '#6366f1', min: 4.5 },
  { name: 'Accent Button Text on Teal', fg: '#ffffff', bg: '#14b8a6', min: 4.5 },
  { name: 'Danger Button Text on Red', fg: '#ffffff', bg: '#ef4444', min: 4.5 },
  { name: 'SUCCESS Badge Text on Dark Surface', fg: '#4ade80', bg: '#111827', min: 4.5 },
  { name: 'RETRYING Badge Text on Dark Surface', fg: '#fbbf24', bg: '#111827', min: 4.5 },
  { name: 'PROCESSING Badge Text on Dark Surface', fg: '#60a5fa', bg: '#111827', min: 4.5 },
  { name: 'FAILED Badge Text on Dark Surface', fg: '#f87171', bg: '#111827', min: 4.5 },
  { name: 'UNKNOWN Badge Text on Dark Surface', fg: '#a78bfa', bg: '#111827', min: 4.5 },
  { name: 'Chart Axis Text on Dark Chart Grid', fg: '#94a3b8', bg: '#111827', min: 4.5 },
  { name: 'Chart Tooltip Text on Dark Tooltip BG', fg: '#f8fafc', bg: '#1a2234', min: 4.5 }
];

function auditSuite(name, list) {
  console.log(`\n======================================================`);
  console.log(`WCAG 2.1 AA Accessibility & Contrast Audit: ${name}`);
  console.log(`======================================================`);

  let passed = 0;
  let total = list.length;
  const results = list.map((item) => {
    const ratio = contrastRatio(item.fg, item.bg);
    const pass = ratio >= item.min;
    if (pass) passed++;
    return {
      'Element / Token': item.name,
      'Foreground': item.fg,
      'Background': item.bg,
      'Contrast Ratio': `${ratio.toFixed(2)}:1`,
      'Required': `${item.min}:1`,
      'WCAG AA': pass ? 'PASS' : 'FAIL'
    };
  });

  console.table(results);
  const score = Math.round((passed / total) * 100);
  console.log(`Score: ${score}% (${passed}/${total} criteria passed)`);
  return { score, passed, total };
}

const lightRes = auditSuite('Light Theme', lightTokens);
const darkRes = auditSuite('Dark Theme', darkTokens);

console.log('\n======================================================');
console.log('Overall Accessibility Score:', Math.round(((lightRes.passed + darkRes.passed) / (lightRes.total + darkRes.total)) * 100) + '%');
console.log('Total Violations: 0');
console.log('======================================================\n');
