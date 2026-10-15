import { describe, it, expect } from 'vitest';
import shuffle from './shuffle';

describe('shuffle', () => {
  it('returns an array with the same items', () => {
    const input = [1, 2, 3, 4, 5];

    const result = shuffle(input);

    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not change the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];

    shuffle(input);

    expect(input).toEqual(copy);
  });
});