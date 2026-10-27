// Coalesce bursts while ensuring an event arriving during a read gets a fresh read.
export function createLatestLoader(action, onError = () => {}) {
  let active = false, pending = false;
  return async function loadLatest() {
    pending = true;
    if (active) return;
    active = true;
    try {
      while (pending) {
        pending = false;
        try { await action(); } catch (e) { await onError(e); }
      }
    } finally { active = false; }
  };
}
