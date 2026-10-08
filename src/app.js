import './styles.css';
import {
  addEntry,
  createEntry,
  deleteEntry,
  JournalValidationError,
  updateEntry,
} from './journal.js';
import { initJournalUi } from './ui.js';

let entries = [];

function runJournalAction(action) {
  try {
    entries = action();
    return { ok: true, entries };
  } catch (error) {
    if (!(error instanceof JournalValidationError)) {
      console.error(error);
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
    };
  }
}

const ui = initJournalUi({
  onCreate(content) {
    return runJournalAction(() => addEntry(entries, createEntry(content)));
  },
  onUpdate(id, content) {
    return runJournalAction(() => updateEntry(entries, id, content));
  },
  onDelete(id) {
    return runJournalAction(() => deleteEntry(entries, id));
  },
});

ui.renderEntries(entries);
