// backup.js: turns all your data (photos included) into one file, and back again.
import { TYPES, STATUSES, getAllRecords, replaceAllRecords } from './db.js';

const FORMAT = 'repair-bench-backup';
const VERSION = 1;
const MAX_FILE_MB = 500;

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

async function dataUrlToBlob(url) {
  return (await fetch(url)).blob();
}

function localDate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Builds the backup file from everything in the database.
export async function createBackup() {
  const { devices, repairs, photos } = await getAllRecords();
  const data = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    devices: await Promise.all(devices.map(async d => ({
      ...d,
      coverThumb: d.coverThumb ? await blobToDataUrl(d.coverThumb) : null,
    }))),
    repairs,
    photos: await Promise.all(photos.map(async p => ({
      ...p,
      blob: await blobToDataUrl(p.blob),
      thumb: await blobToDataUrl(p.thumb),
    }))),
  };
  const file = new File([JSON.stringify(data)], `repair-bench-backup-${localDate()}.json`,
    { type: 'application/json' });
  return {
    file,
    counts: { devices: devices.length, repairs: repairs.length, photos: photos.length },
  };
}

const isDataImage = v => typeof v === 'string' && v.startsWith('data:image/');

function checkBackup(data) {
  if (!data || data.format !== FORMAT) {
    throw new Error("That file isn't a Repair Bench backup.");
  }
  if (data.version !== VERSION) {
    throw new Error(`This backup is version ${data.version}, but this app reads version ${VERSION}.`);
  }
  for (const key of ['devices', 'repairs', 'photos']) {
    if (!Array.isArray(data[key])) throw new Error(`The backup is missing its ${key} list.`);
  }
  const deviceIds = new Set();
  for (const d of data.devices) {
    const ok = d && Number.isInteger(d.id) && typeof d.name === 'string' &&
      TYPES.includes(d.type) && STATUSES.includes(d.status) &&
      (d.coverThumb == null || isDataImage(d.coverThumb));
    if (!ok) throw new Error('The backup has a damaged device entry.');
    deviceIds.add(d.id);
  }
  for (const r of data.repairs) {
    const ok = r && Number.isInteger(r.id) && deviceIds.has(r.deviceId) &&
      typeof r.fault === 'string' && typeof r.date === 'string' && typeof r.cost === 'number';
    if (!ok) throw new Error('The backup has a damaged repair entry.');
  }
  for (const p of data.photos) {
    const ok = p && Number.isInteger(p.id) && deviceIds.has(p.deviceId) &&
      isDataImage(p.blob) && isDataImage(p.thumb);
    if (!ok) throw new Error('The backup has a damaged photo entry.');
  }
}

// Reads and checks a backup file. Nothing is changed yet.
export async function readBackupFile(file) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`That file is bigger than ${MAX_FILE_MB} MB.`);
  }
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a valid backup.");
  }
  checkBackup(data);
  return {
    devices: await Promise.all(data.devices.map(async d => ({
      ...d,
      coverThumb: d.coverThumb ? await dataUrlToBlob(d.coverThumb) : null,
    }))),
    repairs: data.repairs,
    photos: await Promise.all(data.photos.map(async p => ({
      ...p,
      blob: await dataUrlToBlob(p.blob),
      thumb: await dataUrlToBlob(p.thumb),
    }))),
    counts: {
      devices: data.devices.length,
      repairs: data.repairs.length,
      photos: data.photos.length,
    },
  };
}

// Replaces everything in the app with the backup, all or nothing.
export async function applyBackup({ devices, repairs, photos }) {
  await replaceAllRecords({ devices, repairs, photos });
}
