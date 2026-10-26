// finder.js: the "Find picture" window. Searches Wikipedia for pictures of a device.
import { h } from './util.js';
import { addPhoto } from './db.js';
import { makePhotoPair } from './images.js';

const API = 'https://en.wikipedia.org/w/api.php';

async function searchPictures(term) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search', gsrsearch: term, gsrnamespace: '0', gsrlimit: '12',
    prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '600',
    pilimit: '12', pilicense: 'any',
  });
  let res;
  try {
    res = await fetch(`${API}?${params}`);
  } catch {
    throw new Error("Couldn't reach Wikipedia. Check your internet connection.");
  }
  if (!res.ok) throw new Error(`Wikipedia answered with an error (${res.status}).`);
  const data = await res.json();
  return Object.values(data.query?.pages ?? {})
    .filter(p => p.thumbnail?.source)
    .sort((a, b) => a.index - b.index)
    .slice(0, 8)
    .map(p => ({ title: p.title, url: p.thumbnail.source }));
}

async function downloadImage(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Couldn't download that picture. Check your internet connection, or try another one.");
  }
  if (!res.ok) throw new Error(`Couldn't download that picture (${res.status}).`);
  return res.blob();
}

export function openFinder({ deviceId, term, onSaved }) {
  const input = h('input', { type: 'search', value: term, 'aria-label': 'What to search for' });
  const results = h('div', { class: 'finder-results' });
  const message = h('p', { class: 'muted', role: 'status' });
  const errorBox = h('p', { class: 'error', role: 'alert' });
  let busy = false;

  async function search(e) {
    if (e) e.preventDefault();
    const q = input.value.trim();
    if (!q) { errorBox.textContent = 'Type what to search for.'; return; }
    errorBox.textContent = '';
    message.textContent = 'Searching…';
    results.replaceChildren();
    try {
      const found = await searchPictures(q);
      message.textContent = found.length === 0
        ? 'No pictures found. Try a shorter or different search.'
        : 'Tap the right picture to save it.';
      results.replaceChildren(...found.map(pictureButton));
    } catch (err) {
      message.textContent = '';
      errorBox.textContent = err.message;
    }
  }

  function pictureButton(item) {
    return h('button', { type: 'button', class: 'finder-pick', onclick: () => save(item) },
      h('img', { src: item.url, alt: item.title, loading: 'lazy' }),
      h('span', {}, item.title));
  }

  async function save(item) {
    if (busy) return;
    busy = true;
    errorBox.textContent = '';
    message.textContent = 'Saving…';
    try {
      const downloaded = await downloadImage(item.url);
      const { blob, thumb } = await makePhotoPair(downloaded);
      await addPhoto(deviceId, blob, thumb, `Wikipedia: ${item.title}`);
      dialog.close();
      await onSaved();
    } catch (err) {
      message.textContent = '';
      errorBox.textContent = err.message;
    } finally {
      busy = false;
    }
  }

  const dialog = h('dialog', { class: 'finder' },
    h('h3', { class: 'section-title' }, 'Find picture'),
    h('form', { class: 'finder-form', onsubmit: search },
      input,
      h('button', { type: 'submit', class: 'primary' }, 'Search')),
    message, errorBox, results,
    h('p', { class: 'muted' },
      'Pictures come from Wikipedia and belong to their creators. They are saved on your phone for your own collection.'),
    h('button', { type: 'button', class: 'secondary', onclick: () => dialog.close() }, 'Close'));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  search();
}
