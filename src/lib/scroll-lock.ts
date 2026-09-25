/**
 * The single owner of page scroll locking. Each caller (the intro loader,
 * the fullscreen nav) locks and releases under its own name, and the page
 * stays locked while any owner still holds a lock — so one component can
 * never release another's. The `scroll-locked` class is styled in globals.css.
 */
const owners = new Set<string>();

function sync() {
  const locked = owners.size > 0;
  document.documentElement.classList.toggle("scroll-locked", locked);
  document.body.classList.toggle("scroll-locked", locked);
}

export function lockScroll(owner: string) {
  owners.add(owner);
  sync();
}

export function unlockScroll(owner: string) {
  owners.delete(owner);
  sync();
}
