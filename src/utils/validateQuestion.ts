import type { QuestionDraft } from '../types';

function hasDuplicates(values: string[]) {
  const trimmed = values.map((v) => v.trim());
  return new Set(trimmed).size !== trimmed.length;
}

function hasEmpty(values: string[]) {
  return values.some((v) => v.trim() === "");
}

export function validateQuestion(draft: QuestionDraft): string | null {
  if (draft.text.trim() === "") return "يرجى كتابة نص السؤال.";

  switch (draft.type) {
    case "mcq":
      if (hasEmpty(draft.options)) return "يرجى ملء جميع الخيارات.";
      if (hasDuplicates(draft.options)) return "لا يمكن تكرار نفس الخيار.";
      return null;

    case "order":
      if (hasEmpty(draft.items)) return "يرجى ملء جميع العناصر.";
      if (hasDuplicates(draft.items)) return "لا يمكن تكرار نفس العنصر.";
      return null;

    case "match": {
      const lefts = draft.pairs.map((p) => p.left);
      const rights = draft.pairs.map((p) => p.right);
      if (hasEmpty([...lefts, ...rights])) return "يرجى ملء جميع الأزواج.";
      if (hasDuplicates(lefts)) return "لا يمكن تكرار عنصر في العمود الأول.";
      if (hasDuplicates(rights)) return "لا يمكن تكرار عنصر في العمود الثاني.";
      return null;
    }
  }
}