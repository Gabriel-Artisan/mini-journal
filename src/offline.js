export async function prepareOffline() {
  const status = document.querySelector('#offline-status');
  status.hidden = false;
  status.textContent = 'Preparing this browser for offline use…';
  try {
    if (!navigator.serviceWorker) throw new Error('Service workers unavailable');
    const base = import.meta.env.BASE_URL;
    const registration = await navigator.serviceWorker.register(`${base}sw.js`, {
      scope: base,
      updateViaCache: 'none',
    });
    // Observe installation failure rather than leaving a permanent preparing message.
    if (!registration.active && registration.installing) {
      await new Promise((resolve, reject) => {
        const worker = registration.installing;
        const check = () => {
          if (worker.state === 'activated') resolve();
          else if (worker.state === 'redundant') reject(new Error('Offline installation failed'));
        };
        worker.addEventListener('statechange', check);
        check();
      });
    }
    await navigator.serviceWorker.ready;
    status.textContent = '';
    status.hidden = true;
  } catch {
    status.textContent = 'Offline use couldn’t be prepared. Reopen with an internet connection to try again.';
  }
}
