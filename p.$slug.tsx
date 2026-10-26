import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildDoc, type Files } from "@/lib/preview";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("projects")
      .select("name,description,published_files")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data?.published_files) throw notFound();
    return { name: data.name, description: data.description, files: data.published_files as Files };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.name },
          { name: "description", content: loaderData.description ?? `${loaderData.name} — built with Bannaa` },
          { property: "og:title", content: loaderData.name },
          { property: "og:description", content: loaderData.description ?? "Built with Bannaa" },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Unavailable" }, { name: "robots", content: "noindex" }],
  }),
  component: Published,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center">404</div>,
});

function Published() {
  const { files } = Route.useLoaderData();
  const [page, setPage] = useState("index.html");
  return (
    <div className="fixed inset-0">
      <iframe
        title="site"
        srcDoc={buildDoc(files, page)}
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        className="size-full border-0 bg-background"
        onLoad={() => {
          const h = (e: MessageEvent) => {
            if (e.data?.__bannaa === "nav" && files[e.data.page]) setPage(e.data.page);
          };
          window.onmessage = h;
        }}
      />
      <a href="/" target="_blank" rel="noreferrer" className="fixed bottom-3 end-3 rounded-full bg-card/90 border border-border px-3 py-1 text-xs backdrop-blur">
        Built with <span className="text-gradient font-semibold">Bannaa</span>
      </a>
    </div>
  );
}
