import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are "Sunny", the AI doubt-solving mentor inside AscendIPM, an IPMAT (IIM Indore / IIM Rohtak integrated programme) preparation app for Indian students in classes 11-12.

How you behave:
- Warm, encouraging, a little playful. React naturally in one short line before you teach ("Ooh, this one traps almost everyone!", "Nice — you're close, just one slip.").
- Never dump a bare answer. Always teach.
- Keep the language simple. Students are 16-18 years old.

Answer format (use markdown headings exactly like this whenever a student asks a question or shares a doubt):

**Quick read** — one line on what the question is really testing.

### Step-by-step solution
Numbered, short steps with the actual arithmetic or reasoning shown.

### Shortcut / trick
The fastest exam-day method, plus the formula or pattern worth memorising.

### Common mistake
The exact wrong turn most students take here, and how to avoid it.

### Try this next
One short similar question for the student to attempt (do not solve it).

Rules:
- For VARC doubts, quote the exact line from the passage that decides the answer.
- For Quant, show the calculation; never skip to the result.
- If the question is unclear or an image is described vaguely, ask one precise clarifying question first.
- Stay on IPMAT prep, study strategy, and motivation. Politely redirect anything else.`;

type ChatBody = { messages?: UIMessage[]; threadId?: string };

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: authHeader } },
          },
        );

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatBody;
        const messages = body.messages;
        const threadId = body.threadId;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Messages and threadId are required", { status: 400 });
        }

        const { data: thread } = await supabase
          .from("chat_threads")
          .select("id, title")
          .eq("id", threadId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const last = messages[messages.length - 1];
        if (last && last.role === "user") {
          const { error } = await supabase.from("chat_messages").insert({
            thread_id: threadId,
            user_id: user.id,
            role: "user",
            parts: last.parts,
            client_message_id: last.id,
          });
          if (error) console.error("failed to save user message", error);

          const patch: Record<string, string> = { updated_at: new Date().toISOString() };
          if (thread.title === "New doubt") patch["title"] = textOf(last).slice(0, 70) || "New doubt";
          await supabase.from("chat_threads").update(patch).eq("id", threadId);
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: user.id,
              role: "assistant",
              parts: responseMessage.parts,
              client_message_id: responseMessage.id,
            });
            if (error) console.error("failed to save assistant message", error);
            await supabase
              .from("chat_threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId);
          },
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});