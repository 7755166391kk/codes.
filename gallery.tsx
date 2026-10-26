import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/SiteHeader";
import { SiteThumb } from "@/components/SitePreview";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createProject } from "@/lib/projects";
import { useGallery } from "./index";
import type { Files } from "@/lib/preview";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "معرض المجتمع — بنّاء" },
      { name: "description", content: "استكشف المواقع التي بناها مجتمع بنّاء وانسخ أي مشروع لتبدأ منه." },
      { property: "og:title", content: "معرض مجتمع بنّاء" },
      { property: "og:description", content: "مواقع بُنيت بالذكاء الاصطناعي على بنّاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data } = useGallery(60);
  const remix = async (name: string, files: Files) => {
    if (!user) return nav({ to: "/auth" });
    try {
      const id = await createProject(user.id, `${name} (remix)`, files);
      nav({ to: "/project/$id", params: { id } });
    } catch {
      toast.error(t("error"));
    }
  };
  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold">{t("gallery_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("gallery_sub")}</p>
        {data && data.length === 0 && <p className="mt-12 text-muted-foreground">{t("gallery_empty")}</p>}
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.map((p) => (
            <div key={p.id} className="rounded-2xl overflow-hidden border border-border bg-card">
              <SiteThumb files={p.published_files as Files} />
              <div className="p-4 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
                </div>
                <Button size="icon" variant="ghost" asChild>
                  <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink /></a>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => remix(p.name, p.published_files as Files)}>
                  <Copy /> {t("remix")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
