// Only theme preference is stored in the browser; application records remain in .local/.
(() => {
  let theme;
  try { const value = localStorage.getItem('gradatlas.theme.v1'); if (value === 'light' || value === 'dark') theme = value; } catch {}
  if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
})();
