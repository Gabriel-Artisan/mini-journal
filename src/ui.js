const CHARACTER_LIMIT = 1000;

function formatCharacterCount(count) {
  return `${count.toLocaleString('en-US')} / ${CHARACTER_LIMIT.toLocaleString('en-US')}`;
}

function formatLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function setCurrentDate(root) {
  const dateElement = root.querySelector('#current-date');
  if (!dateElement) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  dateElement.dateTime = formatLocalDateValue(today);
  dateElement.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(today);
}

function initCharacterCount(root) {
  const textarea = root.querySelector('#journal-entry');
  const count = root.querySelector('#character-count');
  if (!textarea || !count) return;

  const updateCount = () => {
    count.textContent = formatCharacterCount(textarea.value.length);
  };

  textarea.addEventListener('input', updateCount);
  updateCount();
}

function initMobileNavigation(root) {
  const toggle = root.querySelector('.menu-toggle');
  const navigation = root.querySelector('#primary-navigation');
  if (!toggle || !navigation) return;

  const closeMenu = ({ restoreFocus = false } = {}) => {
    navigation.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMenu();
      return;
    }

    navigation.setAttribute('data-open', '');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) closeMenu();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.hasAttribute('data-open')) {
      closeMenu({ restoreFocus: true });
    }
  });

  window.matchMedia('(min-width: 721px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
}

export function initHomeShell(root = document) {
  setCurrentDate(root);
  initCharacterCount(root);
  initMobileNavigation(root);
}
