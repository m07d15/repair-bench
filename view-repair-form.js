// view-repair-form.js: add a repair to a device, or edit/delete an existing one.
import { h } from './util.js';
import {
  getDevice, getRepair, addRepair, updateRepair, deleteRepair,
} from './db.js';

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Adding: renderRepairForm(root, { deviceId }). Editing: renderRepairForm(root, { repairId }).
export async function renderRepairForm(root, { deviceId = null, repairId = null }) {
  const editing = repairId !== null;
  const repair = editing ? await getRepair(repairId) : null;
  if (editing && !repair) throw new Error('That repair no longer exists.');
  const devId = editing ? repair.deviceId : deviceId;
  const device = await getDevice(devId);
  if (!device) throw new Error('That device no longer exists.');
  const r = repair || { date: todayLocal() };
  const backHref = `#/device/${devId}`;

  function field(label, name, props = {}) {
    return h('label', { class: 'field' },
      h('span', {}, label),
      h('input', { name, value: r[name] ?? '', ...props }));
  }

  const errorBox = h('p', { class: 'error', role: 'alert' });
  const saveBtn = h('button', { type: 'submit', class: 'primary' },
    editing ? 'Save changes' : 'Add repair');

  async function onSubmit(e) {
    e.preventDefault();
    errorBox.textContent = '';
    saveBtn.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(e.target));
      if (editing) await updateRepair(repairId, data);
      else await addRepair(devId, data);
      location.hash = backHref;
    } catch (err) {
      errorBox.textContent = err.message;
      saveBtn.disabled = false;
    }
  }

  async function onDelete() {
    if (!confirm('Delete this repair? This can\'t be undone.')) return;
    try {
      await deleteRepair(repairId);
      location.hash = backHref;
    } catch (err) {
      errorBox.textContent = err.message;
    }
  }

  const form = h('form', { onsubmit: onSubmit, novalidate: true },
    field('What was wrong?', 'fault',
      { placeholder: 'For example, dead battery', autocomplete: 'off' }),
    field('Date', 'date', { type: 'date' }),
    h('label', { class: 'field' },
      h('span', {}, 'What you did'),
      h('textarea', { name: 'workDone', rows: 4 }, r.workDone ?? '')),
    field('Parts used', 'partsUsed',
      { placeholder: 'For example, new battery BL-5C', autocomplete: 'off' }),
    field('Cost (AED)', 'cost',
      { type: 'number', inputmode: 'decimal', step: 'any', min: '0' }),
    errorBox,
    h('div', { class: 'actions' },
      saveBtn,
      h('a', { class: 'button secondary', href: backHref }, 'Cancel')),
    editing && h('button', { type: 'button', class: 'danger', onclick: onDelete },
      'Delete repair'));

  root.append(
    h('h2', { class: 'screen-title' }, editing ? 'Edit repair' : 'Add repair'),
    h('p', { class: 'muted' }, `For ${device.name}`),
    form);
}
