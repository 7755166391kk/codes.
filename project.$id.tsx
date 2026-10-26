import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  ArrowUp, Code2, Download, ExternalLink, FileCode2, Globe, History, ImagePlus, Loader2, Monitor,
  MousePointerClick, RotateCw, Settings2, Smartphone, Square, Tablet, X, Eye, MessageSquare, ListChecks, Hammer, Check, Copy,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { LangToggle, UserMenu } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { buildDoc, pages, parseAI, type Files } from "@/lib/preview";
import type { Database } from "@/integrations/supabase/types";
import { DAILY_LIMIT, usedToday } from "@/lib/projects";

const CodePane = lazy(() => import("@/components/editor/CodePane"));

export const Route = createFileRoute("/_authenticated/project/$id")({
  validateSearch: z.object({ prompt: z.string().optional() }),
  head: () => ({ meta: [{ title: "المحرر — بنّاء" }, { name: "robots", content: "noindex" }] }),
  component: Editor,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string };
type Selected = { selector: string; html: string; text: string } | null;

function Editor() {
  const { id } = Route.useParams();
  const { prompt: initialPrompt } = Route.useSearch();
  const nav = useNavigate();
  const { t } = useI18n();
  const { user, session } = useAuth();
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: savedMsgs } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () =>
      ((await supabase.from("messages").select("id,role,content,created_at").eq("project_id", id).order("created_at")).data ?? []) as Msg[],
  });
  const { data: used = 0, refetch: refetchUsage } = useQuery({
    queryKey: ["usage", user?.id],
    enabled: !!user,
    queryFn: () => usedToday(user!.id),
  });

  const [files, setFiles] = useState<Files>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mode, setMode] = useState<"build" | "plan">("build");
  const [tab, setTab] = useState<"preview" | "code" | "history">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [page, setPage] = useState("index.html");
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  const [activeFile, setActiveFile] = useState("index.html");
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  const codeSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (project) setFiles((project.files as Files) ?? {});
  }, [project]);
  useEffect(() => {
    if (savedMsgs) setMsgs(savedMsgs);
  }, [savedMsgs]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streaming]);

  // live preview: merge completed files from the stream
  const liveFiles = useMemo(() => {
    if (!streaming) return files;
    const p = parseAI(streaming);
    return { ...files, ...p.files };
  }, [files, streaming]);
  const doc = useMemo(() => buildDoc(liveFiles, page), [liveFiles, page, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (d?.__bannaa === "picked") {
        setSelected({ selector: d.selector, html: d.html, text: d.text });
        setPicking(false);
      } else if (d?.__bannaa === "nav" && liveFiles[d.page]) setPage(d.page);
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [liveFiles]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ __bannaa: "pick", on: picking }, "*");
  }, [picking]);

  const send = useCallback(
    async (text: string, forceMode?: "build" | "plan") => {
      if (!user || !session || streaming !== null || !text.trim()) return;
      const m = forceMode ?? mode;
      const history = msgs.slice(-12).map((x) => ({ role: x.role, content: x.content }));
      const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() };
      setMsgs((p) => [...p, userMsg]);
      setInput("");
      const imgs = images;
      const sel = selected;
      setImages([]);
      setSelected(null);
      setStreaming("");
      setMobileView("chat");
      await supabase.from("messages").insert({ project_id: id, user_id: user.id, role: "user", content: text });

      const ac = new AbortController();
      abortRef.current = ac;
      let raw = "";
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          signal: ac.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            mode: m,
            history,
            prompt: text,
            images: imgs,
            files,
            instructions: project?.instructions,
            selected: sel ? { selector: sel.selector, html: sel.html } : null,
          }),
        });
        if (res.status === 429) throw new Error(t("ed_limit"));
        if (!res.ok || !res.body) throw new Error(t("error"));
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += dec.decode(value, { stream: true });
          setStreaming(raw);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
      } finally {
        abortRef.current = null;
        refetchUsage();
      }

      if (raw.trim()) {
        const parsed = parseAI(raw);
        const changed = Object.keys(parsed.files).length > 0;
        const next = { ...files, ...parsed.files };
        if (changed) {
          setFiles(next);
          await supabase.from("projects").update({ files: next, updated_at: new Date().toISOString() }).eq("id", id);
          await supabase.from("project_versions").insert({ project_id: id, user_id: user.id, files: next, label: text.slice(0, 120) });
          qc.invalidateQueries({ queryKey: ["versions", id] });
          if (!next[page]) setPage("index.html");
        }
        const { data } = await supabase
          .from("messages")
          .insert({ project_id: id, user_id: user.id, role: "assistant", content: raw })
          .select("id,role,content,created_at")
          .single();
        if (data) setMsgs((p) => [...p, data as Msg]);
        if (changed && window.innerWidth < 768) setMobileView("preview");
      }
      setStreaming(null);
    },
    [user, session, streaming, mode, msgs, images, selected, id, files, project, t, refetchUsage, qc, page],
  );

  useEffect(() => {
    if (!autoStarted.current && initialPrompt && savedMsgs && savedMsgs.length === 0 && project && session) {
      autoStarted.current = true;
      nav({ to: "/project/$id", params: { id }, search: {}, replace: true });
      send(initialPrompt);
    }
  }, [initialPrompt, savedMsgs, project, session, send, nav, id]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    list.forEach((f) => {
      if (f.size > 4_000_000) { toast.error("Max 4MB"); return; }
      const r = new FileReader();
      r.onload = () => setImages((p) => [...p, String(r.result)].slice(0, 4));
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const onCodeChange = (path: string, v: string) => {
    setFiles((p) => {
      const next = { ...p, [path]: v };
      clearTimeout(codeSaveTimer.current);
      codeSaveTimer.current = setTimeout(() => {
        supabase.from("projects").update({ files: next, updated_at: new Date().toISOString() }).eq("id", id);
      }, 800);
      return next;
    });
  };

  const download = async () => {
    const zip = new JSZip();
    Object.entries(files).forEach(([p, c]) => zip.file(p, c));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project?.name ?? "site"}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openTab = () => {
    const w = window.open();
    if (w) {
      w.document.open();
      w.document.write(buildDoc(files, page, { picker: false }));
      w.document.close();
    }
  };

  if (isLoading) return <div className="h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (!project) return <div className="h-screen grid place-items-center">{t("not_found")}</div>;

  const hasFiles = Object.keys(liveFiles).length > 0;
  const left = Math.max(0, DAILY_LIMIT - used);
  const widths = { desktop: "100%", tablet: "768px", mobile: "390px" };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-dvh flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center gap-2 border-b border-border px-3">
          <Link to="/dashboard"><LogoMark className="size-7" /></Link>
          <button onClick={() => setSettingsOpen(true)} className="min-w-0 truncate font-medium hover:text-primary max-w-[40vw]">
            {project.name}
          </button>
          <div className="hidden md:flex ms-6 rounded-lg bg-secondary p-1 text-sm">
            {([
              ["preview", Eye, t("ed_preview")],
              ["code", Code2, t("ed_code")],
              ["history", History, t("ed_history")],
            ] as const).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${tab === k ? "bg-background" : "text-muted-foreground"}`}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="ms-auto flex items-center gap-1">
            <Tip label={t("ed_download")}><Button size="icon" variant="ghost" onClick={download} disabled={!hasFiles}><Download /></Button></Tip>
            <Tip label={t("ed_settings")}><Button size="icon" variant="ghost" onClick={() => setSettingsOpen(true)}><Settings2 /></Button></Tip>
            <span className="hidden sm:inline-flex"><LangToggle /></span>
            <Button size="sm" onClick={() => setSettingsOpen(true)} className="rounded-full">
              <Globe /> {project.published ? t("ed_published") : t("ed_publish")}
            </Button>
            <UserMenu />
          </div>
        </header>

        {/* Mobile switch */}
        <div className="md:hidden flex border-b border-border text-sm">
          {(["chat", "preview"] as const).map((k) => (
            <button key={k} onClick={() => setMobileView(k)} className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${mobileView === k ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>
              {k === "chat" ? <MessageSquare className="size-4" /> : <Eye className="size-4" />}
              {k === "chat" ? t("ed_chat") : t("ed_preview")}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Chat */}
          <section className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex w-full md:w-[400px] lg:w-[440px] shrink-0 flex-col border-e border-border bg-surface min-h-0`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {msgs.length === 0 && streaming === null && (
                <div className="mt-10 text-center text-muted-foreground">
                  <LogoMark className="size-12 mx-auto" />
                  <p className="mt-4">{t("ed_empty_chat")}</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <ChatMessage key={m.id} m={m} onImplement={i === msgs.length - 1 && streaming === null && m.role === "assistant" && !/<file/.test(m.content) ? () => { setMode("build"); send(t("ed_implement"), "build"); } : undefined} />
              ))}
              {streaming !== null && <ChatMessage m={{ id: "s", role: "assistant", content: streaming, created_at: "" }} live />}
              <div ref={chatEnd} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-border">
              {selected && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs">
                  <MousePointerClick className="size-3.5 text-primary shrink-0" />
                  <span className="truncate" dir="ltr">{selected.selector}</span>
                  <button className="ms-auto" onClick={() => setSelected(null)}><X className="size-3.5" /></button>
                </div>
              )}
              {images.length > 0 && (
                <div className="mb-2 flex gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="size-14 rounded-lg object-cover border border-border" />
                      <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -end-1.5 size-5 rounded-full bg-foreground text-background grid place-items-center"><X className="size-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border border-border bg-card p-2 focus-within:border-primary/50 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  onPaste={(e) => {
                    const f = Array.from(e.clipboardData.files).filter((x) => x.type.startsWith("image/"));
                    if (f.length) onPickImage({ target: { files: f, value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>);
                  }}
                  rows={2}
                  placeholder={t("ed_placeholder")}
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground max-h-40"
                />
                <div className="flex items-center gap-1">
                  <Tip label={t("ed_attach")}>
                    <label className="size-8 grid place-items-center rounded-lg hover:bg-accent cursor-pointer text-muted-foreground">
                      <ImagePlus className="size-4" />
                      <input type="file" accept="image/*" multiple hidden onChange={onPickImage} />
                    </label>
                  </Tip>
                  <Tip label={t("ed_select")}>
                    <button
                      disabled={!hasFiles}
                      onClick={() => { setTab("preview"); setMobileView("preview"); setPicking((p) => !p); }}
                      className={`size-8 grid place-items-center rounded-lg hover:bg-accent disabled:opacity-40 ${picking ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                    >
                      <MousePointerClick className="size-4" />
                    </button>
                  </Tip>
                  <div className="flex rounded-lg bg-secondary p-0.5 text-xs ms-1">
                    {(["build", "plan"] as const).map((k) => (
                      <button key={k} onClick={() => setMode(k)} className={`flex items-center gap-1 px-2 py-1 rounded-md ${mode === k ? "bg-background text-foreground" : "text-muted-foreground"}`}>
                        {k === "build" ? <Hammer className="size-3" /> : <ListChecks className="size-3" />}
                        {k === "build" ? t("ed_build") : t("ed_plan")}
                      </button>
                    ))}
                  </div>
                  <span className="ms-auto text-[11px] text-muted-foreground hidden sm:inline">{left} {t("ed_left_today")}</span>
                  {streaming !== null ? (
                    <button onClick={() => abortRef.current?.abort()} className="size-8 rounded-full bg-foreground text-background grid place-items-center" aria-label={t("ed_stop")}>
                      <Square className="size-3.5 fill-current" />
                    </button>
                  ) : (
                    <button onClick={() => send(input)} disabled={!input.trim()} className="size-8 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-30" aria-label="send">
                      <ArrowUp className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right panel */}
          <section className={`${mobileView === "preview" ? "flex" : "hidden"} md:flex flex-1 min-w-0 flex-col min-h-0`}>
            {tab === "preview" && (
              <>
                <div className="h-11 shrink-0 flex items-center gap-1 px-3 border-b border-border">
                  {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([k, Icon]) => (
                    <Button key={k} size="icon" variant="ghost" className={`size-8 ${device === k ? "bg-accent" : ""}`} onClick={() => setDevice(k)}><Icon /></Button>
                  ))}
                  <div className="mx-2 flex-1 min-w-0 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1 text-xs text-muted-foreground" dir="ltr">
                    <span className="truncate">/{page === "index.html" ? "" : page}</span>
                    {pages(liveFiles).length > 1 && (
                      <select value={page} onChange={(e) => setPage(e.target.value)} className="ms-auto bg-transparent outline-none">
                        {pages(liveFiles).map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                  </div>
                  <Tip label={t("ed_refresh")}><Button size="icon" variant="ghost" className="size-8" onClick={() => setReloadKey((k) => k + 1)}><RotateCw /></Button></Tip>
                  <Tip label={t("ed_open")}><Button size="icon" variant="ghost" className="size-8" onClick={openTab} disabled={!hasFiles}><ExternalLink /></Button></Tip>
                </div>
                <div className="flex-1 min-h-0 bg-secondary/40 grid place-items-center overflow-auto p-0 md:p-3">
                  {hasFiles ? (
                    <iframe
                      key={reloadKey}
                      ref={iframeRef}
                      title="preview"
                      srcDoc={doc}
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      onLoad={() => picking && iframeRef.current?.contentWindow?.postMessage({ __bannaa: "pick", on: true }, "*")}
                      className="h-full bg-background md:rounded-xl border-0 md:border border-border shadow-2xl transition-[width] duration-300"
                      style={{ width: widths[device], maxWidth: "100%" }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      {streaming !== null ? <Loader2 className="mx-auto size-8 animate-spin text-primary" /> : <div className="mx-auto size-24 rounded-3xl bg-hero" />}
                      <p className="mt-4">{t("ed_empty_preview")}</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {tab === "code" && (
              <Suspense fallback={<div className="p-6"><Loader2 className="animate-spin" /></div>}>
                {hasFiles ? (
                  <CodePane files={files} active={files[activeFile] !== undefined ? activeFile : (Object.keys(files)[0] ?? "index.html")} setActive={setActiveFile} onChange={onCodeChange} />
                ) : (
                  <div className="p-6 text-muted-foreground">{t("ed_empty_preview")}</div>
                )}
              </Suspense>
            )}
            {tab === "history" && (
              <HistoryPane
                projectId={id}
                onRestore={async (f) => {
                  setFiles(f);
                  await supabase.from("projects").update({ files: f, updated_at: new Date().toISOString() }).eq("id", id);
                  toast.success(t("ed_restored"));
                  setTab("preview");
                }}
              />
            )}
          </section>
        </div>
      </div>
      <ProjectSettings open={settingsOpen} onOpenChange={setSettingsOpen} project={project} files={files} onSaved={() => qc.invalidateQueries({ queryKey: ["project", id] })} />
    </TooltipProvider>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ChatMessage({ m, live, onImplement }: { m: Msg; live?: boolean; onImplement?: (() => void) | undefined }) {
  const { t } = useI18n();
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-se-sm bg-secondary px-4 py-2.5 text-sm whitespace-pre-wrap">{m.content}</div>
      </div>
    );
  }
  const p = parseAI(m.content);
  const parts = p.text.split(/(\[\[(?:file|writing):[^\]]+\]\])/g);
  return (
    <div className="flex gap-3">
      <LogoMark className="size-7 shrink-0" />
      <div className="min-w-0 flex-1 text-sm leading-relaxed space-y-2">
        {live && !p.text && <span className="text-muted-foreground">{t("ed_thinking")}<span className="animate-caret">▍</span></span>}
        {parts.map((part, i) => {
          const fm = part.match(/^\[\[(file|writing):(.+)\]\]$/);
          if (fm) {
            const writing = fm[1] === "writing";
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs" dir="ltr">
                {writing ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Check className="size-3.5 text-primary" />}
                <FileCode2 className="size-3.5 text-muted-foreground" />
                <span className="truncate">{fm[2]}</span>
                {writing && <span className="ms-auto text-muted-foreground">{t("ed_building")}…</span>}
              </div>
            );
          }
          if (!part.trim()) return null;
          return (
            <div key={i} className="prose-chat">
              <ReactMarkdown>{part}</ReactMarkdown>
            </div>
          );
        })}
        {onImplement && (
          <Button size="sm" className="mt-1 rounded-full" onClick={onImplement}><Hammer /> {t("ed_implement")}</Button>
        )}
      </div>
    </div>
  );
}

function HistoryPane({ projectId, onRestore }: { projectId: string; onRestore: (f: Files) => void }) {
  const { t, locale } = useI18n();
  const { data } = useQuery({
    queryKey: ["versions", projectId],
    queryFn: async () =>
      (await supabase.from("project_versions").select("id,label,files,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {data?.map((v, i) => (
        <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <History className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{v.label || "—"}</div>
            <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString(locale === "ar" ? "ar" : "en")}</div>
          </div>
          {i > 0 && <Button size="sm" variant="secondary" onClick={() => onRestore(v.files as Files)}>{t("ed_restore")}</Button>}
        </div>
      ))}
    </div>
  );
}

type ProjectRow = {
  id: string; name: string; description: string | null; instructions: string | null;
  published: boolean; in_gallery: boolean; slug: string | null;
};

function ProjectSettings({ open, onOpenChange, project, files, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; project: ProjectRow; files: Files; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? "");
  const [instr, setInstr] = useState(project.instructions ?? "");
  const [slug, setSlug] = useState(project.slug ?? project.id.slice(0, 8));
  const [gallery, setGallery] = useState(project.in_gallery);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) {
      setName(project.name); setDesc(project.description ?? ""); setInstr(project.instructions ?? "");
      setSlug(project.slug ?? project.id.slice(0, 8)); setGallery(project.in_gallery);
    }
  }, [open, project]);
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || project.id.slice(0, 8);
  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${cleanSlug}` : "";

  const save = async (publish?: boolean) => {
    setBusy(true);
    const patch: Database["public"]["Tables"]["projects"]["Update"] = {
      name: name.trim().slice(0, 60) || "Untitled",
      description: desc.slice(0, 300) || null,
      instructions: instr.slice(0, 4000) || null,
      in_gallery: gallery,
      slug: cleanSlug,
    };
    if (publish === true) {
      if (!files["index.html"]) { setBusy(false); toast.error("index.html"); return; }
      Object.assign(patch, { published: true, published_files: files });
    } else if (publish === false) {
      Object.assign(patch, { published: false, in_gallery: false });
    }
    const { error } = await supabase.from("projects").update(patch).eq("id", project.id);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? `${t("ps_slug")} ✕` : t("error")); return; }
    toast.success(t("saved"));
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("ed_settings")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("ps_name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("ps_desc")}</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{t("ps_instructions")}</Label>
            <Textarea value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={t("ps_instructions_hint")} rows={3} />
          </div>
          <Button variant="secondary" onClick={() => save()} disabled={busy}>{t("save")}</Button>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium"><Globe className="size-4 text-primary" /> {t("ps_publish")}</div>
            <div className="space-y-1.5">
              <Label>{t("ps_slug")}</Label>
              <div className="flex items-center rounded-md border border-input text-sm" dir="ltr">
                <span className="px-2 text-muted-foreground">/p/</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="flex-1 bg-transparent py-2 pe-2 outline-none" />
              </div>
            </div>
            <label className="flex items-center justify-between text-sm">
              {t("ps_gallery")}
              <Switch checked={gallery} onCheckedChange={setGallery} />
            </label>
            {project.published && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs" dir="ltr">
                <a href={url} target="_blank" rel="noreferrer" className="truncate text-primary">{url}</a>
                <button className="ms-auto" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => save(true)} disabled={busy} className="flex-1">
                {busy && <Loader2 className="animate-spin" />}
                {project.published ? t("ps_update_publish") : t("ed_publish")}
              </Button>
              {project.published && <Button variant="outline" onClick={() => save(false)} disabled={busy}>✕</Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
