import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
