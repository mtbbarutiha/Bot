import { Navigate, Route, Routes } from 'react-router-dom';
import { AppGuards } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { RouteSeo } from './components/RouteSeo';
import { AdminGuard } from './admin/AdminGuard';
import { AdminLayout } from './admin/AdminLayout';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { AdminPetFormPage } from './admin/pages/AdminPetFormPage';
import { AdminPetsPage } from './admin/pages/AdminPetsPage';
import { AdminUsersPage } from './admin/pages/AdminUsersPage';
import { AdminVerificationPage } from './admin/pages/AdminVerificationPage';
import { AdminLogsPage } from './admin/pages/AdminLogsPage';
import { AdminMonitoringPage } from './admin/pages/AdminMonitoringPage';
import { AdminConsultsPage } from './admin/pages/AdminConsultsPage';
import { AdminPlaydatesPage } from './admin/pages/AdminPlaydatesPage';
import { AdminShopProductsPage } from './admin/pages/AdminShopProductsPage';
import { AdminShopProductFormPage } from './admin/pages/AdminShopProductFormPage';
import { AdminShopCategoriesPage } from './admin/pages/AdminShopCategoriesPage';
import { AdminShopOrdersPage } from './admin/pages/AdminShopOrdersPage';
import { AdminPaymentsPage } from './admin/pages/AdminPaymentsPage';
import { AdminContentPage } from './admin/pages/AdminContentPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';
import { AdminFinanceDashboardPage } from './admin/pages/AdminFinanceDashboardPage';
import { AdminFinancePnLPage } from './admin/pages/AdminFinancePnLPage';
import { AdminFinanceSalesPage } from './admin/pages/AdminFinanceSalesPage';
import { AdminFinanceOrdersPage } from './admin/pages/AdminFinanceOrdersPage';
import { AdminFinanceWalletPage } from './admin/pages/AdminFinanceWalletPage';
import { AdminFinanceProductsPage } from './admin/pages/AdminFinanceProductsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { OtpPage } from './pages/auth/OtpPage';
import { TelegramLinkPage } from './pages/auth/TelegramLinkPage';
import { AddPetPage } from './pages/AddPetPage';
import { ChatPage } from './pages/ChatPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { PetDetailPage } from './pages/PetDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletPage } from './pages/WalletPage';
import { ShopCartProvider } from './hooks/useShopCart';
import { LandingMobileDock } from './components/LandingMobileDock';
import { ShopHomePage } from './pages/shop/ShopHomePage';
import { ShopCategoryPage } from './pages/shop/ShopCategoryPage';
import { ShopProductPage } from './pages/shop/ShopProductPage';
import { ShopCartPage } from './pages/shop/ShopCartPage';
import { VetConsultPage } from './pages/VetConsultPage';
import { WelcomePage } from './pages/WelcomePage';
import { FaqPage } from './pages/FaqPage';
import { AdoptionDetailPage } from './pages/AdoptionDetailPage';
import { PetOnboardingPage } from './pages/onboarding/PetOnboardingPage';
import { ProfileWizardPage } from './pages/onboarding/ProfileWizardPage';
import { RoleSelectPage } from './pages/onboarding/RoleSelectPage';
import { RoleWizardPage } from './pages/onboarding/RoleWizardPage';

export default function App() {
  return (
    <AppGuards>
      <ShopCartProvider>
        <RouteSeo />
        <Routes>
          <Route index element={<WelcomePage />} />
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="adoption/:slug" element={<AdoptionDetailPage />} />
          <Route path="shop" element={<ShopHomePage />} />
          <Route path="shop/c/:category" element={<ShopCategoryPage />} />
          <Route path="shop/product/:id" element={<ShopProductPage />} />
          <Route path="shop/cart" element={<ShopCartPage />} />
          <Route path="auth/login" element={<LoginPage />} />
          <Route path="auth/otp" element={<OtpPage />} />
          <Route path="auth/telegram" element={<TelegramLinkPage />} />
          <Route path="onboarding/role" element={<RoleSelectPage />} />
          <Route path="onboarding/profile" element={<ProfileWizardPage />} />
          <Route path="onboarding/wizard/:role" element={<RoleWizardPage />} />
          <Route path="onboarding/pet" element={<PetOnboardingPage />} />

          <Route element={<Layout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="pets/:id" element={<PetDetailPage />} />
            <Route path="add-pet" element={<AddPetPage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="chats" element={<ChatPage />} />
            <Route path="chats/:matchId" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="vet-consult" element={<VetConsultPage />} />
          </Route>

          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin" element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="pets" element={<AdminPetsPage />} />
              <Route path="pets/new" element={<AdminPetFormPage />} />
              <Route path="pets/:id/edit" element={<AdminPetFormPage />} />
              <Route path="playdates" element={<AdminPlaydatesPage />} />
              <Route path="matches" element={<Navigate to="/admin/playdates" replace />} />
              <Route path="consults" element={<AdminConsultsPage />} />
              <Route path="verification" element={<AdminVerificationPage />} />
              <Route path="shop/products" element={<AdminShopProductsPage />} />
              <Route path="shop/products/new" element={<AdminShopProductFormPage />} />
              <Route path="shop/products/:id" element={<AdminShopProductFormPage />} />
              <Route path="shop/categories" element={<AdminShopCategoriesPage />} />
              <Route path="shop/orders" element={<AdminShopOrdersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="finance" element={<AdminFinanceDashboardPage />} />
              <Route path="finance/pnl" element={<AdminFinancePnLPage />} />
              <Route path="finance/sales" element={<AdminFinanceSalesPage />} />
              <Route path="finance/orders" element={<AdminFinanceOrdersPage />} />
              <Route path="finance/wallet" element={<AdminFinanceWalletPage />} />
              <Route path="finance/products" element={<AdminFinanceProductsPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
              <Route path="monitoring" element={<AdminMonitoringPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <LandingMobileDock />
      </ShopCartProvider>
    </AppGuards>
  );
}
