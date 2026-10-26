import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { oneDarkish } from "./theme";
import { FileCode2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Files } from "@/lib/preview";

export default function CodePane({
  files,
  active,
  setActive,
  onChange,
}: {
  files: Files;
  active: string;
  setActive: (f: string) => void;
  onChange: (path: string, v: string) => void;
}) {
  const { t } = useI18n();
  const names = Object.keys(files).sort();
  const lang = active.endsWith(".css") ? css() : active.endsWith(".js") ? javascript() : html();
  return (
    <div className="flex h-full min-h-0" dir="ltr">
      <aside className="w-44 shrink-0 border-e border-border bg-surface p-2 overflow-auto text-sm">
        <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">{t("ed_files")}</div>
        {names.map((n) => (
          <button
            key={n}
            onClick={() => setActive(n)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start truncate ${n === active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileCode2 className="size-3.5 shrink-0" /> {n}
          </button>
        ))}
      </aside>
      <div className="flex-1 min-w-0 overflow-auto">
        {files[active] !== undefined && (
          <CodeMirror
            value={files[active]}
            height="100%"
            theme={oneDarkish}
            extensions={[lang]}
            onChange={(v) => onChange(active, v)}
            className="h-full text-[13px] font-mono"
          />
        )}
      </div>
    </div>
  );
}
