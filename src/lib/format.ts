const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
  "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺",
  n: "ⁿ", x: "ˣ", a: "ᵃ", b: "ᵇ", i: "ⁱ", k: "ᵏ", m: "ᵐ", p: "ᵖ",
};

const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

function toSup(raw: string) {
  const chars = [...raw];
  if (!chars.every((c) => SUP[c])) return null;
  return chars.map((c) => SUP[c]).join("");
}

/**
 * Makes AI/math text read like a real textbook:
 * 2^3 -> 2³, 10^-3 -> 10⁻³, x^(n+1) stays readable, sqrt() -> √, * -> ×
 */
export function pretty(input: string): string {
  if (!input) return "";
  let out = input.replace(/\*\*/g, "");

  out = out.replace(/\^\{?\(?([-+]?[0-9a-z]{1,3})\)?\}?/gi, (match, exp: string) => {
    const sup = toSup(exp);
    return sup ?? match;
  });

  out = out.replace(/_\{?([0-9]{1,2})\}?/g, (match, sub: string) => {
    const chars = [...sub];
    return chars.every((c) => SUB[c]) ? chars.map((c) => SUB[c]).join("") : match;
  });

  out = out.replace(/\bsqrt\s*\(([^)]{1,20})\)/gi, "√($1)");
  out = out.replace(/\\times|\s\*\s/g, " × ");
  out = out.replace(/\\div/g, " ÷ ");
  out = out.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2");
  out = out.replace(/[$\\]/g, "");
  out = out.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠");
  out = out.replace(/(\d)\s*degrees?\b/gi, "$1°");
  return out;
}

export const NO_LATEX_RULE = `Formatting of maths (VERY IMPORTANT):
- Write powers with real superscript characters: 2³, 3⁶, x², 10⁻³, aⁿ. NEVER write 2^3, x^2, **, LaTeX or markdown.
- Use √ for roots, × for multiply, ÷ for divide, ≤ ≥ ≠ ° π for symbols, and a/b for fractions.
- Plain conversational text only, no headings, no bullet characters, no asterisks.`;
