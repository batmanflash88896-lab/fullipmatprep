import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { supabase } from "@/integrations/supabase/client";
import { getThread } from "@/lib/doubt.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doubt/$threadId")({
  head: () => ({
    meta: [
      { title: "Doubt chat — AscendIPM" },
      {
        name: "description",
        content: "Chat with Sunny, the AscendIPM AI tutor, for step-by-step IPMAT solutions, tricks and mistake alerts.",
      },
      { property: "og:title", content: "Doubt chat — AscendIPM" },
      { property: "og:description", content: "Step-by-step IPMAT help from your AI tutor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/_authenticated/doubt/$threadId" });
  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread({ data: { id: threadId } }),
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading conversation…</p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">This conversation no longer exists.</p>
        <Link to="/doubt" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to doubts
        </Link>
      </AppShell>
    );
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      title={data.thread.title as string}
      initial={data.messages as unknown as UIMessage[]}
    />
  );
}

function ChatWindow({
  threadId,
  title,
  initial,
}: {
  threadId: string;
  title: string;
  initial: UIMessage[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {};
        },
        body: { threadId },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (error) => toast.error(error.message || "Sunny couldn't answer. Try again."),
  });

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status, threadId]);

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Link
          to="/doubt"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All doubts
        </Link>
        <h1 className="ml-2 truncate text-lg font-bold">{title}</h1>
      </div>

      <div className="flex h-[calc(100vh-15rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
        <Conversation className="flex-1">
          <ConversationContent className="gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Mascot size={72} mood="cheer" float />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Paste your question, describe where you got stuck, or ask for a strategy. I'll show
                  the full solution, the fastest trick and the trap to avoid.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                {message.role === "assistant" && <Mascot size={34} mood="idle" className="mt-1" />}
                <MessageContent
                  className={
                    message.role === "assistant"
                      ? "bg-transparent px-0 text-foreground"
                      : "bg-primary text-primary-foreground"
                  }
                >
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))}

            {status === "submitted" && (
              <div className="flex items-center gap-3 px-1">
                <Mascot size={34} mood="thinking" />
                <Shimmer>Sunny is working it out…</Shimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border/70 p-3">
          <PromptInput
            onSubmit={(message, event) => {
              const text = message.text?.trim();
              if (!text) return;
              event.currentTarget.reset();
              void sendMessage({ text });
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              autoFocus
              placeholder="Type your doubt… e.g. 'Why is the answer 5/12 in this probability question?'"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </AppShell>
  );
}