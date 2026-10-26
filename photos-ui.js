// photos-ui.js: the photo gallery on a device page: add, view, set cover, delete.
import { h, blobUrl } from './util.js';
import {
  getDevice, getPhotos, addPhoto, deletePhoto, setCoverPhoto,
} from './db.js';
import { makePhotoPair } from './images.js';
import { openFinder } from './finder.js';

export async function photoSection(deviceId) {
  const grid = h('div', { class: 'photo-grid' });
  const note = h('p', { class: 'muted' });
  const errorBox = h('p', { class: 'error', role: 'alert' });

  async function onPick(e) {
    const files = [...e.target.files];
    e.target.value = '';
    errorBox.textContent = '';
    for (const file of files) {
      try {
        const { blob, thumb } = await makePhotoPair(file);
        await addPhoto(deviceId, blob, thumb);
      } catch (err) {
        errorBox.textContent = err.message;
      }
    }
    await draw();
  }

  const picker = h('input', {
    type: 'file', accept: 'image/*', multiple: true,
    class: 'visually-hidden', onchange: onPick,
  });

  function tile(photo, isCover) {
    return h('button', {
      type: 'button', class: 'photo-tile', 'aria-label': 'Open photo',
      onclick: () => openViewer(photo, isCover),
    },
      h('img', { src: blobUrl(photo.thumb), alt: '' }),
      isCover && h('span', { class: 'cover-tag' }, 'Cover'));
  }

  function openViewer(photo, isCover) {
    async function run(action) {
      try {
        await action();
        dialog.close();
        await draw();
      } catch (err) {
        errorBox.textContent = err.message;
        dialog.close();
      }
    }
    const dialog = h('dialog', { class: 'viewer' },
      h('img', { src: blobUrl(photo.blob), alt: 'Device photo' }),
      photo.source && h('p', { class: 'muted' }, `Source: ${photo.source}`),
      h('div', { class: 'actions' },
        !isCover && h('button', {
          type: 'button', class: 'primary',
          onclick: () => run(() => setCoverPhoto(photo.id)),
        }, 'Use as cover'),
        h('button', { type: 'button', class: 'secondary', onclick: () => dialog.close() }, 'Close')),
      h('button', {
        type: 'button', class: 'danger',
        onclick: () => {
          if (confirm('Delete this photo? This can\'t be undone.')) {
            run(() => deletePhoto(photo.id));
          }
        },
      }, 'Delete photo'));
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }

  async function draw() {
    const [device, photos] = await Promise.all([getDevice(deviceId), getPhotos(deviceId)]);
    grid.replaceChildren(...photos.map(p => tile(p, device.coverPhotoId === p.id)));
    note.textContent = photos.length === 0
      ? 'No photos yet. Add one to show this device in your list.'
      : '';
  }

  async function findPicture() {
    const device = await getDevice(deviceId);
    openFinder({ deviceId, term: device.name, onSaved: draw });
  }

  await draw();
  return h('section', { class: 'photos' },
    h('h3', { class: 'section-title' }, 'Photos'),
    grid, note,
    h('div', { class: 'actions' },
      h('label', { class: 'button secondary' }, 'Add photos', picker),
      h('button', { type: 'button', class: 'secondary', onclick: findPicture }, 'Find picture')),
    errorBox);
}
