import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LangToggle } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { createProject, titleFromPrompt } from "@/lib/projects";

const search = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — بنّاء" },
      { name: "description", content: "سجّل دخولك أو أنشئ حسابًا مجانيًا في بنّاء." },
      { property: "og:title", content: "تسجيل الدخول — بنّاء" },
      { property: "og:description", content: "ابدأ بناء مواقعك بالذكاء الاصطناعي مجانًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return null;
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

function AuthPage() {
  const { t } = useI18n();
  const { mode = "login", redirect } = Route.useSearch();
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    (async () => {
      const pending = sessionStorage.getItem("pending_prompt");
      if (pending) {
        sessionStorage.removeItem("pending_prompt");
        const id = await createProject(user.id, titleFromPrompt(pending));
        nav({ to: "/project/$id", params: { id }, search: { prompt: pending }, replace: true });
        return;
      }
      const back = safePath(redirect);
      if (back) nav({ to: back, replace: true });
      else nav({ to: "/dashboard", replace: true });
    })();
  }, [ready, user, redirect, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } },
        });
        if (error) throw error;
        setNotice(t("auth_check_email"));
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice(t("auth_reset_sent"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error(String(res.error.message ?? res.error));
  };

  return (
    <div className="relative min-h-screen grid place-items-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero opacity-70" />
      <div className="absolute top-4 inset-x-4 flex justify-between">
        <Logo />
        <LangToggle />
      </div>
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-8 shadow-glow">
        <h1 className="text-2xl font-bold text-center">
          {mode === "signup" ? t("auth_signup") : mode === "forgot" ? t("auth_forgot") : t("auth_welcome")}
        </h1>
        {notice ? (
          <p className="mt-6 rounded-xl bg-secondary p-4 text-sm">{notice}</p>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <Button variant="outline" className="mt-6 w-full" onClick={google}>
                  <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.3-5.35 4.3-3.2 0-5.85-2.65-5.85-5.9S8.8 6.5 12 6.5c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 4 14.55 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.3-1.1z"/></svg>
                  {t("auth_google")}
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />{t("auth_or")}<div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <form onSubmit={submit} className={`space-y-4 ${mode === "forgot" ? "mt-6" : ""}`}>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label>{t("auth_name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t("auth_email")}</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label>{t("auth_password")}</Label>
                    {mode === "login" && (
                      <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary">{t("auth_forgot")}</Link>
                    )}
                  </div>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                </div>
              )}
              <Button className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {mode === "signup" ? t("auth_signup") : mode === "forgot" ? t("save") : t("auth_login")}
              </Button>
            </form>
          </>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? t("auth_have_account") : t("auth_no_account")}{" "}
          <Link to="/auth" search={{ mode: mode === "signup" ? "login" : "signup", redirect }} className="text-primary">
            {mode === "signup" ? t("auth_login") : t("auth_signup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
