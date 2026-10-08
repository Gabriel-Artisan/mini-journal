import { describe, expect, it } from 'vitest';
import {
  addEntry,
  createEntry,
  deleteEntry,
  JournalValidationError,
  sortEntriesNewestFirst,
  updateEntry,
  validateEntryContent,
} from '../../src/journal.js';

describe('journal entries', () => {
  it('creates an entry with exactly the approved fields', () => {
    const entry = createEntry('A quiet morning.', {
      createId: () => 'entry-1',
      now: () => new Date('2026-10-08T14:30:00.000Z'),
    });

    expect(entry).toEqual({
      id: 'entry-1',
      content: 'A quiet morning.',
      createdAt: '2026-10-08T14:30:00.000Z',
    });
    expect(Object.keys(entry)).toEqual(['id', 'content', 'createdAt']);
  });

  it('creates unique identifiers by default', () => {
    const first = createEntry('First');
    const second = createEntry('Second');

    expect(first.id).not.toBe(second.id);
  });

  it.each(['', '   ', '\n\t'])('rejects empty journal content: %j', (content) => {
    expect(() => validateEntryContent(content)).toThrow(JournalValidationError);
    expect(() => validateEntryContent(content)).toThrow('Write something before saving your entry.');
  });

  it('preserves valid plain text exactly as entered', () => {
    expect(validateEntryContent('  A thought with spacing.  ')).toBe('  A thought with spacing.  ');
  });

  it('rejects journal content above the character limit', () => {
    expect(() => validateEntryContent('a'.repeat(1001))).toThrow('1,000 characters or fewer');
  });

  it('adds a newly created entry at the start of the journal', () => {
    const older = {
      id: 'older',
      content: 'Older',
      createdAt: '2026-10-07T10:00:00.000Z',
    };
    const newer = {
      id: 'newer',
      content: 'Newer',
      createdAt: '2026-10-08T10:00:00.000Z',
    };

    expect(addEntry([older], newer)).toEqual([newer, older]);
  });

  it('sorts entries in reverse chronological order without mutating the input', () => {
    const entries = [
      { id: 'oldest', content: 'Oldest', createdAt: '2026-10-06T10:00:00.000Z' },
      { id: 'newest', content: 'Newest', createdAt: '2026-10-08T10:00:00.000Z' },
      { id: 'middle', content: 'Middle', createdAt: '2026-10-07T10:00:00.000Z' },
    ];

    expect(sortEntriesNewestFirst(entries).map(({ id }) => id)).toEqual(['newest', 'middle', 'oldest']);
    expect(entries.map(({ id }) => id)).toEqual(['oldest', 'newest', 'middle']);
  });

  it('updates only the content and preserves the identifier and creation timestamp', () => {
    const original = {
      id: 'entry-1',
      content: 'Original reflection',
      createdAt: '2026-10-08T14:30:00.000Z',
    };

    const [updated] = updateEntry([original], original.id, 'Updated reflection');

    expect(updated).toEqual({
      id: original.id,
      content: 'Updated reflection',
      createdAt: original.createdAt,
    });
    expect(original.content).toBe('Original reflection');
  });

  it('rejects an empty edit without modifying the entry', () => {
    const original = {
      id: 'entry-1',
      content: 'Original reflection',
      createdAt: '2026-10-08T14:30:00.000Z',
    };

    expect(() => updateEntry([original], original.id, '   ')).toThrow(JournalValidationError);
    expect(original.content).toBe('Original reflection');
  });

  it('deletes only the requested entry', () => {
    const first = { id: 'first', content: 'First', createdAt: '2026-10-08T10:00:00.000Z' };
    const second = { id: 'second', content: 'Second', createdAt: '2026-10-08T11:00:00.000Z' };

    expect(deleteEntry([second, first], second.id)).toEqual([first]);
  });

  it('reports missing entries during update and deletion', () => {
    expect(() => updateEntry([], 'missing', 'Valid content')).toThrow('could not be found');
    expect(() => deleteEntry([], 'missing')).toThrow('could not be found');
  });
});
