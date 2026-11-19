export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'mm_theme';

export const getStoredTheme = (): AppTheme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light'; // Default to Light Mode
};

export const applyAppTheme = (theme: AppTheme) => {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    root.classList.add('light');
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}

  // Dispatch custom event for real-time reactivity
  window.dispatchEvent(new CustomEvent('marketmind_theme_change', { detail: theme }));
};

export const toggleAppTheme = (): AppTheme => {
  const current = getStoredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyAppTheme(next);
  return next;
};
