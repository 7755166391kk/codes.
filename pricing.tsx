import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageShell } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار — بنّاء مجاني بالكامل" },
      { name: "description", content: "بنّاء مجاني بالكامل: مشاريع غير محدودة، نشر، تنزيل الكود." },
      { property: "og:title", content: "أسعار بنّاء" },
      { property: "og:description", content: "مجاني. بالكامل. بدون اشتراكات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const { t } = useI18n();
    const feats = [t("plan_f1"), t("plan_f2"), t("plan_f3"), t("plan_f4"), t("plan_f5")];
    return (
      <PageShell>
        <section className="relative mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="pointer-events-none absolute inset-0 bg-hero opacity-60" />
          <div className="relative">
            <h1 className="text-4xl md:text-6xl font-bold">{t("pricing_title")}</h1>
            <p className="mt-4 text-muted-foreground">{t("pricing_sub")}</p>
            <div className="mx-auto mt-12 max-w-sm rounded-3xl border border-primary/40 bg-card p-8 text-start shadow-glow">
              <div className="text-lg font-semibold">{t("plan_free")}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-6xl font-bold">${t("plan_price")}</span>
                <span className="text-muted-foreground">/ {t("plan_per")}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {feats.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="size-5 text-primary" />{f}</li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full rounded-full" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav_start")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageShell>
    );
  },
});
