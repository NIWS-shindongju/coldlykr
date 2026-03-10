import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import Contacts from "./pages/Contacts";
import Domains from "./pages/Domains";
import Pricing from "./pages/Pricing";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/campaigns" element={<Campaigns />} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/domains" element={<Domains />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard/*" element={<AppRoutes />} />
          <Route path="/campaigns" element={<AppRoutes />} />
          <Route path="/contacts" element={<AppRoutes />} />
          <Route path="/domains" element={<AppRoutes />} />
          <Route path="/pricing" element={<AppRoutes />} />
          <Route path="/settings" element={<AppRoutes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
