import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — بنّاء" },
      { name: "description", content: "إجابات عن أكثر الأسئلة شيوعًا حول بنّاء." },
      { property: "og:title", content: "الأسئلة الشائعة — بنّاء" },
      { property: "og:description", content: "كل ما تريد معرفته عن بنّاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const { t } = useI18n();
    return (
      <PageShell>
        <section className="mx-auto max-w-3xl px-4 py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-center">{t("faq_title")}</h1>
          <Accordion type="single" collapsible className="mt-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-start text-base">{t(`q${i}` as TKey)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(`a${i}` as TKey)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </PageShell>
    );
  },
});
