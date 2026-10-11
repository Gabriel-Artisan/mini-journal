import { createTestLocks } from './locks.js';
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

async function expectStorageError(action, code) {
  try {
    await action();
    throw new Error(`Expected storage error: ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(JournalStorageError);
    expect(error.code).toBe(code);
  }
}

describe('journal storage', () => {
  it('rejects stale snapshots after another writer saves, deletes, or corrupts data', async () => {
    for (const newer of [JSON.stringify([storedEntry]), '[]', '{broken']) {
      const storage = createMemoryStorage();
      const locks = createTestLocks();
      const journal = createJournalStorage({ storageProvider: () => storage, lockProvider: () => locks });
      journal.loadEntries();
      storage.setItem(JOURNAL_STORAGE_KEY, newer);
      await expectStorageError(() => journal.saveEntries([storedEntry]), 'conflict');
      expect(storage.readValue()).toBe(newer);
    }
  });

  it('serializes simultaneous writers so only one stale snapshot can commit', async () => {
    const storage = createMemoryStorage();
    const locks = createTestLocks();
    const makeJournal = () => createJournalStorage({ storageProvider: () => storage, lockProvider: () => locks });
    const first = makeJournal();
    const second = makeJournal();
    first.loadEntries();
    second.loadEntries();
    const results = await Promise.allSettled([
      first.saveEntries([storedEntry]),
      second.saveEntries([{ ...storedEntry, id: 'entry-2' }]),
    ]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(results[1].reason.code).toBe('conflict');
    expect(JSON.parse(storage.readValue())).toEqual([storedEntry]);
    expect(second.loadEntries()).toEqual([storedEntry]);
    await second.saveEntries([]);
    expect(storage.readValue()).toBe('[]');
  });

  it('refuses writes without a loaded snapshot or Web Locks support', async () => {
    const storage = createMemoryStorage(JSON.stringify([storedEntry]));
    const unloaded = createJournalStorage({ storageProvider: () => storage, lockProvider: () => createTestLocks() });
    await expectStorageError(() => unloaded.saveEntries([]), 'conflict');
    const unsupported = createJournalStorage({ storageProvider: () => storage, lockProvider: () => undefined });
    unsupported.loadEntries();
    await expectStorageError(() => unsupported.saveEntries([]), 'unsupported');
    expect(storage.readValue()).toBe(JSON.stringify([storedEntry]));
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('treats a missing journal key as an empty collection', async () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });

    expect(journalStorage.loadEntries()).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('serializes and restores valid journal entries', async () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });

    journalStorage.loadEntries();
    await journalStorage.saveEntries([storedEntry]);

    expect(JSON.parse(storage.readValue())).toEqual([storedEntry]);
    expect(journalStorage.loadEntries()).toEqual([storedEntry]);
  });

  it('validates the exact entry schema and unique identifiers', async () => {
    expect(validateStoredEntries([storedEntry])).toEqual([storedEntry]);
    expect(() => validateStoredEntries([{ ...storedEntry, updatedAt: storedEntry.createdAt }]))
      .toThrow(JournalStorageError);
    expect(() => validateStoredEntries([{ ...storedEntry, createdAt: 'not-a-date' }]))
      .toThrow(JournalStorageError);
    expect(() => validateStoredEntries([storedEntry, { ...storedEntry }]))
      .toThrow(JournalStorageError);
  });

  it('blocks writes after malformed data without overwriting the stored value', async () => {
    const storage = createMemoryStorage('{not valid json');
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });

    await expectStorageError(() => journalStorage.loadEntries(), 'malformed');
    await expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.readValue()).toBe('{not valid json');
  });

  it('blocks writes after structurally invalid data without overwriting it', async () => {
    const invalidValue = JSON.stringify([{ id: 'entry-1', content: 'Missing timestamp' }]);
    const storage = createMemoryStorage(invalidValue);
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });

    await expectStorageError(() => journalStorage.loadEntries(), 'invalid');
    await expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.readValue()).toBe(invalidValue);
  });

  it('handles unavailable storage and prevents later writes in that session', async () => {
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(),
      storageProvider: () => {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    });

    await expectStorageError(() => journalStorage.loadEntries(), 'read');
    await expectStorageError(() => journalStorage.saveEntries([storedEntry]), 'blocked');
  });

  it('reports serialization and quota failures without changing readable data', async () => {
    const storage = createMemoryStorage(JSON.stringify([storedEntry]));
    const serializationFailure = createJournalStorage({ lockProvider: () => createTestLocks(),
      storageProvider: () => storage,
      serialize: () => {
        throw new TypeError('Cannot serialize');
      },
    });

    await expectStorageError(() => serializationFailure.saveEntries([storedEntry]), 'serialize');
    expect(storage.readValue()).toBe(JSON.stringify([storedEntry]));

    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    const quotaFailure = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });
    quotaFailure.loadEntries();
    await expectStorageError(() => quotaFailure.saveEntries([storedEntry]), 'write');
    expect(storage.readValue()).toBe(JSON.stringify([storedEntry]));

    const retriedEntry = { ...storedEntry, content: 'Saved after retry' };
    await quotaFailure.saveEntries([retriedEntry]);
    expect(quotaFailure.loadEntries()).toEqual([retriedEntry]);
  });

  it('persists create, edit, and delete results without changing IDs or timestamps', async () => {
    const storage = createMemoryStorage();
    const journalStorage = createJournalStorage({ lockProvider: () => createTestLocks(), storageProvider: () => storage });
    const created = createEntry('Created reflection', {
      createId: () => 'created-id',
      now: () => new Date('2026-10-08T14:30:00.000Z'),
    });

    const afterCreate = addEntry([], created);
    journalStorage.loadEntries();
    await journalStorage.saveEntries(afterCreate);
    expect(journalStorage.loadEntries()).toEqual(afterCreate);

    const afterEdit = updateEntry(afterCreate, created.id, 'Edited reflection');
    await journalStorage.saveEntries(afterEdit);
    expect(journalStorage.loadEntries()).toEqual([{
      id: created.id,
      content: 'Edited reflection',
      createdAt: created.createdAt,
    }]);

    const afterDelete = deleteEntry(afterEdit, created.id);
    await journalStorage.saveEntries(afterDelete);
    expect(journalStorage.loadEntries()).toEqual([]);
  });
});
