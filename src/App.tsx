import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Index from "./pages/Index";
import OrderPage from "./pages/OrderPage";
import TrackPage from "./pages/TrackPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import DashboardPage from "./pages/DashboardPage";
import ReferralCapture from "./components/ReferralCapture";
import ScrollToHash from "./components/ScrollToHash";
import StickyGrowthCta from "./components/StickyGrowthCta";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundPage from "./pages/RefundPage";
import DeliveryPage from "./pages/DeliveryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToHash />
        <ReferralCapture />
        <Navbar />
        <div className="pb-24 md:pb-0 min-h-[60vh]">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund" element={<RefundPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <StickyGrowthCta />
        <WhatsAppButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
