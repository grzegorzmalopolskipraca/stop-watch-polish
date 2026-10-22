import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { POST_AUTH_DESTINATION_KEY } from "@/utils/postAuthRedirect";
import RouteLoading from "@/components/RouteLoading";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const TermsAndPrivacy = lazy(() => import("./pages/TermsAndPrivacy"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Statystyki = lazy(() => import("./pages/Statystyki"));
const Push = lazy(() => import("./pages/Push"));
const Rss = lazy(() => import("./pages/Rss"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Kupon = lazy(() => import("./pages/Kupon"));
const Auth = lazy(() => import("./pages/Auth"));
const Konto = lazy(() => import("./pages/Konto"));
const Errors = lazy(() => import("./pages/Errors"));
const StreetPage = lazy(() => import("./pages/StreetRoute"));
const WroclawRoadDirectory = lazy(() => import("./pages/WroclawRoadDirectory"));

const queryClient = new QueryClient();

const PostAuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToPendingDestination = (hasUser: boolean) => {
      if (!hasUser || sessionStorage.getItem(POST_AUTH_DESTINATION_KEY) !== "/konto") {
        return;
      }

      sessionStorage.removeItem(POST_AUTH_DESTINATION_KEY);
      navigate("/konto", { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectToPendingDestination(Boolean(session?.user));
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      redirectToPendingDestination(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PostAuthRedirect />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/o-projekcie" element={<About />} />
            <Route path="/regulamin" element={<TermsAndPrivacy />} />
            <Route path="/kontakt" element={<Contact />} />
            <Route path="/statystyki" element={<Statystyki />} />
            <Route path="/push" element={<Push />} />
            <Route path="/rss" element={<Rss />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/kupon" element={<Kupon />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/konto" element={<Konto />} />
            <Route path="/errors" element={<Errors />} />
            <Route path="/ulice-wroclawia" element={<WroclawRoadDirectory />} />
            <Route path="/ulica/:slug" element={<StreetPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
