import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MoreHorizontal, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { LangToggle, UserMenu } from "@/components/SiteHeader";
import { PromptBox } from "@/components/PromptBox";
import { SiteThumb } from "@/components/SitePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createProject } from "@/lib/projects";
import type { Files } from "@/lib/preview";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "مشاريعي — بنّاء" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "starred">("all");
  const { data: projects } = useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,files,starred,updated_at,published")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["projects"] });
  const list = (projects ?? []).filter((p) => (tab === "all" || p.starred) && p.name.toLowerCase().includes(q.toLowerCase()));
  const name = (user?.user_metadata?.["full_name"] as string) || user?.email?.split("@")[0];

  const act = async (fn: () => PromiseLike<{ error: unknown }>) => {
    const { error } = await fn();
    if (error) toast.error(t("error"));
    refresh();
  };

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center gap-3 px-4 border-b border-border/60">
        <Logo />
        <div className="ms-auto flex items-center gap-2">
          <LangToggle />
          <UserMenu />
        </div>
      </header>
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-hero opacity-50" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">{t("dash_greeting")} <span className="text-gradient">{name}</span>؟</h1>
          <PromptBox />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold me-4">{t("dash_title")}</h2>
          <div className="flex rounded-lg bg-secondary p-1 text-sm">
            {(["all", "starred"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-1 rounded-md ${tab === k ? "bg-background" : "text-muted-foreground"}`}>
                {k === "all" ? t("dash_all") : t("dash_starred")}
              </button>
            ))}
          </div>
          <div className="relative ms-auto w-full sm:w-64">
            <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("dash_search")} className="ps-8" />
          </div>
          <Button
            onClick={async () => {
              const id = await createProject(user!.id, locale === "ar" ? "مشروع جديد" : "New project");
              nav({ to: "/project/$id", params: { id } });
            }}
          >
            <Plus /> {t("dash_new")}
          </Button>
        </div>
        {projects && list.length === 0 && <p className="mt-12 text-center text-muted-foreground">{t("dash_empty")}</p>}
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((p) => (
            <div key={p.id} className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors">
              <Link to="/project/$id" params={{ id: p.id }}>
                <SiteThumb files={p.files as Files} />
              </Link>
              <div className="flex items-center gap-1 p-3">
                <div className="min-w-0 flex-1">
                  <Link to="/project/$id" params={{ id: p.id }} className="block font-medium truncate">{p.name}</Link>
                  <div className="text-xs text-muted-foreground">
                    {t("edited")} {new Date(p.updated_at).toLocaleDateString(locale === "ar" ? "ar" : "en")}
                    {p.published && <span className="ms-2 text-primary">● {t("ed_published")}</span>}
                  </div>
                </div>
                <button onClick={() => act(() => supabase.from("projects").update({ starred: !p.starred }).eq("id", p.id))} aria-label="star">
                  <Star className={`size-4 ${p.starred ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-7"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const n = prompt(t("rename"), p.name);
                        if (n?.trim()) act(() => supabase.from("projects").update({ name: n.trim().slice(0, 60) }).eq("id", p.id));
                      }}
                    >
                      {t("rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        await createProject(user!.id, `${p.name} (2)`, p.files as Files);
                        refresh();
                      }}
                    >
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(t("confirm_delete"))) act(() => supabase.from("projects").delete().eq("id", p.id));
                      }}
                    >
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
