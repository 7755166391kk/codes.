import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DAILY_LIMIT, usedToday } from "@/lib/projects";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — بنّاء" }, { name: "robots", content: "noindex" }] }),
  component: Settings,
});

function Settings() {
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const del = useServerFn(deleteAccount);
  const [name, setName] = useState("");
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const { data: used = 0 } = useQuery({ queryKey: ["usage", user?.id], enabled: !!user, queryFn: () => usedToday(user!.id) });
  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile]);

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, display_name: name.slice(0, 80), locale });
    await supabase.auth.updateUser({ data: { full_name: name.slice(0, 80) } });
    if (error) toast.error(t("error"));
    else toast.success(t("saved"));
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center gap-3 px-4 border-b border-border/60">
        <Logo />
        <div className="ms-auto"><UserMenu /></div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" /> {t("nav_dashboard")}
        </Link>
        <h1 className="text-3xl font-bold">{t("settings_title")}</h1>
        <Section title={t("settings_profile")}>
          <div className="space-y-3">
            <Label>{t("auth_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>{t("auth_email")}</Label>
            <Input value={user?.email ?? ""} disabled dir="ltr" />
            <Button onClick={saveProfile}>{t("save")}</Button>
          </div>
        </Section>
        <Section title={t("settings_pref")}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("settings_lang")}</Label>
              <div className="mt-2 flex gap-2">
                <Button variant={locale === "ar" ? "default" : "secondary"} size="sm" onClick={() => setLocale("ar")}>العربية</Button>
                <Button variant={locale === "en" ? "default" : "secondary"} size="sm" onClick={() => setLocale("en")}>English</Button>
              </div>
            </div>
            <div>
              <Label>{t("settings_theme")}</Label>
              <div className="mt-2 flex gap-2">
                <Button variant={theme === "dark" ? "default" : "secondary"} size="sm" onClick={() => setTheme("dark")}>{t("theme_dark")}</Button>
                <Button variant={theme === "light" ? "default" : "secondary"} size="sm" onClick={() => setTheme("light")}>{t("theme_light")}</Button>
              </div>
            </div>
          </div>
        </Section>
        <Section title={t("settings_usage")}>
          <Progress value={(used / DAILY_LIMIT) * 100} />
          <p className="mt-2 text-sm text-muted-foreground">{used} / {DAILY_LIMIT}</p>
        </Section>
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold text-destructive mb-4">{t("settings_danger")}</h2>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm(t("settings_delete_confirm"))) return;
              try {
                await del();
                await supabase.auth.signOut();
                nav({ to: "/", replace: true });
              } catch {
                toast.error(t("error"));
              }
            }}
          >
            {t("settings_delete_account")}
          </Button>
        </div>
      </div>
    </div>
  );
}
