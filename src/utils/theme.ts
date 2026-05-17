export type Theme = 'liquid-galaxy' | 'dark' | 'light';

const THEME_KEY = 'snapxr_theme';

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved && ['liquid-galaxy', 'dark', 'light'].includes(saved)) return saved;
  return 'liquid-galaxy';
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
  const t = getTheme();
  document.documentElement.setAttribute('data-theme', t);
}
