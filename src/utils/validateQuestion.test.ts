import { describe, it, expect } from 'vitest';
import { validateQuestion } from './validateQuestion';

describe('validateQuestion', () => {
  it('accepts a valid mcq question', () => {
    const result = validateQuestion({
      type: "mcq",
      text: "ما ناتج 2 + 2؟",
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
    });

    expect(result).toBeNull();
  });

  it('rejects an empty question text', () => {
    const result = validateQuestion({
      type: "mcq",
      text: "   ",
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
    });

    expect(result).toBe("يرجى كتابة نص السؤال.");
  });


  it('rejects an empty ordering item', () => {
    const result = validateQuestion({
      type: "order",
      text: "رتّب الأحرف",
      items: ["أ", "", "ج"],
    });

    expect(result).toBe("يرجى ملء جميع العناصر.");
  });

  it('rejects duplicates in the second matching column', () => {
    const result = validateQuestion({
      type: "match",
      text: "طابق كل دولة بعاصمتها",
      pairs: [
        { left: "الأردن", right: "عمّان" },
        { left: "مصر", right: "عمّان" },
      ],
    });

    expect(result).toBe("لا يمكن تكرار عنصر في العمود الثاني.");
  });

  it('treats options that differ only by spaces as duplicates', () => {
    const result = validateQuestion({
      type: "mcq",
      text: "ما ناتج 2 + 2؟",
      options: ["4", " 4 ", "5", "6"],
      correctIndex: 0,
    });

    expect(result).toBe("لا يمكن تكرار نفس الخيار.");
  });
});