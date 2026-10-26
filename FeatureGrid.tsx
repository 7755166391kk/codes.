import { MessagesSquare, MonitorSmartphone, Code2, ListChecks, MousePointerClick, History, ImageIcon, Globe, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function FeatureGrid({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const items = [
    [MessagesSquare, t("f_chat_t"), t("f_chat_d")],
    [MonitorSmartphone, t("f_preview_t"), t("f_preview_d")],
    [Code2, t("f_code_t"), t("f_code_d")],
    [ListChecks, t("f_plan_t"), t("f_plan_d")],
    [MousePointerClick, t("f_select_t"), t("f_select_d")],
    [History, t("f_history_t"), t("f_history_d")],
    [ImageIcon, t("f_image_t"), t("f_image_d")],
    [Globe, t("f_publish_t"), t("f_publish_d")],
    [Download, t("f_export_t"), t("f_export_d")],
  ] as const;
  return (
    <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {items.map(([Icon, title, d]) => (
        <div key={title} className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
          <Icon className="size-6 text-primary" />
          <h3 className="mt-4 font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{d}</p>
        </div>
      ))}
    </div>
  );
}
