import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ContainerView from "./pages/ContainerView";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import RegisterSuccess from "./pages/RegisterSuccess";
import RegisterCancel from "./pages/RegisterCancel";
import PrivateRoute from "./components/PrivateRoute";
import ViewerDashboard from "./pages/ViewerDashboard";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import Guide from "./pages/Guide";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/success" element={<RegisterSuccess />} />
              <Route path="/register/cancel" element={<RegisterCancel />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/c/:uuid" element={<ContainerView />} />
              <Route path="/view/:shareToken" element={<ViewerDashboard />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
              <Route path="/guide" element={<Guide />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
