// view-list.js: the home screen. Shows devices with search and a status filter.
import { h, money, blobUrl } from './util.js';
import { getDevices, STATUSES } from './db.js';

// A gentle reminder when your collection hasn't been backed up for a while.
function backupNudge(deviceCount) {
  if (deviceCount === 0) return null;
  let iso = null;
  try { iso = localStorage.getItem('rb-last-backup'); } catch { /* storage unavailable */ }
  const days = iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
  if (days !== null && days < 14) return null;
  const text = days === null
    ? "You haven't backed up your collection yet."
    : `Your last backup was ${days} days ago.`;
  return h('a', { class: 'nudge', href: '#/backup' }, `${text} Tap to back up.`);
}

export async function renderList(root) {
  const devices = await getDevices();
  let query = '';
  let statusFilter = 'All';
  let sortBy = 'recent';

  const searchBox = h('input', {
    type: 'search', class: 'search', placeholder: 'Search your devices',
    'aria-label': 'Search your devices', autocomplete: 'off',
    oninput: e => { query = e.target.value; draw(); },
  });
  const chips = h('div', { class: 'chips' });
  const summary = h('p', { class: 'muted' });

  const sorters = {
    recent: (x, y) => y.updatedAt - x.updatedAt,
    name: (x, y) => x.name.localeCompare(y.name),
    price: (x, y) => (y.purchasePrice ?? -1) - (x.purchasePrice ?? -1),
    value: (x, y) => (y.estimatedValue ?? -1) - (x.estimatedValue ?? -1),
  };
  const sortSelect = h('select', {
    class: 'sort', 'aria-label': 'Sort devices',
    onchange: e => { sortBy = e.target.value; draw(); },
  },
    h('option', { value: 'recent' }, 'Recently changed'),
    h('option', { value: 'name' }, 'Name, A to Z'),
    h('option', { value: 'price' }, 'Purchase price, high to low'),
    h('option', { value: 'value' }, 'Estimated value, high to low'));
  const listEl = h('div', { class: 'list' });

  function drawChips() {
    chips.replaceChildren(...['All', ...STATUSES].map(s =>
      h('button', {
        type: 'button',
        class: 'chip' + (s === statusFilter ? ' active' : ''),
        onclick: () => { statusFilter = s; drawChips(); draw(); },
      }, s)));
  }

  function matches(d) {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [d.name, d.brand, d.model, d.modelNumber, d.type, d.notes]
      .join(' ').toLowerCase().includes(q);
  }

  function row(d) {
    const slug = d.status.toLowerCase().replace(/ /g, '-');
    const line = [d.type, d.brand, d.modelNumber || d.model].filter(Boolean).join(', ');
    const thumb = d.coverThumb
      ? h('img', { class: 'thumb', src: blobUrl(d.coverThumb), alt: '' })
      : null;
    return h('a', { class: `row status-${slug}${thumb ? ' has-thumb' : ''}`, href: `#/device/${d.id}` },
      thumb,
      h('div', { class: 'row-top' },
        h('h3', {}, d.name),
        h('span', { class: 'status-text' }, d.status)),
      h('p', { class: 'muted' }, line),
      h('p', { class: 'muted' },
        `Paid ${money(d.purchasePrice)}, worth ${money(d.estimatedValue)}`));
  }

  function draw() {
    const shown = devices.filter(matches).sort(sorters[sortBy]);
    summary.textContent = `${shown.length} of ${devices.length} devices`;
    if (devices.length === 0) {
      listEl.replaceChildren(h('p', { class: 'empty' },
        'No devices yet. Tap + to add your first one.'));
    } else if (shown.length === 0) {
      listEl.replaceChildren(h('p', { class: 'empty' },
        'Nothing matches. Try a different search or filter.'));
    } else {
      listEl.replaceChildren(...shown.map(row));
    }
  }

  root.append(
    h('h2', { class: 'screen-title' }, 'My devices'),
    backupNudge(devices.length) ?? '',
    searchBox, chips,
    h('div', { class: 'list-tools' }, summary, sortSelect),
    listEl,
    h('a', { class: 'fab', href: '#/add', 'aria-label': 'Add device' }, '+'));
  drawChips();
  draw();
}
