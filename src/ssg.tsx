import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StreetPage from "@/pages/StreetPage";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteLoading from "@/components/RouteLoading";
import { STREET_SLUGS } from "@/utils/streetSlug";

type HelmetContext = { helmet?: Record<string, { toString: () => string }> };

export { STREET_SLUGS };

export function renderStreetPage(slug: string) {
  const helmetContext: HelmetContext = {};
  const queryClient = new QueryClient();
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
            <MemoryRouter initialEntries={[`/ulica/${slug}`]}>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/ulica/:slug" element={<StreetPage />} />
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
