import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { POST_AUTH_DESTINATION_KEY } from "@/utils/postAuthRedirect";
import Index from "./pages/Index";
import About from "./pages/About";
import TermsAndPrivacy from "./pages/TermsAndPrivacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Statystyki from "./pages/Statystyki";
import Push from "./pages/Push";
import Rss from "./pages/Rss";
import Coupons from "./pages/Coupons";
import Kupon from "./pages/Kupon";
import Auth from "./pages/Auth";
import Konto from "./pages/Konto";
import Errors from "./pages/Errors";
import StreetPage from "./pages/StreetPage";

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
          <Route path="/ulica/:slug" element={<StreetPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
