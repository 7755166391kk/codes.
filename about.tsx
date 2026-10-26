import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — بنّاء" },
      { name: "description", content: "بنّاء منصة عربية أولاً لبناء المواقع بالذكاء الاصطناعي." },
      { property: "og:title", content: "عن بنّاء" },
      { property: "og:description", content: "منصة عربية أولاً لبناء المواقع بالذكاء الاصطناعي، مجانًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const { t } = useI18n();
    return (
      <PageShell>
        <section className="mx-auto max-w-3xl px-4 py-24 text-center">
          <LogoMark className="size-16 mx-auto" />
          <h1 className="mt-8 text-4xl md:text-5xl font-bold">{t("about_title")}</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t("about_body")}</p>
        </section>
      </PageShell>
    );
  },
});
