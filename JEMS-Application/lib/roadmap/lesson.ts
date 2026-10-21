/**
 * "AI video" lesson generator. Produces a narrated micro-lesson as a sequence
 * of slides; the client renders the slides and narrates them with the browser
 * Speech API, so there is no paid video API involved.
 *
 * Set GEMINI_API_KEY in .env.local to enable AI generation. Without it (or on
 * any network/parse/quota failure) we fall back to a deterministic lesson so
 * the feature never hard-fails.
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 20_000;

export interface Slide {
  title: string;
  bullets: string[];
  narration: string;
}

export interface LessonScript {
  slides: Slide[];
  aiGenerated: boolean;
}

export interface LessonInput {
  lessonTitle: string;
  moduleTitle?: string;
  topics?: string[];
  proficiency?: string;
}

export function isGeminiConfigured(): boolean {
  return GEMINI_KEY.length > 0;
}

function buildPrompt({ lessonTitle, moduleTitle, topics, proficiency }: LessonInput): string {
  return `You are an expert programming instructor creating a short, narrated micro-lesson video.

Lesson title: "${lessonTitle}"
${moduleTitle ? `This lesson is part of the module: "${moduleTitle}"` : ""}
${topics?.length ? `Related topics in this module: ${topics.join(", ")}` : ""}
Target learner level: ${proficiency || "beginner-friendly"}.

Produce the lesson as 5 to 6 slides. Each slide must have:
- "title": a 3-6 word slide heading
- "bullets": 2-4 short bullet points (each max ~10 words)
- "narration": 2-3 spoken sentences that teach the slide content clearly and naturally (~30-55 words). This is read aloud, so write it as speech — no markdown, no bullet symbols.

The first slide should introduce the topic and the last slide should recap the key takeaways.

Return ONLY valid JSON in exactly this shape:
{ "slides": [ { "title": "...", "bullets": ["...", "..."], "narration": "..." } ] }`;
}

// ── Deterministic fallback (no API key / AI failure) ─────────────
function deterministic({ lessonTitle, topics }: LessonInput): LessonScript {
  const t = lessonTitle;
  const topicList = topics?.length ? topics : [t];
  const slides: Slide[] = [
    {
      title: `Welcome: ${t}`,
      bullets: ["What this lesson covers", "Why it matters", "How to follow along"],
      narration: `Welcome to this lesson on ${t}. We'll break down the core ideas step by step, look at why they matter in real projects, and finish with a quick recap so the concepts stick.`,
    },
    {
      title: "Core Concepts",
      bullets: topicList.slice(0, 4),
      narration: `Let's start with the fundamentals of ${t}. Focus on understanding the main ideas first — once the foundation is clear, the details become much easier to remember and apply.`,
    },
    {
      title: "A Practical Example",
      bullets: ["See it used in context", "Spot the common pattern", "Try it yourself"],
      narration: `Here's how ${t} shows up in practice. Notice the pattern being used — recognising these patterns is what lets you apply the concept confidently to new problems of your own.`,
    },
    {
      title: "Common Pitfalls",
      bullets: ["Mistakes beginners make", "How to avoid them", "Best practices"],
      narration: `Watch out for a few common mistakes when working with ${t}. Knowing these pitfalls ahead of time saves you hours of debugging and helps you write cleaner, more reliable code.`,
    },
    {
      title: "Recap & Next Steps",
      bullets: ["Key takeaways", "Practice suggestion", "What comes next"],
      narration: `To recap, you now understand the essentials of ${t}. The best next step is to practice with a small exercise, then move on to the module quiz to check your understanding.`,
    },
  ];
  return { slides, aiGenerated: false };
}

/** Coerces whatever the model returned into bounded, plain-string slides. */
export function sanitizeSlides(input: unknown): Slide[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 8)
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const bullets = Array.isArray(o.bullets)
        ? o.bullets.map((b) => String(b ?? "").slice(0, 120)).slice(0, 5)
        : [];
      return {
        title: String(o.title ?? "").slice(0, 80) || "Slide",
        bullets,
        narration: String(o.narration ?? "").slice(0, 600),
      };
    })
    .filter((s) => s.narration.length > 0);
}

export async function generateLessonScript(input: LessonInput): Promise<LessonScript> {
  if (!GEMINI_KEY) return deterministic(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(text) as { slides?: unknown };
    const slides = sanitizeSlides(parsed.slides);
    if (slides.length === 0) throw new Error("No usable slides");
    return { slides, aiGenerated: true };
  } catch (err) {
    console.error("[roadmap/lesson] Gemini generation failed, using fallback:", err);
    return deterministic(input);
  } finally {
    clearTimeout(timer);
  }
}
