export function validateUsername(name: string): string | null {
  if (name.length < 3 || name.length > 30) {
    return 'Username must be 3–30 characters.';
  }
  if (/[^a-zA-Z0-9_.]/.test(name)) {
    return 'Use only letters (A–Z), numbers, underscores, and periods.';
  }
  return null;
}

export const USERNAME_TAKEN_MESSAGE = 'That username is already taken.';

export class UsernameTakenError extends Error {
  constructor() {
    super(USERNAME_TAKEN_MESSAGE);
  }
}
