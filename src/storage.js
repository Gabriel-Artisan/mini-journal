import { MAX_ENTRY_LENGTH } from './journal.js';

export const JOURNAL_STORAGE_KEY = 'mini-journal.entries.v1';

const STORAGE_ERROR_MESSAGES = {
  blocked: 'Journal storage is blocked to protect unreadable saved data.',
  invalid: 'Saved journal data is invalid.',
  malformed: 'Saved journal data could not be parsed.',
  read: 'Journal storage could not be read.',
  serialize: 'Journal entries could not be serialized.',
  write: 'Journal entries could not be saved.',
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
} = {}) {
  let writesBlocked = false;

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
      return entries;
    } catch (error) {
      blockWritesAndThrow(
        error instanceof JournalStorageError ? error : createStorageError('invalid', error),
      );
    }
  }

  function saveEntries(entries) {
    if (writesBlocked) throw createStorageError('blocked');

    const validEntries = validateStoredEntries(entries);
    let serializedEntries;

    try {
      serializedEntries = serialize(validEntries);
    } catch (error) {
      throw createStorageError('serialize', error);
    }

    try {
      storageProvider().setItem(key, serializedEntries);
    } catch (error) {
      throw createStorageError('write', error);
    }
  }

  return { loadEntries, saveEntries };
}
