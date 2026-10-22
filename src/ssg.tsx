import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StreetPage from "@/pages/StreetPage";
import UnmonitoredRoadPage from "@/pages/UnmonitoredRoadPage";
import WroclawRoadDirectory from "@/pages/WroclawRoadDirectory";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteLoading from "@/components/RouteLoading";
import { slugToStreet, STREET_SLUGS } from "@/utils/streetSlug";
import { UNMONITORED_ROADS } from "@/utils/wroclawRoadCatalog";

type HelmetContext = { helmet?: Record<string, { toString: () => string }> };

export { STREET_SLUGS };
export const PRERENDER_PATHS = [
  ...STREET_SLUGS.map(({ slug }) => `/ulica/${slug}`),
  ...UNMONITORED_ROADS.map(({ pageSlug }) => `/ulica/${pageSlug}`),
  "/ulice-wroclawia",
];

export function renderPage(path: string) {
  const helmetContext: HelmetContext = {};
  const queryClient = new QueryClient();
  const slug = path.split("/").filter(Boolean).at(-1) ?? "";
  const streetPage = slugToStreet(slug) ? <StreetPage /> : <UnmonitoredRoadPage />;
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    if (message.startsWith("Warning: useLayoutEffect does nothing on the server")) return;
    originalConsoleError(...args);
  };
  let markup: string;
  try {
    markup = renderToString(
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MemoryRouter initialEntries={[path]}>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/ulica/:slug" element={streetPage} />
                  <Route path="/ulice-wroclawia" element={<WroclawRoadDirectory />} />
                </Routes>
              </Suspense>
            </MemoryRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>,
    );
  } finally {
    console.error = originalConsoleError;
  }
  const helmet = helmetContext.helmet;
  const head = helmet
    ? [helmet.title, helmet.meta, helmet.link, helmet.script]
        .filter(Boolean)
        .map((tag) => tag!.toString())
        .join("\n")
    : "";

  return { markup, head };
}

export function renderStreetPage(slug: string) {
  return renderPage(`/ulica/${slug}`);
}
