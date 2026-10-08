import { MAX_ENTRY_LENGTH } from './journal.js';

const HOME_ENTRY_LIMIT = 3;

function formatCharacterCount(count) {
  return `${count.toLocaleString('en-US')} / ${MAX_ENTRY_LENGTH.toLocaleString('en-US')}`;
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

function formatEntryDate(timestamp) {
  const date = new Date(timestamp);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${datePart} · ${timePart}`;
}

function initMobileNavigation(root) {
  const toggle = root.querySelector('.menu-toggle');
  const navigation = root.querySelector('#primary-navigation');
  if (!toggle || !navigation) return { closeMenu() {} };

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

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.hasAttribute('data-open')) {
      closeMenu({ restoreFocus: true });
    }
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) closeMenu();
  });

  window.matchMedia('(min-width: 721px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  return { closeMenu };
}

function cloneIcon(root, templateId) {
  const template = root.querySelector(templateId);
  return template?.content.cloneNode(true) ?? document.createDocumentFragment();
}

function createActionButton(root, { action, id, label, iconTemplate, destructive = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `entry-card__action${destructive ? ' entry-card__action--delete' : ''}`;
  button.dataset.action = action;
  button.dataset.entryId = id;
  button.append(cloneIcon(root, iconTemplate), document.createTextNode(label));
  return button;
}

function createEmptyState(message) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';

  const heading = document.createElement('h3');
  heading.textContent = 'A blank page, ready when you are.';

  const copy = document.createElement('p');
  copy.textContent = message;

  emptyState.append(heading, copy);
  return emptyState;
}

export function initJournalUi({ root = document, onCreate, onUpdate, onDelete }) {
  const composer = root.querySelector('#journal-entry');
  const composerCount = root.querySelector('#character-count');
  const composerFeedback = root.querySelector('#composer-feedback');
  const saveEntryButton = root.querySelector('#save-entry');
  const recentEntriesList = root.querySelector('#recent-entries-list');
  const allEntriesList = root.querySelector('#all-entries-list');
  const appFeedback = root.querySelector('#app-feedback');
  const deleteDialog = root.querySelector('#delete-dialog');
  const cancelDeleteButton = root.querySelector('#cancel-delete');
  const confirmDeleteButton = root.querySelector('#confirm-delete');
  const navigation = initMobileNavigation(root);

  let entries = [];
  let activeView = 'home';
  let editingEntryId = null;
  let pendingDeleteId = null;
  let deleteTrigger = null;

  function announce(message) {
    appFeedback.textContent = '';
    requestAnimationFrame(() => {
      appFeedback.textContent = message;
    });
  }

  function setComposerFeedback(message = '') {
    composerFeedback.textContent = message;
    composer.toggleAttribute('aria-invalid', Boolean(message));
  }

  function updateComposerCount() {
    composerCount.textContent = formatCharacterCount(composer.value.length);
  }

  function findEntry(id) {
    return entries.find((entry) => entry.id === id);
  }

  function createEntryCard(entry, context) {
    const card = document.createElement('article');
    card.className = 'entry-card';
    card.dataset.entryId = entry.id;

    const header = document.createElement('header');
    header.className = 'entry-card__header';

    const timestamp = document.createElement('time');
    timestamp.dateTime = entry.createdAt;
    timestamp.textContent = formatEntryDate(entry.createdAt);

    const actions = document.createElement('div');
    actions.className = 'entry-card__actions';
    actions.append(
      createActionButton(root, {
        action: 'edit',
        id: entry.id,
        label: 'Edit',
        iconTemplate: '#edit-icon-template',
      }),
      createActionButton(root, {
        action: 'delete',
        id: entry.id,
        label: 'Delete',
        iconTemplate: '#delete-icon-template',
        destructive: true,
      }),
    );
    header.append(timestamp);
    if (editingEntryId !== entry.id) header.append(actions);

    if (editingEntryId === entry.id) {
      card.classList.add('entry-card--editing');

      const editRegion = document.createElement('div');
      editRegion.className = 'entry-edit';

      const label = document.createElement('label');
      label.className = 'sr-only';
      label.htmlFor = `${context}-edit-entry-${entry.id}`;
      label.textContent = 'Edit journal entry';

      const textarea = document.createElement('textarea');
      textarea.id = `${context}-edit-entry-${entry.id}`;
      textarea.className = 'entry-edit__textarea';
      textarea.dataset.entryEdit = entry.id;
      textarea.maxLength = MAX_ENTRY_LENGTH;
      textarea.value = entry.content;
      textarea.setAttribute('aria-describedby', `${context}-edit-count-${entry.id} ${context}-edit-feedback-${entry.id}`);

      const editMeta = document.createElement('div');
      editMeta.className = 'entry-edit__meta';

      const editFeedback = document.createElement('p');
      editFeedback.id = `${context}-edit-feedback-${entry.id}`;
      editFeedback.className = 'form-feedback entry-edit__feedback';
      editFeedback.setAttribute('role', 'alert');

      const count = document.createElement('output');
      count.id = `${context}-edit-count-${entry.id}`;
      count.dataset.editCount = entry.id;
      count.htmlFor = textarea.id;
      count.textContent = formatCharacterCount(entry.content.length);
      editMeta.append(editFeedback, count);

      const editActions = document.createElement('div');
      editActions.className = 'entry-edit__actions';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'secondary-button';
      cancelButton.dataset.action = 'cancel-edit';
      cancelButton.dataset.entryId = entry.id;
      cancelButton.textContent = 'Cancel';

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'save-button save-button--compact';
      saveButton.dataset.action = 'save-edit';
      saveButton.dataset.entryId = entry.id;
      saveButton.textContent = 'Save changes';

      editActions.append(cancelButton, saveButton);
      editRegion.append(label, textarea, editMeta, editActions);
      card.append(header, editRegion);
      return card;
    }

    const content = document.createElement('p');
    content.className = 'entry-card__content';
    content.textContent = entry.content;
    card.append(header, content);
    return card;
  }

  function renderList(container, visibleEntries, emptyMessage, context) {
    container.replaceChildren();

    if (visibleEntries.length === 0) {
      container.append(createEmptyState(emptyMessage));
      return;
    }

    const fragment = document.createDocumentFragment();
    visibleEntries.forEach((entry) => fragment.append(createEntryCard(entry, context)));
    container.append(fragment);
  }

  function renderEntries(nextEntries) {
    entries = [...nextEntries];
    renderList(
      recentEntriesList,
      entries.slice(0, HOME_ENTRY_LIMIT),
      'Your recent reflections will appear here.',
      'recent',
    );
    renderList(
      allEntriesList,
      entries,
      'Write your first entry from Home, then return here to see your journal history.',
      'all',
    );
  }

  function focusEditingTextarea(id) {
    requestAnimationFrame(() => {
      const activeViewElement = root.querySelector(`#${activeView}-view`);
      const textarea = activeViewElement?.querySelector(`[data-entry-edit="${CSS.escape(id)}"]`);
      textarea?.focus();
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }

  function setActiveView(view, { moveFocus = true } = {}) {
    activeView = view;
    root.querySelector('#home-view').hidden = view !== 'home';
    root.querySelector('#all-entries-view').hidden = view !== 'all-entries';

    root.querySelectorAll('.primary-nav [data-view]').forEach((link) => {
      const isActive = link.dataset.view === view;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    navigation.closeMenu();
    if (moveFocus) {
      const heading = root.querySelector(view === 'home' ? '#composer-heading' : '#all-entries-heading');
      heading?.focus();
    }
  }

  function closeDeleteDialog({ restoreFocus = false } = {}) {
    if (deleteDialog.open) deleteDialog.close();
    pendingDeleteId = null;
    if (restoreFocus && deleteTrigger?.isConnected) deleteTrigger.focus();
    deleteTrigger = null;
  }

  function openDeleteDialog(id, trigger) {
    pendingDeleteId = id;
    deleteTrigger = trigger;
    deleteDialog.showModal();
  }

  function cancelDeletion() {
    closeDeleteDialog({ restoreFocus: true });
    announce('Deletion cancelled. The entry was not changed.');
  }

  function handleEntryListClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const { action, entryId } = button.dataset;
    const entry = findEntry(entryId);
    if (!entry) return;

    if (action === 'edit') {
      editingEntryId = entryId;
      renderEntries(entries);
      focusEditingTextarea(entryId);
      return;
    }

    if (action === 'cancel-edit') {
      editingEntryId = null;
      renderEntries(entries);
      announce('Editing cancelled. No changes were saved.');
      requestAnimationFrame(() => {
        const activeViewElement = root.querySelector(`#${activeView}-view`);
        activeViewElement?.querySelector(`[data-action="edit"][data-entry-id="${CSS.escape(entryId)}"]`)?.focus();
      });
      return;
    }

    if (action === 'save-edit') {
      const card = button.closest('.entry-card');
      const textarea = card.querySelector('[data-entry-edit]');
      const feedback = card.querySelector('.entry-edit__feedback');
      const result = onUpdate(entryId, textarea.value);

      if (!result.ok) {
        feedback.textContent = result.message;
        textarea.setAttribute('aria-invalid', 'true');
        textarea.focus();
        return;
      }

      editingEntryId = null;
      renderEntries(result.entries);
      announce('Entry updated.');
      requestAnimationFrame(() => {
        const activeViewElement = root.querySelector(`#${activeView}-view`);
        activeViewElement?.querySelector(`[data-action="edit"][data-entry-id="${CSS.escape(entryId)}"]`)?.focus();
      });
      return;
    }

    if (action === 'delete') openDeleteDialog(entryId, button);
  }

  function handleEntryListInput(event) {
    const textarea = event.target.closest('[data-entry-edit]');
    if (!textarea) return;

    const card = textarea.closest('.entry-card');
    const count = card.querySelector('[data-edit-count]');
    const feedback = card.querySelector('.entry-edit__feedback');
    count.textContent = formatCharacterCount(textarea.value.length);
    feedback.textContent = '';
    textarea.removeAttribute('aria-invalid');
  }

  setCurrentDate(root);
  updateComposerCount();
  setActiveView('home', { moveFocus: false });

  composer.addEventListener('input', () => {
    updateComposerCount();
    setComposerFeedback();
  });

  saveEntryButton.addEventListener('click', () => {
    const result = onCreate(composer.value);
    if (!result.ok) {
      setComposerFeedback(result.message);
      composer.focus();
      return;
    }

    editingEntryId = null;
    composer.value = '';
    setComposerFeedback();
    updateComposerCount();
    renderEntries(result.entries);
    announce('Entry saved.');
    composer.focus();
  });

  [recentEntriesList, allEntriesList].forEach((list) => {
    list.addEventListener('click', handleEntryListClick);
    list.addEventListener('input', handleEntryListInput);
  });

  root.querySelectorAll('[data-view]').forEach((control) => {
    control.addEventListener('click', (event) => {
      event.preventDefault();
      setActiveView(control.dataset.view);
    });
  });

  cancelDeleteButton.addEventListener('click', () => {
    cancelDeletion();
  });

  deleteDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancelDeletion();
  });

  deleteDialog.addEventListener('click', (event) => {
    if (event.target !== deleteDialog) return;

    const bounds = deleteDialog.getBoundingClientRect();
    const clickedInside = event.clientX >= bounds.left
      && event.clientX <= bounds.right
      && event.clientY >= bounds.top
      && event.clientY <= bounds.bottom;

    if (!clickedInside) cancelDeletion();
  });

  confirmDeleteButton.addEventListener('click', () => {
    if (!pendingDeleteId) return;

    const result = onDelete(pendingDeleteId);
    if (!result.ok) {
      closeDeleteDialog();
      announce(result.message);
      return;
    }

    const deletedId = pendingDeleteId;
    closeDeleteDialog();
    if (editingEntryId === deletedId) editingEntryId = null;
    renderEntries(result.entries);
    announce('Entry deleted.');
    requestAnimationFrame(() => {
      const heading = root.querySelector(activeView === 'home' ? '#recent-entries-heading' : '#all-entries-heading');
      heading?.focus();
    });
  });

  return { renderEntries };
}
