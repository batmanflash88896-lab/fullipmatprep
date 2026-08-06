export type Topic = { slug: string; name: string };
export type Chapter = {
  slug: string;
  number: number;
  name: string;
  section: "QA" | "VARC";
  topics: Topic[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function chapter(
  section: "QA" | "VARC",
  number: number,
  name: string,
  topics: string[],
): Chapter {
  return {
    section,
    number,
    name,
    slug: slugify(name),
    topics: topics.map((t) => ({ name: t, slug: `${slugify(name)}--${slugify(t)}` })),
  };
}

export const QA_CHAPTERS: Chapter[] = [
  chapter("QA", 1, "Number System", [
    "Calculation Techniques",
    "Squares and Cubes",
    "Basic Numbers",
    "Integers",
    "Factors and Multiples",
    "HCF and LCM",
    "Fractions and Decimal Fractions",
    "Indices and Surds",
    "Factorial, Last Digits and Remainders",
    "Rational and Irrational Numbers",
    "Various Number Systems (Base Conversion)",
    "Patterns, Relations and Functions",
  ]),
  chapter("QA", 2, "Averages, Mixtures and Alligation", [
    "Basics of Average",
    "Weighted Average",
    "Average of Series",
    "Mixtures and Alligation",
    "Replacement of Mixtures",
  ]),
  chapter("QA", 3, "Percentage, Profit & Loss, Interest", [
    "Percentage Basics and Conversions",
    "Successive Percentage Change",
    "Profit, Loss and Discount",
    "Marked Price and Cost Price Tricks",
    "Simple Interest",
    "Compound Interest",
    "Instalments and Growth",
  ]),
  chapter("QA", 4, "Ratio, Proportion and Variation", [
    "Ratio Basics",
    "Proportion and Continued Proportion",
    "Direct and Inverse Variation",
    "Partnership",
  ]),
  chapter("QA", 5, "Time, Speed, Distance and Work", [
    "Basics of Speed, Time and Distance",
    "Relative Speed",
    "Trains, Boats and Streams",
    "Races and Circular Tracks",
    "Time and Work",
    "Pipes and Cisterns",
    "Work Equivalence and Efficiency",
  ]),
  chapter("QA", 6, "Algebra", [
    "Linear Equations",
    "Quadratic Equations and Roots",
    "Higher Degree Equations",
    "Inequalities and Modulus",
    "Maxima and Minima",
    "Polynomials and Remainder Theorem",
    "Logarithms",
    "Functions and Graphs",
    "Progressions: AP",
    "Progressions: GP and HP",
    "Binomial Theorem",
  ]),
  chapter("QA", 7, "Geometry", [
    "Lines and Angles",
    "Triangles and Congruence",
    "Similarity and Ratios of Areas",
    "Quadrilaterals and Polygons",
    "Circles, Tangents and Chords",
    "Coordinate Geometry: Lines",
    "Coordinate Geometry: Circles and Loci",
    "Trigonometry Basics",
    "Heights and Distances",
  ]),
  chapter("QA", 8, "Mensuration", [
    "Areas of Plane Figures",
    "Triangles, Rhombus and Trapezium",
    "Circle, Sector and Segment",
    "Cube, Cuboid and Cylinder",
    "Cone, Sphere and Hemisphere",
    "Prism, Pyramid and Frustum",
  ]),
  chapter("QA", 9, "Modern Maths", [
    "Permutations",
    "Combinations",
    "Circular and Conditional Arrangements",
    "Probability Basics",
    "Conditional Probability",
    "Set Theory and Venn Diagrams",
    "Matrices and Determinants",
    "Sequences and Series Applications",
  ]),
  chapter("QA", 10, "Data Interpretation and Logical Reasoning", [
    "Tables and Caselets",
    "Bar, Line and Pie Charts",
    "Data Sufficiency",
    "Arrangements and Puzzles",
    "Blood Relations and Directions",
    "Series, Coding and Analogy",
  ]),
];

export const VARC_CHAPTERS: Chapter[] = [
  chapter("VARC", 1, "Reading Comprehension", [
    "How to Read a Passage Fast",
    "Main Idea and Tone Questions",
    "Inference Questions",
    "Fact vs Opinion vs Assumption",
    "Vocabulary in Context",
    "Elimination Strategy for RC Options",
  ]),
  chapter("VARC", 2, "Vocabulary", [
    "High Frequency IPMAT Words",
    "Roots, Prefixes and Suffixes",
    "Synonyms and Antonyms",
    "Words with Multiple Meanings",
    "Idioms and Phrases",
    "One Word Substitution",
    "Foreign Words and Phrases",
  ]),
  chapter("VARC", 3, "Grammar", [
    "Parts of Speech",
    "Subject Verb Agreement",
    "Tenses",
    "Articles, Prepositions and Conjunctions",
    "Modifiers and Parallelism",
    "Pronoun and Reference Errors",
    "Error Spotting",
    "Sentence Correction",
  ]),
  chapter("VARC", 4, "Verbal Reasoning", [
    "Para Jumbles",
    "Para Summary",
    "Odd Sentence Out",
    "Sentence Completion and Fill in the Blanks",
    "Critical Reasoning: Assumptions",
    "Critical Reasoning: Strengthen and Weaken",
    "Analogies and Word Pairs",
  ]),
];

export const ALL_CHAPTERS = [...QA_CHAPTERS, ...VARC_CHAPTERS];

export function findTopic(slug: string) {
  for (const ch of ALL_CHAPTERS) {
    const topic = ch.topics.find((t) => t.slug === slug);
    if (topic) return { chapter: ch, topic };
  }
  return null;
}

export const TOTAL_TOPICS = ALL_CHAPTERS.reduce((n, c) => n + c.topics.length, 0);
