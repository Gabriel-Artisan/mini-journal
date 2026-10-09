import './styles.css';
import {
  addEntry,
  createEntry,
  deleteEntry,
  JournalValidationError,
  sortEntriesNewestFirst,
  updateEntry,
} from './journal.js';
import { createJournalStorage, JournalStorageError } from './storage.js';
import { initJournalUi } from './ui.js';
import { initPreferences } from './preferences.js';

initPreferences();

let entries = [];
let startupStorageError = '';
const journalStorage = createJournalStorage();

try {
  entries = sortEntriesNewestFirst(journalStorage.loadEntries());
} catch (error) {
  if (!(error instanceof JournalStorageError)) console.error(error);
  startupStorageError = 'We couldn’t load your saved journal. Your stored data was left unchanged, and new changes are blocked to protect it. Resolve the browser storage issue and reload to try again.';
}

function runJournalAction(action, storageFailureMessage) {
  try {
    const nextEntries = action();
    journalStorage.saveEntries(nextEntries);
    entries = nextEntries;
    return { ok: true, entries };
  } catch (error) {
    if (error instanceof JournalStorageError) {
      return { ok: false, message: storageFailureMessage };
    }

    if (error instanceof JournalValidationError) {
      return { ok: false, message: error.message };
    }

    console.error(error);

    return {
      ok: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}

const ui = initJournalUi({
  onCreate(content) {
    return runJournalAction(
      () => addEntry(entries, createEntry(content)),
      'We couldn’t save this entry in your browser. Your writing is still here. Resolve the storage issue and try again.',
    );
  },
  onUpdate(id, content) {
    return runJournalAction(
      () => updateEntry(entries, id, content),
      'We couldn’t save these edits in your browser. Your changes are still here. Resolve the storage issue and try again.',
    );
  },
  onDelete(id) {
    return runJournalAction(
      () => deleteEntry(entries, id),
      'We couldn’t delete this entry because the change could not be saved. The entry is still in your journal. Resolve the storage issue and try again.',
    );
  },
  onDeleteAll() {
    return runJournalAction(
      () => [],
      'We couldn’t delete your entries because the change could not be saved. Your journal was left unchanged. Resolve the storage issue and try again.',
    );
  },
});

ui.renderEntries(entries);
if (startupStorageError) ui.showStorageError(startupStorageError);
