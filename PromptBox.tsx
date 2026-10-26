import { useNavigate } from "@tanstack/react-router";
import { ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createProject, titleFromPrompt } from "@/lib/projects";

export function usePromptStart() {
  const { user } = useAuth();
  const nav = useNavigate();
  return async (prompt: string) => {
    if (!user) {
      sessionStorage.setItem("pending_prompt", prompt);
      nav({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    const id = await createProject(user.id, titleFromPrompt(prompt));
    nav({ to: "/project/$id", params: { id }, search: { prompt } });
  };
}

export function PromptBox({ autoFocus }: { autoFocus?: boolean }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const start = usePromptStart();
  const examples = [
    [t("ex1"), t("ex1_p")],
    [t("ex2"), t("ex2_p")],
    [t("ex3"), t("ex3_p")],
    [t("ex4"), t("ex4_p")],
  ];
  const submit = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      await start(value.trim());
    } catch {
      toast.error(t("error"));
      setBusy(false);
    }
  };
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-3 shadow-glow">
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder={t("hero_placeholder")}
          className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!value.trim() || busy}
            className="size-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40 transition-opacity"
            aria-label="send"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("hero_examples")}</span>
        {examples.map(([label, p]) => (
          <button
            key={label}
            onClick={() => setValue(p ?? "")}
            className="rounded-full border border-border bg-card/60 px-3 py-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
