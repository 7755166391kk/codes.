import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteHeader";
import { FeatureGrid } from "@/components/FeatureGrid";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "الميزات — بنّاء" },
      { name: "description", content: "بناء بالمحادثة، معاينة حية، محرر كود، سجل نسخ، نشر فوري وأكثر." },
      { property: "og:title", content: "ميزات بنّاء" },
      { property: "og:description", content: "كل ما تحتاجه لبناء مواقعك بالذكاء الاصطناعي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const { t } = useI18n();
    return (
      <PageShell>
        <section className="mx-auto max-w-7xl px-4 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-center">{t("feat_title")}</h1>
          <FeatureGrid className="mt-14" />
        </section>
      </PageShell>
    );
  },
});
