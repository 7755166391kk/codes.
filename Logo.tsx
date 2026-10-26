import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`relative inline-grid place-items-center rounded-lg bg-brand shadow-glow ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[60%] text-primary-foreground" fill="currentColor" aria-hidden>
        <path d="M4 20V10l8-6 8 6v10h-5v-6H9v6z" />
      </svg>
    </span>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
      <LogoMark />
      <span>{t("brand")}</span>
    </Link>
  );
}
