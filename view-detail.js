// view-detail.js: one device with its money summary and repair history.
import { h, money } from './util.js';
import { getDevice, getRepairs } from './db.js';
import { photoSection } from './photos-ui.js';

export async function renderDetail(root, id) {
  const device = await getDevice(id);
  if (!device) throw new Error('That device no longer exists.');
  const repairs = await getRepairs(id);

  const repairsTotal = repairs.reduce((sum, r) => sum + r.cost, 0);
  const invested = (device.purchasePrice ?? 0) + repairsTotal;
  const worth = device.estimatedValue;
  const slug = device.status.toLowerCase().replace(/ /g, '-');

  let verdict = null;
  if (worth !== null && worth !== undefined) {
    const diff = worth - invested;
    verdict = diff >= 0
      ? `It's worth ${money(diff)} more than you put in.`
      : `You've put in ${money(-diff)} more than it's worth.`;
  }

  const moneyRows = [
    ['Paid', money(device.purchasePrice)],
    ['Spent on repairs', money(repairsTotal)],
    ['Total put in', money(invested)],
    ['Estimated value', money(worth)],
  ];

  const facts = [
    ['Model', device.model],
    ['Model number', device.modelNumber],
    ['Release year', device.releaseYear],
    ['Serial number', device.serialNumber],
    ['Condition', device.condition],
    ['Purchase date', device.purchaseDate],
    ['Notes', device.notes],
  ].filter(([, v]) => v !== '' && v !== null && v !== undefined);

  const listRows = rows => rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]);

  function repairItem(r) {
    return h('a', { class: 'repair', href: `#/repair/${r.id}` },
      h('div', { class: 'row-top' },
        h('h4', {}, r.fault),
        h('span', { class: 'cost' }, money(r.cost))),
      h('p', { class: 'muted' }, r.date),
      r.workDone && h('p', {}, r.workDone),
      r.partsUsed && h('p', { class: 'muted' }, `Parts: ${r.partsUsed}`));
  }

  root.append(
    h('a', { class: 'back', href: '#/' }, 'Back to devices'),
    h('div', { class: `detail-head status-${slug}` },
      h('h2', { class: 'screen-title' }, device.name),
      h('p', { class: 'status-text' }, device.status),
      h('p', { class: 'muted' }, [device.type, device.brand].filter(Boolean).join(', '))),
    await photoSection(id),
    h('section', { class: 'panel' },
      h('dl', { class: 'facts' }, listRows(moneyRows))),
    verdict ? h('p', { class: 'verdict' }, verdict) : '',
    facts.length > 0
      ? h('section', { class: 'panel' }, h('dl', { class: 'facts' }, listRows(facts)))
      : '',
    h('div', { class: 'actions' },
      h('a', { class: 'button primary', href: `#/device/${id}/repair` }, 'Add repair'),
      h('a', { class: 'button secondary', href: `#/edit/${id}` }, 'Edit device')),
    h('h3', { class: 'section-title' }, `Repair history (${repairs.length})`),
    repairs.length === 0
      ? h('p', { class: 'empty' }, 'No repairs logged yet. Tap Add repair when you fix something.')
      : h('div', { class: 'list' }, repairs.map(repairItem)));
}
