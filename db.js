// db.js: all database code lives here.
// The rest of the app never touches IndexedDB directly.

const DB_NAME = 'repair-bench';
const DB_VERSION = 1;

export const TYPES = ['Phone', 'Tablet', 'Watch', 'Computer', 'Console', 'Other'];
export const STATUSES = ['Working', 'Broken', 'In repair', 'For parts', 'Sold'];

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('devices', { keyPath: 'id', autoIncrement: true });
        const repairs = db.createObjectStore('repairs', { keyPath: 'id', autoIncrement: true });
        repairs.createIndex('deviceId', 'deviceId');
        const photos = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        photos.createIndex('deviceId', 'deviceId');
        photos.createIndex('repairId', 'repairId');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

// Turns an IndexedDB request into a Promise so we can use await.
function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(name, mode = 'readonly') {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

const text = v => String(v ?? '').trim();

function numberOrNull(v, label) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a number, 0 or more`);
  }
  return n;
}

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function cleanDevice(d) {
  const name = text(d.name);
  if (!name) throw new Error('Device name is required');
  if (!TYPES.includes(d.type)) throw new Error('Pick a valid device type');
  if (!STATUSES.includes(d.status)) throw new Error('Pick a valid status');
  const year = numberOrNull(d.releaseYear, 'Release year');
  if (year !== null &&
      (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) {
    throw new Error('Release year looks wrong');
  }
  return {
    name, type: d.type, status: d.status,
    brand: text(d.brand), model: text(d.model),
    modelNumber: text(d.modelNumber), serialNumber: text(d.serialNumber),
    condition: text(d.condition), releaseYear: year,
    purchaseDate: text(d.purchaseDate),
    purchasePrice: numberOrNull(d.purchasePrice, 'Purchase price'),
    estimatedValue: numberOrNull(d.estimatedValue, 'Estimated value'),
    notes: text(d.notes),
  };
}

function cleanRepair(r) {
  const fault = text(r.fault);
  if (!fault) throw new Error('Describe the fault');
  const date = text(r.date) || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must look like 2026-10-24');
  }
  return {
    fault, date,
    workDone: text(r.workDone), partsUsed: text(r.partsUsed),
    cost: numberOrNull(r.cost, 'Cost') ?? 0,
  };
}

// ---------- Devices ----------

export async function addDevice(data) {
  const now = Date.now();
  const record = { ...cleanDevice(data), createdAt: now, updatedAt: now };
  const store = await getStore('devices', 'readwrite');
  return wrap(store.add(record));
}

export async function updateDevice(id, data) {
  const record = cleanDevice(data);
  const store = await getStore('devices', 'readwrite');
  const existing = await wrap(store.get(id));
  if (!existing) throw new Error('Device not found');
  return wrap(store.put({ ...existing, ...record, id, updatedAt: Date.now() }));
}

export async function getDevice(id) {
  const store = await getStore('devices');
  return wrap(store.get(id));
}

export async function getDevices() {
  const store = await getStore('devices');
  const all = await wrap(store.getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Deletes the device AND its repairs and photos in one transaction.
export async function deleteDevice(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['devices', 'repairs', 'photos'], 'readwrite');
    tx.objectStore('devices').delete(id);
    for (const name of ['repairs', 'photos']) {
      const store = tx.objectStore(name);
      const req = store.index('deviceId').openKeyCursor(IDBKeyRange.only(id));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---------- Repairs ----------

export async function addRepair(deviceId, data) {
  const record = { ...cleanRepair(data), deviceId, createdAt: Date.now() };
  if (!(await getDevice(deviceId))) throw new Error('Device not found');
  const store = await getStore('repairs', 'readwrite');
  return wrap(store.add(record));
}

export async function getRepairs(deviceId) {
  const store = await getStore('repairs');
  const list = await wrap(store.index('deviceId').getAll(IDBKeyRange.only(deviceId)));
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function deleteRepair(id) {
  const store = await getStore('repairs', 'readwrite');
  return wrap(store.delete(id));
}

export async function getRepair(id) {
  const store = await getStore('repairs');
  return wrap(store.get(id));
}

export async function updateRepair(id, data) {
  const record = cleanRepair(data);
  const store = await getStore('repairs', 'readwrite');
  const existing = await wrap(store.get(id));
  if (!existing) throw new Error('Repair not found');
  return wrap(store.put({ ...existing, ...record, id }));
}

// ---------- Photos ----------

export async function getPhotos(deviceId) {
  const store = await getStore('photos');
  const list = await wrap(store.index('deviceId').getAll(IDBKeyRange.only(deviceId)));
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

// Saves a photo. If the device has no cover picture yet, this one becomes the cover.
export async function addPhoto(deviceId, blob, thumb, source = null) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices', 'photos'], 'readwrite');
    const devices = tx.objectStore('devices');
    let photoId;
    const devReq = devices.get(deviceId);
    devReq.onsuccess = () => {
      const device = devReq.result;
      if (!device) { tx.abort(); return; }
      const addReq = tx.objectStore('photos').add({
        deviceId, repairId: null, blob, thumb, source, createdAt: Date.now(),
      });
      addReq.onsuccess = () => {
        photoId = addReq.result;
        if (!device.coverPhotoId) {
          device.coverPhotoId = photoId;
          device.coverThumb = thumb;
          devices.put(device);
        }
      };
    };
    tx.oncomplete = () => resolve(photoId);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Device not found'));
  });
}

export async function setCoverPhoto(photoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices', 'photos'], 'readwrite');
    const photoReq = tx.objectStore('photos').get(photoId);
    photoReq.onsuccess = () => {
      const photo = photoReq.result;
      if (!photo) { tx.abort(); return; }
      const devices = tx.objectStore('devices');
      const devReq = devices.get(photo.deviceId);
      devReq.onsuccess = () => {
        const device = devReq.result;
        if (!device) { tx.abort(); return; }
        device.coverPhotoId = photoId;
        device.coverThumb = photo.thumb;
        devices.put(device);
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Photo not found'));
  });
}

// Deletes one photo. If it was the cover, the newest remaining photo takes over.
export async function deletePhoto(photoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices', 'photos'], 'readwrite');
    const photos = tx.objectStore('photos');
    const photoReq = photos.get(photoId);
    photoReq.onsuccess = () => {
      const photo = photoReq.result;
      if (!photo) return;
      photos.delete(photoId);
      const devices = tx.objectStore('devices');
      const devReq = devices.get(photo.deviceId);
      devReq.onsuccess = () => {
        const device = devReq.result;
        if (!device || device.coverPhotoId !== photoId) return;
        const listReq = photos.index('deviceId').getAll(IDBKeyRange.only(photo.deviceId));
        listReq.onsuccess = () => {
          const rest = listReq.result
            .filter(p => p.id !== photoId)
            .sort((a, b) => b.createdAt - a.createdAt);
          device.coverPhotoId = rest[0]?.id ?? null;
          device.coverThumb = rest[0]?.thumb ?? null;
          devices.put(device);
        };
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---------- Backup support ----------

export async function getAllRecords() {
  const db = await openDb();
  const tx = db.transaction(['devices', 'repairs', 'photos'], 'readonly');
  const [devices, repairs, photos] = await Promise.all([
    wrap(tx.objectStore('devices').getAll()),
    wrap(tx.objectStore('repairs').getAll()),
    wrap(tx.objectStore('photos').getAll()),
  ]);
  return { devices, repairs, photos };
}

// Replaces everything in the database with these records, all or nothing.
export async function replaceAllRecords({ devices, repairs, photos }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['devices', 'repairs', 'photos'], 'readwrite');
    for (const [name, records] of Object.entries({ devices, repairs, photos })) {
      const store = tx.objectStore(name);
      store.clear();
      for (const record of records) store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
