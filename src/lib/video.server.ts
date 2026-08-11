import { NO_LATEX_RULE } from "@/lib/format";

const MODEL = "google/gemini-3.6-flash";
const TTS_MODEL = "openai/gpt-4o-mini-tts";

export type VideoScene = {
  heading: string;
  /** big on-screen lines the student reads while Sunny talks */
  bullets: string[];
  /** the highlighted formula / key number for this scene */
  highlight?: string | null;
  /** what Sunny says out loud (Hinglish) */
  narration: string;
};

export type VideoCheckpoint = {
  after: number;
  prompt: string;
  options: string[];
  correct_index: number;
  solution: string;
  trick?: string | null;
};

export type VideoScript = {
  title: string;
  hook: string;
  scenes: VideoScene[];
  checkpoints: VideoCheckpoint[];
  recap: string[];
};

function extract<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text) as string;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sunny could not build this video. Try again.");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export async function generateVideoScript(
  chapter: string,
  topic: string,
  section: string,
  college: string | null,
): Promise<VideoScript> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { streamText } = await import("ai");
  const { aiError } = await import("@/lib/learn.server");
  const gateway = createLovableAiGatewayProvider(key);

  const result = streamText({
    model: gateway(MODEL),
    temperature: 0.6,
    system: `You are Sunny, India's most loved IPMAT teacher, recording a video class. You speak Hinglish (English sentences with natural Hindi words like "dekho", "bilkul", "ekdum", "samajh gaye?"), you are high energy, funny, and you crack one small joke tied to the question itself every few scenes. You teach ONE subtopic deeply — never a summary of the whole chapter. Plain text only, no markdown, no LaTeX. ${NO_LATEX_RULE} Reply with ONLY a JSON object.`,
    prompt: `Record a full video class on exactly ONE subtopic: IPMAT ${section} > Chapter "${chapter}" > Subtopic "${topic}".${
      college ? ` The student targets ${college}; use that paper's difficulty and past-year questions.` : ""
    }

Return JSON:
{
  "title": "short punchy class title",
  "hook": "1-2 spoken lines that grab attention in the first 5 seconds",
  "scenes": [
    {"heading":"short on-screen heading (max 6 words)",
     "bullets":["max 8 words each","3 to 4 of them","what appears on the board"],
     "highlight":"the one formula, ratio or number to flash big (or null)",
     "narration":"what Sunny SAYS for this scene: 45-80 spoken words of Hinglish, warm, energetic, with a concrete worked number"}
  ],
  "checkpoints": [
    {"after": 2, "prompt":"question testing only what was taught so far","options":["a","b","c","d"],"correct_index":0,"solution":"friendly numbered steps","trick":"the 10-second shortcut"}
  ],
  "recap": ["3 to 5 one-line takeaways to revise tonight"]
}

Hard rules:
- 10 to 14 scenes, in this teaching order: hook and why it matters, the core idea from zero, the standard method, at least 2 fully worked examples, 2 shortcut/trick scenes, 1 common-mistake scene, 1 exam-level previous-year style question worked out, then the recap scene.
- Start from absolute basics of THIS subtopic and build up. Example style for Percentages: first 1/2 = 50%, 1/4 = 25%, 1/8 = 12.5%, then the fraction table, then applications.
- Mention real IPMAT previous-year question patterns for this subtopic at least twice.
- 4 to 6 checkpoints spread across the class, each "after" a different scene index (0-based), each testing only what was already taught.
- narration is SPOKEN text: no bullet symbols, no headings, no emojis, numbers written so they read well out loud (say "two cubed" style words only when needed, otherwise plain digits).
- bullets and highlight use textbook symbols: 2³, √2, ×, ÷, π, %.`,
  });

  try {
    const text = await result.text;
    const script = extract<VideoScript>(text);
    script.scenes = (script.scenes ?? []).filter((s) => s && s.narration);
    if (script.scenes.length === 0) throw new Error("empty");
    script.checkpoints = (script.checkpoints ?? []).filter(
      (c) => c && Array.isArray(c.options) && c.options.length >= 2,
    );
    script.recap = script.recap ?? [];
    return script;
  } catch (e) {
    throw aiError(e);
  }
}

const VOICE_STYLE =
  "Speak Hinglish like a young, super energetic Indian exam coach on stage. Fast but crystal clear, warm and playful, smile in the voice, punch the key numbers, tiny pause before a punchline or a twist.";

/** Narrates one scene and returns the MP3 bytes. */
export async function synthesizeScene(narration: string): Promise<ArrayBuffer> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: narration.slice(0, 4000),
      voice: "nova",
      response_format: "mp3",
      instructions: VOICE_STYLE,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const { aiError } = await import("@/lib/learn.server");
    throw aiError(new Error(`${res.status} ${body}`));
  }
  return res.arrayBuffer();
}