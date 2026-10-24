import * as db from './db.js';

const status = document.getElementById('status');
const logEl = document.getElementById('log');

const installed =
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

status.textContent = installed
  ? 'Running as an installed app.'
  : 'Running in the browser. Add me to your Home Screen!';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .catch(err => console.error('Service worker failed:', err));
}

document.getElementById('test-btn').addEventListener('click', runSelfTest);

async function runSelfTest() {
  const lines = [];
  const check = (label, ok) => lines.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  try {
    const id = await db.addDevice({
      name: 'Test Nokia 3310', type: 'Phone', status: 'Broken',
      purchasePrice: '25', estimatedValue: '150',
    });
    check('add device', Number.isInteger(id));

    const device = await db.getDevice(id);
    check('read device back',
      device && device.name === 'Test Nokia 3310' && device.purchasePrice === 25);

    await db.addRepair(id, { fault: 'Dead battery', workDone: 'Replaced battery', cost: '12' });
    const repairs = await db.getRepairs(id);
    check('add and read repair', repairs.length === 1 && repairs[0].cost === 12);

    let rejected = false;
    try {
      await db.addDevice({ name: '   ', type: 'Phone', status: 'Working' });
    } catch { rejected = true; }
    check('empty name is rejected', rejected);

    await db.deleteDevice(id);
    check('delete device', (await db.getDevice(id)) === undefined);
    check('its repairs are deleted too', (await db.getRepairs(id)).length === 0);
  } catch (err) {
    lines.push('ERROR  ' + err.message);
  }
  logEl.textContent = lines.join('\n');
}
