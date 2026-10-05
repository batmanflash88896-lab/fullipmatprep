import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AscendIPM IPMAT Prep" },
      {
        name: "description",
        content: "Create your free AscendIPM account to unlock daily IPMAT practice, an AI doubt solver and progress tracking.",
      },
      { property: "og:title", content: "Sign in — AscendIPM IPMAT Prep" },
      {
        property: "og:description",
        content: "Free daily IPMAT practice, an AI doubt solver and progress tracking.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) navigate({ to: "/dashboard", replace: true });
      })
      .catch(() => undefined);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(friendly(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      console.error(error);
      toast.error(friendly(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ backgroundImage: "var(--gradient-glow)" }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-border/70 bg-card p-7 shadow-soft">
        <Link to="/" className="mb-6 flex items-center gap-3">
          <Mascot size={48} mood="cheer" />
          <div>
            <p className="font-display text-xl font-extrabold">
              Ascend<span className="text-primary">IPM</span>
            </p>
            <p className="text-xs text-muted-foreground">Your IPMAT study partner</p>
          </div>
        </Link>

        {checkEmail ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <strong>{email}</strong>. Click it and you're in.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setCheckEmail(false)}>
              Back
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">
              {mode === "signup" ? "Start preparing today" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Free forever. Daily questions, tricks and an AI tutor."
                : "Pick up your streak where you left it."}
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              disabled={busy}
              onClick={handleGoogle}
            >
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or use email{" "}
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Sharma"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <Button type="submit" className="w-full bg-sunrise text-primary-foreground shadow-lift" disabled={busy}>
                {mode === "signup" ? "Create my account" : "Sign in"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to="/guest">Continue as guest</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function friendly(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/fetch|network|paused/i.test(msg)) {
    return "Our sign-in service is offline right now. Please try again shortly or continue as guest.";
  }
  return msg || "Something went wrong. Please try again.";
}