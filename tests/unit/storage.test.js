import { describe, expect, it, vi } from 'vitest';
import { addEntry, createEntry, deleteEntry, updateEntry } from '../../src/journal.js';
import {
  createJournalStorage,
  JOURNAL_STORAGE_KEY,
  JournalStorageError,
  validateStoredEntries,
} from '../../src/storage.js';

function createMemoryStorage(initialValue = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((key, nextValue) => {
      expect(key).toBe(JOURNAL_STORAGE_KEY);
      value = nextValue;
    }),
    readValue: () => value,
  };
}

const storedEntry = {
  id: 'entry-1',
  content: 'A stored reflection',
  createdAt: '2026-10-08T14:30:00.000Z',
};

function expectStorageError(action, code) {
  try {
    action();
    throw new Error(`Expected storage error: ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(JournalStorageError);
    expect(error.code).toBe(code);
  }
}

describe('journal storage', () => {
  it('treats a missing journal key as an empty collection', () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ storageProvider: () => storage });

    expect(journalStorage.loadEntries()).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('serializes and restores valid journal entries', () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ storageProvider: () => storage });

    journalStorage.saveEntries([storedEntry]);

    expect(JSON.parse(storage.readValue())).toEqual([storedEntry]);
    expect(journalStorage.loadEntries()).toEqual([storedEntry]);
  });

  it('validates the exact entry schema and unique identifiers', () => {
    expect(validateStoredEntries([storedEntry])).toEqual([storedEntry]);
    expect(() => validateStoredEntries([{ ...storedEntry, updatedAt: storedEntry.createdAt }]))
      .toThrow(JournalStorageError);
    expect(() => validateStoredEntries([{ ...storedEntry, createdAt: 'not-a-date' }]))
      .toThrow(JournalStorageError);
    expect(() => validateStoredEntries([storedEntry, { ...storedEntry }]))
      .toThrow(JournalStorageError);
  });

  it('blocks writes after malformed data without overwriting the stored value', () => {
    const storage = createMemoryStorage('{not valid json');
    const journalStorage = createJournalStorage({ storageProvider: () => storage });

    expectStorageError(() => journalStorage.loadEntries(), 'malformed');
    expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.readValue()).toBe('{not valid json');
  });

  it('blocks writes after structurally invalid data without overwriting it', () => {
    const invalidValue = JSON.stringify([{ id: 'entry-1', content: 'Missing timestamp' }]);
    const storage = createMemoryStorage(invalidValue);
    const journalStorage = createJournalStorage({ storageProvider: () => storage });

    expectStorageError(() => journalStorage.loadEntries(), 'invalid');
    expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.readValue()).toBe(invalidValue);
  });

  it('handles unavailable storage and prevents later writes in that session', () => {
    const journalStorage = createJournalStorage({
      storageProvider: () => {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    });

    expectStorageError(() => journalStorage.loadEntries(), 'read');
    expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
  });

  it('reports serialization and quota failures without changing readable data', () => {
    const storage = createMemoryStorage(JSON.stringify([storedEntry]));
    const serializationFailure = createJournalStorage({
      storageProvider: () => storage,
      serialize: () => {
        throw new TypeError('Cannot serialize');
      },
    });

    expectStorageError(() => serializationFailure.saveEntries([storedEntry]), 'serialize');
    expect(storage.readValue()).toBe(JSON.stringify([storedEntry]));

    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    const quotaFailure = createJournalStorage({ storageProvider: () => storage });
    expectStorageError(() => quotaFailure.saveEntries([storedEntry]), 'write');
    expect(storage.readValue()).toBe(JSON.stringify([storedEntry]));

    const retriedEntry = { ...storedEntry, content: 'Saved after retry' };
    quotaFailure.saveEntries([retriedEntry]);
    expect(quotaFailure.loadEntries()).toEqual([retriedEntry]);
  });

  it('persists create, edit, and delete results without changing IDs or timestamps', () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ storageProvider: () => storage });
    const created = createEntry('Created reflection', {
      createId: () => 'created-id',
      now: () => new Date('2026-10-08T14:30:00.000Z'),
    });

    const afterCreate = addEntry([], created);
    journalStorage.saveEntries(afterCreate);
    expect(journalStorage.loadEntries()).toEqual(afterCreate);

    const afterEdit = updateEntry(afterCreate, created.id, 'Edited reflection');
    journalStorage.saveEntries(afterEdit);
    expect(journalStorage.loadEntries()).toEqual([{
      id: created.id,
      content: 'Edited reflection',
      createdAt: created.createdAt,
    }]);

    const afterDelete = deleteEntry(afterEdit, created.id);
    journalStorage.saveEntries(afterDelete);
    expect(journalStorage.loadEntries()).toEqual([]);
  });
});
