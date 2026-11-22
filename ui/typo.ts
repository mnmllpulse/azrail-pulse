const TARGETS = ["нарисуй", "нарисуйте", "нарисовать"] as const;
const KEEP = /^(?:нарисуем|нарисуешь|нарисуют|нарисует|нарисую|нарисуйка)$/u;

function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Чинит опечатки в глаголе рисования («нгарисуй», «нарисвоать»), чтобы маршрутизация их узнавала. */
export function fixDrawVerbs(text: string): string {
  return text.replace(/\p{L}{6,}/gu, (word) => {
    const w = word.toLowerCase();
    if (KEEP.test(w) || (w.startsWith("нарисова") && w !== "нарисовать"))
      return word;
    for (const target of TARGETS) {
      if (w !== target && distance(w, target) <= 2) return target;
    }
    return word;
  });
}
