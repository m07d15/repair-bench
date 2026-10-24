const status = document.getElementById('status');

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
