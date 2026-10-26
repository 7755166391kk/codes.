import { buildDoc, type Files } from "@/lib/preview";

/** Static, non-interactive scaled thumbnail of a generated site. */
export function SiteThumb({ files }: { files: Files | null | undefined }) {
  const doc = files && files["index.html"] ? buildDoc(files, "index.html", { picker: false }) : "";
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-surface">
      {doc ? (
        <iframe
          title="thumb"
          srcDoc={doc}
          sandbox="allow-scripts"
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute top-0 start-0 origin-top-left w-[400%] h-[400%] scale-25 border-0 bg-background"
          style={{ transform: "scale(0.25)", transformOrigin: "top left", left: 0, right: "auto" }}
        />
      ) : (
        <div className="absolute inset-0 bg-hero opacity-60" />
      )}
    </div>
  );
}
