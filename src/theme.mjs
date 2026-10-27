const button = document.getElementById('theme-toggle');
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
let saved = null;
try { saved = localStorage.getItem('gradatlas.theme.v1'); } catch {}
function apply(theme) {
  root.dataset.theme = theme;
  const dark = theme === 'dark';
  button.setAttribute('aria-checked', String(dark));
  button.setAttribute('aria-label', `切换至${dark ? '白昼' : '夜间'}配色`);
  button.querySelector('span').textContent = dark ? '夜间' : '白昼';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#080e1a' : '#f3f0e7';
}
apply(root.dataset.theme || 'light');
button.addEventListener('click', () => {
  saved = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('gradatlas.theme.v1', saved); } catch {}
  apply(saved);
});
system.addEventListener('change', e => { if (saved !== 'light' && saved !== 'dark') apply(e.matches ? 'dark' : 'light'); });
