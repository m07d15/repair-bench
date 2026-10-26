// util.js: small helpers shared by every screen.

// Builds a DOM element safely. Text goes in as text (never as HTML),
// so nothing a user types can break the page.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function money(n) {
  if (n === null || n === undefined) return 'not set';
  return `${Number(n).toLocaleString('en', { maximumFractionDigits: 2 })} AED`;
}

// Picture URLs made from stored images. We remember them so the app can
// release them when you move to another screen.
let blobUrls = [];

export function blobUrl(blob) {
  const url = URL.createObjectURL(blob);
  blobUrls.push(url);
  return url;
}

export function revokeBlobUrls() {
  blobUrls.forEach(u => URL.revokeObjectURL(u));
  blobUrls = [];
}
