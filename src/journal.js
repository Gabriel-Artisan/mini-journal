export const MAX_ENTRY_LENGTH = 1000;

export class JournalValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JournalValidationError';
  }
}

export function validateEntryContent(content) {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new JournalValidationError('Write something before saving your entry.');
  }

  if (content.length > MAX_ENTRY_LENGTH) {
    throw new JournalValidationError(`Entries must be ${MAX_ENTRY_LENGTH.toLocaleString('en-US')} characters or fewer.`);
  }

  return content;
}

export function createEntry(
  content,
  {
    createId = () => crypto.randomUUID(),
    now = () => new Date(),
  } = {},
) {
  const validContent = validateEntryContent(content);
  const createdAt = now();

  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new TypeError('A valid creation date is required.');
  }

  const id = createId();
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('A non-empty entry identifier is required.');
  }

  return {
    id,
    content: validContent,
    createdAt: createdAt.toISOString(),
  };
}

export function sortEntriesNewestFirst(entries) {
  return [...entries].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function addEntry(entries, entry) {
  return [entry, ...entries];
}

export function updateEntry(entries, id, content) {
  const validContent = validateEntryContent(content);
  let entryFound = false;

  const updatedEntries = entries.map((entry) => {
    if (entry.id !== id) return entry;

    entryFound = true;
    return {
      id: entry.id,
      content: validContent,
      createdAt: entry.createdAt,
    };
  });

  if (!entryFound) {
    throw new Error('The journal entry could not be found.');
  }

  return updatedEntries;
}

export function deleteEntry(entries, id) {
  const remainingEntries = entries.filter((entry) => entry.id !== id);

  if (remainingEntries.length === entries.length) {
    throw new Error('The journal entry could not be found.');
  }

  return remainingEntries;
}
