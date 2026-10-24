// view-list.js: the home screen. Shows devices with search and a status filter.
import { h, money } from './util.js';
import { getDevices, STATUSES } from './db.js';

export async function renderList(root) {
  const devices = await getDevices();
  let query = '';
  let statusFilter = 'All';

  const searchBox = h('input', {
    type: 'search', class: 'search', placeholder: 'Search your devices',
    'aria-label': 'Search your devices', autocomplete: 'off',
    oninput: e => { query = e.target.value; draw(); },
  });
  const chips = h('div', { class: 'chips' });
  const summary = h('p', { class: 'muted' });
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
    return h('a', { class: `row status-${slug}`, href: `#/edit/${d.id}` },
      h('div', { class: 'row-top' },
        h('h3', {}, d.name),
        h('span', { class: 'status-text' }, d.status)),
      h('p', { class: 'muted' }, line),
      h('p', { class: 'muted' },
        `Paid ${money(d.purchasePrice)}, worth ${money(d.estimatedValue)}`));
  }

  function draw() {
    const shown = devices.filter(matches);
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
    searchBox, chips, summary, listEl,
    h('a', { class: 'fab', href: '#/add', 'aria-label': 'Add device' }, '+'));
  drawChips();
  draw();
}
