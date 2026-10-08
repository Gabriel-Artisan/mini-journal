import { describe, expect, it } from 'vitest';
import { ENTRIES_PER_PAGE, paginateEntries } from '../../src/pagination.js';

const entries = Array.from({ length: 25 }, (_, index) => ({ id: `entry-${index + 1}` }));

describe('journal pagination', () => {
  it('represents an empty journal with one disabled empty page', () => {
    expect(paginateEntries([])).toEqual({
      currentPage: 1,
      totalPages: 1,
      totalEntries: 0,
      rangeStart: 0,
      rangeEnd: 0,
      visibleEntries: [],
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });

  it('returns exactly ten entries for a full page', () => {
    const page = paginateEntries(entries, 2);

    expect(page.currentPage).toBe(2);
    expect(page.totalPages).toBe(3);
    expect(page.rangeStart).toBe(11);
    expect(page.rangeEnd).toBe(20);
    expect(page.visibleEntries).toEqual(entries.slice(10, 20));
    expect(page.visibleEntries).toHaveLength(ENTRIES_PER_PAGE);
  });

  it('returns a partially filled final page', () => {
    const page = paginateEntries(entries, 3);

    expect(page.rangeStart).toBe(21);
    expect(page.rangeEnd).toBe(25);
    expect(page.visibleEntries).toEqual(entries.slice(20));
    expect(page.hasPreviousPage).toBe(true);
    expect(page.hasNextPage).toBe(false);
  });

  it('clamps page requests when a collection shrinks', () => {
    const page = paginateEntries(entries.slice(0, 11), 3);

    expect(page.currentPage).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.rangeStart).toBe(11);
    expect(page.rangeEnd).toBe(11);
    expect(page.visibleEntries).toEqual([entries[10]]);
  });

  it('clamps invalid page numbers to a valid boundary', () => {
    expect(paginateEntries(entries, 0).currentPage).toBe(1);
    expect(paginateEntries(entries, Number.POSITIVE_INFINITY).currentPage).toBe(1);
    expect(paginateEntries(entries, 99).currentPage).toBe(3);
  });
});
