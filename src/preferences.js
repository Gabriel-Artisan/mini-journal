import { createPreferenceStorage } from './storage.js';

// Run before journal rendering so the first application view uses the restored appearance.
export function initPreferences({ root = document, media = window.matchMedia('(prefers-color-scheme: dark)'), storage = createPreferenceStorage() } = {}) {
  const loaded = storage.loadPreferences();
  let preferences = loaded.preferences;
  const feedback = root.querySelector('#preferences-feedback');
  const retryButton = root.querySelector('#retry-preferences');

  function apply() {
    root.documentElement.dataset.theme = preferences.appearance === 'system'
      ? (media.matches ? 'dark' : 'light') : preferences.appearance;
    root.documentElement.dataset.textSize = preferences.textSize;
  }

  apply();
  media.addEventListener('change', () => {
    if (preferences.appearance === 'system') apply();
  });

  if (!loaded.ok) {
    feedback.textContent = 'We couldn’t read your preferences. Default settings are in use. Changes may not be remembered after you reload.';
  }

  function save() {
    const result = storage.savePreferences(preferences);
    feedback.textContent = result.ok ? ''
      : 'Your choices are applied for now, but couldn’t be saved in this browser. Retry saving; changes may be lost after reload.';
    retryButton.hidden = result.ok;
  }
  retryButton.addEventListener('click', () => {
    save();
    if (retryButton.hidden) root.querySelector('[data-preference]:checked').focus();
  });

  root.querySelectorAll('[data-preference]').forEach((input) => {
    input.checked = input.value === preferences[input.dataset.preference];
    input.addEventListener('change', () => {
      preferences = { ...preferences, [input.dataset.preference]: input.value };
      apply();
      save();
    });
  });
}
