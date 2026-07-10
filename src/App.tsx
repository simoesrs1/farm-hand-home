import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { StockProvider } from "./contexts/StockContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FarmerOnboardingGuard from "./components/FarmerOnboardingGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Catalog from "./pages/Catalog";
import CategoryPage from "./pages/CategoryPage";
import About from "./pages/About";
import Mission from "./pages/Mission";
import FarmerProfile from "./pages/FarmerProfile";
import FarmerOnboarding from "./pages/FarmerOnboarding";
import SearchResults from "./pages/SearchResults";
import Cart from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import RateFarmer from "./pages/RateFarmer";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import ScanPickup from "./pages/farmer/ScanPickup";
import NewProduct from "./pages/farmer/NewProduct";
import FarmerInfo from "./pages/farmer/FarmerInfo";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StockProvider>
            <CartProvider>
              <FarmerOnboardingGuard />
              <div className="flex min-h-screen flex-col">
                <Header />
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                    <Route path="/onboarding/agricultor" element={<FarmerOnboarding />} />
                    <Route path="/catalogo" element={<Catalog />} />
                    <Route path="/catalogo/:slug" element={<CategoryPage />} />
                    <Route path="/agricultor/:id" element={<FarmerProfile />} />
                    <Route path="/resultados" element={<SearchResults />} />
                    <Route path="/carrinho" element={<Cart />} />
                    <Route path="/encomendas" element={<MyOrders />} />
                    <Route path="/avaliar/:orderId" element={<RateFarmer />} />
                    <Route path="/agricultor/encomendas" element={<FarmerOrders />} />
                    <Route path="/agricultor/scan" element={<ScanPickup />} />
                    <Route path="/agricultor/produtos/novo" element={<NewProduct />} />
                    <Route path="/agricultor/informacoes" element={<FarmerInfo />} />
                    <Route path="/sobre" element={<About />} />
                    <Route path="/missao" element={<Mission />} />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/definicoes" element={<Settings />} />
                    <Route path="/favoritos" element={<Favorites />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <Footer />
              </div>
            </CartProvider>
          </StockProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
