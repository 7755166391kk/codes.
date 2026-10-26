import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Eye, Rocket } from "lucide-react";
import { PageShell } from "@/components/SiteHeader";
import { PromptBox } from "@/components/PromptBox";
import { SiteThumb } from "@/components/SitePreview";
import { FeatureGrid } from "@/components/FeatureGrid";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Files } from "@/lib/preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "بنّاء — ابنِ مواقعك بالذكاء الاصطناعي مجانًا" },
      { name: "description", content: "اكتب فكرتك وشاهد موقعك يُبنى أمامك خلال ثوانٍ. منصة عربية مجانية لبناء المواقع بالمحادثة." },
      { property: "og:title", content: "بنّاء — ابنِ مواقعك بالذكاء الاصطناعي" },
      { property: "og:description", content: "منصة مجانية لبناء المواقع بالمحادثة مع الذكاء الاصطناعي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

export function useGallery(limit = 6) {
  return useQuery({
    queryKey: ["gallery", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id,name,slug,description,published_files,updated_at")
        .eq("published", true)
        .eq("in_gallery", true)
        .order("updated_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
  });
}

function Index() {
  const { t } = useI18n();
  const gallery = useGallery(6);
  const steps = [
    [MessageSquare, t("how1_t"), t("how1_d")],
    [Eye, t("how2_t"), t("how2_d")],
    [Rocket, t("how3_t"), t("how3_d")],
  ] as const;
  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-hero animate-float-slow" />
        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-28 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            {t("hero_title_1")} <span className="text-gradient">{t("hero_title_2")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">{t("hero_sub")}</p>
          <div className="mt-10">
            <PromptBox autoFocus />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="rounded-3xl border border-border bg-card/40 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{t("community")}</h2>
            <Link to="/gallery" className="text-sm text-primary">{t("view_all")}</Link>
          </div>
          {gallery.data && gallery.data.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gallery.data.map((p) => (
                <a key={p.id} href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors">
                  <SiteThumb files={p.published_files as Files} />
                  <div className="p-3 font-medium truncate">{p.name}</div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("gallery_empty")}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center">{t("how_title")}</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {steps.map(([Icon, title, d], i) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-xl bg-brand grid place-items-center text-primary-foreground"><Icon className="size-5" /></span>
                <span className="text-muted-foreground text-sm">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center">{t("feat_title")}</h2>
        <FeatureGrid className="mt-10" />
      </section>

      <section className="mx-auto max-w-5xl px-4 mt-24">
        <div className="relative overflow-hidden rounded-3xl border border-border p-12 text-center">
          <div className="absolute inset-0 bg-hero" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold">{t("cta_title")}</h2>
            <Button asChild size="lg" className="mt-8 rounded-full">
              <Link to="/auth" search={{ mode: "signup" }}>{t("cta_btn")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
