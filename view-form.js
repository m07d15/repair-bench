// view-form.js: add a new device, or edit/delete an existing one.
import { h } from './util.js';
import {
  TYPES, STATUSES, getDevice, addDevice, updateDevice, deleteDevice,
} from './db.js';

export async function renderForm(root, id) {
  const editing = id !== null;
  const device = editing ? await getDevice(id) : null;
  if (editing && !device) throw new Error('That device no longer exists.');
  const d = device || { type: 'Phone', status: 'Working' };

  function field(label, name, props = {}) {
    return h('label', { class: 'field' },
      h('span', {}, label),
      h('input', { name, value: d[name] ?? '', ...props }));
  }

  function select(label, name, options) {
    return h('label', { class: 'field' },
      h('span', {}, label),
      h('select', { name },
        options.map(o => h('option', { value: o, selected: d[name] === o }, o))));
  }

  const errorBox = h('p', { class: 'error', role: 'alert' });
  const saveBtn = h('button', { type: 'submit', class: 'primary' },
    editing ? 'Save changes' : 'Add device');

  async function onSubmit(e) {
    e.preventDefault();
    errorBox.textContent = '';
    saveBtn.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(e.target));
      if (editing) await updateDevice(id, data);
      else await addDevice(data);
      location.hash = editing ? `#/device/${id}` : '#/';
    } catch (err) {
      errorBox.textContent = err.message;
      saveBtn.disabled = false;
    }
  }

  async function onDelete() {
    const ok = confirm(
      `Delete "${device.name}" with all its repairs and photos? This can't be undone.`);
    if (!ok) return;
    try {
      await deleteDevice(id);
      location.hash = '#/';
    } catch (err) {
      errorBox.textContent = err.message;
    }
  }

  const form = h('form', { onsubmit: onSubmit, novalidate: true },
    field('Name', 'name', { placeholder: 'For example, Nokia 3310', autocomplete: 'off' }),
    select('Type', 'type', TYPES),
    select('Status', 'status', STATUSES),
    field('Brand', 'brand', { autocomplete: 'off' }),
    field('Model', 'model', { autocomplete: 'off' }),
    field('Model number', 'modelNumber', { autocomplete: 'off' }),
    field('Release year', 'releaseYear', { type: 'number', inputmode: 'numeric' }),
    field('Serial number (optional)', 'serialNumber', { autocomplete: 'off' }),
    field('Condition', 'condition', { placeholder: 'For example, cracked screen, battery holds charge' }),
    field('Purchase date', 'purchaseDate', { type: 'date' }),
    field('Purchase price (AED)', 'purchasePrice',
      { type: 'number', inputmode: 'decimal', step: 'any', min: '0' }),
    field('Estimated value (AED)', 'estimatedValue',
      { type: 'number', inputmode: 'decimal', step: 'any', min: '0' }),
    h('label', { class: 'field' },
      h('span', {}, 'Notes'),
      h('textarea', { name: 'notes', rows: 4 }, d.notes ?? '')),
    errorBox,
    h('div', { class: 'actions' },
      saveBtn,
      h('a', { class: 'button secondary', href: editing ? `#/device/${id}` : '#/' }, 'Cancel')),
    editing && h('button', { type: 'button', class: 'danger', onclick: onDelete },
      'Delete device'));

  root.append(
    h('h2', { class: 'screen-title' }, editing ? 'Edit device' : 'Add device'),
    form);
}
