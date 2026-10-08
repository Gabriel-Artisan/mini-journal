export const ENTRIES_PER_PAGE = 10;

export function paginateEntries(entries, requestedPage = 1, pageSize = ENTRIES_PER_PAGE) {
  if (!Array.isArray(entries)) throw new TypeError('Entries must be an array.');
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('Page size must be a positive integer.');
  }

  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const numericPage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1;
  const currentPage = Math.min(Math.max(numericPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleEntries = entries.slice(startIndex, startIndex + pageSize);

  return {
    currentPage,
    totalPages,
    totalEntries,
    rangeStart: totalEntries === 0 ? 0 : startIndex + 1,
    rangeEnd: totalEntries === 0 ? 0 : startIndex + visibleEntries.length,
    visibleEntries,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}
