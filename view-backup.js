// view-backup.js: save everything to a file, or restore from one.
import { h } from './util.js';
import { createBackup, readBackupFile, applyBackup } from './backup.js';

const KEY = 'rb-last-backup';

function getLastBackup() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function setLastBackup() {
  try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* storage unavailable */ }
}

const megabytes = bytes => (bytes / 1024 / 1024).toFixed(1);

// Phones get the share sheet (choose "Save to Files"). Computers get a normal download.
async function saveFile(file) {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Repair Bench backup' });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const link = h('a', { href: url, download: file.name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

export async function renderBackup(root) {
  const lastLine = h('p', { class: 'muted' });
  function showLast() {
    const iso = getLastBackup();
    lastLine.textContent = iso
      ? `Last backup: ${new Date(iso).toLocaleDateString('en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' })}`
      : "You haven't made a backup yet.";
  }

  // ----- Save -----
  const saveMsg = h('p', { class: 'muted', role: 'status' });
  const saveErr = h('p', { class: 'error', role: 'alert' });
  const saveArea = h('div');
  const prepareBtn = h('button', { type: 'button', class: 'primary', onclick: prepare },
    'Prepare backup');

  async function prepare() {
    saveErr.textContent = '';
    saveArea.replaceChildren();
    prepareBtn.disabled = true;
    saveMsg.textContent = 'Preparing…';
    try {
      const { file, counts } = await createBackup();
      saveMsg.textContent =
        `Ready: ${counts.devices} devices, ${counts.repairs} repairs, ${counts.photos} photos (${megabytes(file.size)} MB).`;
      saveArea.replaceChildren(
        h('button', { type: 'button', class: 'primary', onclick: () => save(file) },
          'Save backup file'));
    } catch (err) {
      saveMsg.textContent = '';
      saveErr.textContent = err.message;
    } finally {
      prepareBtn.disabled = false;
    }
  }

  async function save(file) {
    saveErr.textContent = '';
    try {
      const result = await saveFile(file);
      if (result === 'cancelled') return;
      setLastBackup();
      showLast();
      saveMsg.textContent = result === 'shared'
        ? 'Shared. Make sure you saved the file somewhere safe, like Files.'
        : 'Your browser saved the file. Look in your Downloads folder.';
    } catch (err) {
      saveErr.textContent = err.message;
    }
  }

  // ----- Restore -----
  const restoreMsg = h('p', { class: 'muted', role: 'status' });
  const restoreErr = h('p', { class: 'error', role: 'alert' });

  async function onRestorePick(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    restoreErr.textContent = '';
    restoreMsg.replaceChildren('Reading the backup…');
    try {
      const backup = await readBackupFile(file);
      const c = backup.counts;
      const ok = confirm(
        `This backup has ${c.devices} devices, ${c.repairs} repairs and ${c.photos} photos.\n\n` +
        `Restoring replaces EVERYTHING currently in the app. This can't be undone. Continue?`);
      if (!ok) {
        restoreMsg.replaceChildren('Restore cancelled. Nothing was changed.');
        return;
      }
      await applyBackup(backup);
      restoreMsg.replaceChildren(
        `Restored ${c.devices} devices, ${c.repairs} repairs and ${c.photos} photos. `,
        h('a', { href: '#/' }, 'Go to my devices'));
    } catch (err) {
      restoreMsg.replaceChildren();
      restoreErr.textContent = err.message;
    }
  }

  const picker = h('input', {
    type: 'file', accept: 'application/json,.json',
    class: 'visually-hidden', onchange: onRestorePick,
  });

  showLast();
  root.append(
    h('h2', { class: 'screen-title' }, 'Backup'),
    h('p', {}, 'Your devices, repairs and photos live only inside this app on this device. ' +
      'If the browser data is cleared, they are gone. A backup file keeps them safe.'),
    lastLine,
    h('h3', { class: 'section-title' }, 'Save a backup'),
    h('div', { class: 'actions' }, prepareBtn),
    saveMsg, saveErr, saveArea,
    h('h3', { class: 'section-title' }, 'Restore from a backup'),
    h('p', { class: 'muted' }, 'This replaces everything in the app with the contents of the file.'),
    h('label', { class: 'button secondary' }, 'Choose backup file', picker),
    restoreMsg, restoreErr);
}
