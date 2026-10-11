import { MAX_ENTRY_LENGTH } from './journal.js';

export const JOURNAL_STORAGE_KEY = 'mini-journal.entries.v1';
export const PREFERENCES_STORAGE_KEY = 'mini-journal.preferences.v1';
export const DEFAULT_PREFERENCES = Object.freeze({ appearance: 'system', textSize: 'medium' });

export function normalizePreferences(value) {
  return {
    appearance: ['light', 'dark', 'system'].includes(value?.appearance)
      ? value.appearance : DEFAULT_PREFERENCES.appearance,
    textSize: ['small', 'medium', 'large'].includes(value?.textSize)
      ? value.textSize : DEFAULT_PREFERENCES.textSize,
  };
}

export function createPreferenceStorage({ storageProvider = () => window.localStorage } = {}) {
  return {
    loadPreferences() {
      try {
        const raw = storageProvider().getItem(PREFERENCES_STORAGE_KEY);
        let value;
        try {
          value = JSON.parse(raw);
        } catch {
          // Preferences can safely fall back; journal data has stricter safeguards below.
          value = null;
        }
        return { preferences: normalizePreferences(value), ok: true };
      } catch {
        return { preferences: { ...DEFAULT_PREFERENCES }, ok: false };
      }
    },
    savePreferences(preferences) {
      try {
        storageProvider().setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
  };
}

const STORAGE_ERROR_MESSAGES = {
  blocked: 'Journal storage is blocked to protect unreadable saved data.',
  invalid: 'Saved journal data is invalid.',
  malformed: 'Saved journal data could not be parsed.',
  read: 'Journal storage could not be read.',
  serialize: 'Journal entries could not be serialized.',
  write: 'Journal entries could not be saved.',
  conflict: 'Your journal changed in another tab. This change was not saved, and your writing is still here. Copy any unsaved writing, then reload to see the latest entries before trying again.',
  unsupported: 'This browser cannot safely coordinate journal changes between tabs. Your writing is still here. Use a current browser over HTTPS to save entries.',
};

export class JournalStorageError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'JournalStorageError';
    this.code = code;
  }
}

function createStorageError(code, cause) {
  return new JournalStorageError(code, STORAGE_ERROR_MESSAGES[code], { cause });
}

function isValidEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;

  const keys = Object.keys(entry).sort();
  if (keys.join(',') !== 'content,createdAt,id') return false;

  return typeof entry.id === 'string'
    && entry.id.length > 0
    && typeof entry.content === 'string'
    && entry.content.trim().length > 0
    && entry.content.length <= MAX_ENTRY_LENGTH
    && typeof entry.createdAt === 'string'
    && Number.isFinite(Date.parse(entry.createdAt));
}

export function validateStoredEntries(value) {
  if (!Array.isArray(value) || !value.every(isValidEntry)) {
    throw createStorageError('invalid');
  }

  const ids = new Set(value.map(({ id }) => id));
  if (ids.size !== value.length) {
    throw createStorageError('invalid');
  }

  return value.map(({ id, content, createdAt }) => ({ id, content, createdAt }));
}

export function createJournalStorage({
  key = JOURNAL_STORAGE_KEY,
  storageProvider = () => window.localStorage,
  parse = JSON.parse,
  serialize = JSON.stringify,
  lockProvider = () => globalThis.navigator?.locks,
} = {}) {
  let writesBlocked = false;
  let savedSnapshot;

  function blockWritesAndThrow(error) {
    writesBlocked = true;
    throw error;
  }

  function loadEntries() {
    let rawValue;

    try {
      rawValue = storageProvider().getItem(key);
    } catch (error) {
      blockWritesAndThrow(createStorageError('read', error));
    }

    if (rawValue === null) {
      writesBlocked = false;
      savedSnapshot = rawValue;
      return [];
    }

    let parsedValue;
    try {
      parsedValue = parse(rawValue);
    } catch (error) {
      blockWritesAndThrow(createStorageError('malformed', error));
    }

    try {
      const entries = validateStoredEntries(parsedValue);
      writesBlocked = false;
      savedSnapshot = rawValue;
      return entries;
    } catch (error) {
      blockWritesAndThrow(
        error instanceof JournalStorageError ? error : createStorageError('invalid', error),
      );
    }
  }

  async function saveEntries(entries) {
    if (writesBlocked) throw createStorageError('blocked');

    const validEntries = validateStoredEntries(entries);
    let serializedEntries;

    try {
      serializedEntries = serialize(validEntries);
    } catch (error) {
      throw createStorageError('serialize', error);
    }

    const locks = lockProvider();
    if (!locks?.request) throw createStorageError('unsupported');
    // Capture the snapshot before waiting: two saves from the same stale state
    // must not both commit, even if they originate in the same tab.
    const expectedSnapshot = savedSnapshot;
    try {
      await locks.request(key, { mode: 'exclusive' }, () => {
        const storage = storageProvider();
        if (expectedSnapshot === undefined || storage.getItem(key) !== expectedSnapshot) {
          throw createStorageError('conflict');
        }
        storage.setItem(key, serializedEntries);
        savedSnapshot = serializedEntries;
      });
    } catch (error) {
      if (error instanceof JournalStorageError) throw error;
      throw createStorageError('write', error);
    }
  }

  return { loadEntries, saveEntries };
}
