// app.js: starts the app and switches between screens using the URL hash.
import { h, revokeBlobUrls } from './util.js';
import { renderList } from './view-list.js';
import { renderDetail } from './view-detail.js';
import { renderForm } from './view-form.js';
import { renderRepairForm } from './view-repair-form.js';
import { renderBackup } from './view-backup.js';

const view = document.getElementById('view');

async function route() {
  const parts = location.hash.slice(1).split('/').filter(Boolean);
  revokeBlobUrls();
  view.replaceChildren();
  try {
    if (parts[0] === 'add') {
      await renderForm(view, null);
    } else if (parts[0] === 'edit' && parts[1]) {
      await renderForm(view, Number(parts[1]));
    } else if (parts[0] === 'device' && parts[1] && parts[2] === 'repair') {
      await renderRepairForm(view, { deviceId: Number(parts[1]) });
    } else if (parts[0] === 'device' && parts[1]) {
      await renderDetail(view, Number(parts[1]));
    } else if (parts[0] === 'backup') {
      await renderBackup(view);
    } else if (parts[0] === 'repair' && parts[1]) {
      await renderRepairForm(view, { repairId: Number(parts[1]) });
    } else {
      await renderList(view);
    }
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    view.replaceChildren(
      h('p', { class: 'error' }, `Something went wrong: ${err.message}`),
      h('a', { class: 'button secondary', href: '#/' }, 'Back to devices'));
  }
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .catch(err => console.error('Service worker failed:', err));
}

// Ask the browser not to clear our data when the phone is short on space.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
