import { describe, expect, it, vi } from 'vitest';
import { createJournalStorage, createPreferenceStorage, DEFAULT_PREFERENCES, JOURNAL_STORAGE_KEY, PREFERENCES_STORAGE_KEY } from '../../src/storage.js';

function setup(raw = null) {
  const data = new Map(raw === null ? [] : [[PREFERENCES_STORAGE_KEY, raw]]);
  const storage = {
    getItem: vi.fn((key) => data.get(key) ?? null),
    setItem: vi.fn((key, value) => data.set(key, value)),
  };
  return { data, storage, preferences: createPreferenceStorage({ storageProvider: () => storage }) };
}

describe('preference persistence', () => {
  for (const appearance of ['light', 'dark', 'system']) {
    for (const textSize of ['small', 'medium', 'large']) {
      it(`restores independent choices: ${appearance} / ${textSize}`, () => {
        const { preferences } = setup();
        expect(preferences.savePreferences({ appearance, textSize })).toEqual({ ok: true });
        expect(preferences.loadPreferences()).toEqual({ ok: true, preferences: { appearance, textSize } });
      });
    }
  }

  it.each([null, '{broken', 'null', '[]', 'false', '42', '"dark"', '{"appearance":"sepia","textSize":"huge"}'])('falls back safely for %s without writing', (raw) => {
    const { preferences, storage } = setup(raw);
    expect(preferences.loadPreferences()).toEqual({ ok: true, preferences: DEFAULT_PREFERENCES });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('retains valid fields when another field is invalid or missing', () => {
    expect(setup('{"appearance":"dark","textSize":null}').preferences.loadPreferences().preferences)
      .toEqual({ appearance: 'dark', textSize: 'medium' });
    expect(setup('{"textSize":"large"}').preferences.loadPreferences().preferences)
      .toEqual({ appearance: 'system', textSize: 'large' });
  });

  it('keeps preferences, journal data, and unrelated data separate during bulk deletion', () => {
    const { preferences, storage, data } = setup();
    data.set('unrelated', 'keep');
    const journal = createJournalStorage({ storageProvider: () => storage });
    const entry = { id: '1', content: 'Keep until confirmed', createdAt: '2026-10-08T12:00:00Z' };
    journal.saveEntries([entry]);
    preferences.savePreferences({ appearance: 'dark', textSize: 'large' });
    expect(journal.loadEntries()).toEqual([entry]);
    journal.saveEntries([]);
    expect(data.get(JOURNAL_STORAGE_KEY)).toBe('[]');
    expect(preferences.loadPreferences().preferences).toEqual({ appearance: 'dark', textSize: 'large' });
    expect(data.get('unrelated')).toBe('keep');
  });

  it('reports inaccessible storage and failed writes without false success', () => {
    const inaccessible = createPreferenceStorage({ storageProvider() { throw new Error('Blocked'); } });
    expect(inaccessible.loadPreferences()).toEqual({ ok: false, preferences: DEFAULT_PREFERENCES });
    expect(inaccessible.savePreferences(DEFAULT_PREFERENCES)).toEqual({ ok: false });
    const { preferences, storage } = setup('{"appearance":"light","textSize":"small"}');
    storage.setItem.mockImplementationOnce(() => { throw new Error('Full'); });
    expect(preferences.savePreferences({ appearance: 'dark', textSize: 'large' })).toEqual({ ok: false });
    expect(preferences.loadPreferences().preferences).toEqual({ appearance: 'light', textSize: 'small' });
    expect(preferences.savePreferences({ appearance: 'dark', textSize: 'large' })).toEqual({ ok: true });
  });

  it.each(['{broken', '[{"id":"invalid"}]'])('cannot bulk-delete unreadable journal data: %s', (raw) => {
    const { preferences, storage, data } = setup();
    data.set(JOURNAL_STORAGE_KEY, raw);
    const journal = createJournalStorage({ storageProvider: () => storage });
    expect(() => journal.loadEntries()).toThrow();
    expect(() => journal.saveEntries([])).toThrow(/blocked/);
    preferences.savePreferences({ appearance: 'dark', textSize: 'large' });
    expect(data.get(JOURNAL_STORAGE_KEY)).toBe(raw);
  });
});
