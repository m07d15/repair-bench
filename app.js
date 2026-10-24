// app.js: starts the app and switches between screens using the URL hash.
import { h } from './util.js';
import { renderList } from './view-list.js';
import { renderForm } from './view-form.js';

const view = document.getElementById('view');

async function route() {
  const parts = location.hash.slice(1).split('/').filter(Boolean);
  view.replaceChildren();
  try {
    if (parts[0] === 'add') await renderForm(view, null);
    else if (parts[0] === 'edit' && parts[1]) await renderForm(view, Number(parts[1]));
    else await renderList(view);
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
