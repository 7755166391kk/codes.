import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Languages, LogOut, Menu, Settings, FolderOpen } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
      <Languages /> {locale === "ar" ? "EN" : "عربي"}
    </Button>
  );
}

export function UserMenu() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  if (!user) return null;
  const name = (user.user_metadata?.["full_name"] as string) || user.email || "?";
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="size-8 rounded-full bg-brand text-primary-foreground text-sm font-semibold grid place-items-center">
          {name[0]?.toUpperCase()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard"><FolderOpen /> {t("nav_dashboard")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings"><Settings /> {t("nav_settings")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}><LogOut /> {t("nav_logout")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/features", label: t("nav_features") },
    { to: "/gallery", label: t("nav_gallery") },
    { to: "/pricing", label: t("nav_pricing") },
    { to: "/faq", label: t("nav_faq") },
    { to: "/about", label: t("nav_about") },
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LangToggle />
          {user ? (
            <>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link to="/dashboard">{t("nav_dashboard")}</Link>
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav_login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav_start")}</Link>
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
            <Menu />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-border/60 px-4 py-2 flex flex-col">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-muted-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-7xl px-4 py-10 flex flex-col md:flex-row gap-6 items-center justify-between text-sm text-muted-foreground">
        <Logo />
        <div className="flex gap-5">
          <Link to="/features">{t("nav_features")}</Link>
          <Link to="/pricing">{t("nav_pricing")}</Link>
          <Link to="/faq">{t("nav_faq")}</Link>
          <Link to="/about">{t("nav_about")}</Link>
        </div>
        <div>© {new Date().getFullYear()} {t("brand")} — {t("footer_rights")}</div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
