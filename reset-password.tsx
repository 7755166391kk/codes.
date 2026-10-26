import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور — بنّاء" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك في بنّاء." },
      { property: "og:title", content: "استعادة كلمة المرور — بنّاء" },
      { property: "og:description", content: "عيّن كلمة مرور جديدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => {
    const { t } = useI18n();
    const nav = useNavigate();
    const [pw, setPw] = useState("");
    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { toast.error(error.message); return; }
      toast.success(t("saved"));
      nav({ to: "/dashboard" });
    };
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-8">
          <h1 className="text-xl font-bold">{t("auth_new_password")}</h1>
          <Input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" />
          <Button className="w-full">{t("auth_save_password")}</Button>
        </form>
      </div>
    );
  },
});
