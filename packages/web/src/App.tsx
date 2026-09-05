import { Navigate, Route, Routes } from 'react-router-dom';
import { AppGuards } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { AdminGuard } from './admin/AdminGuard';
import { AdminLayout } from './admin/AdminLayout';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { AdminMatchesPage } from './admin/pages/AdminMatchesPage';
import { AdminPetFormPage } from './admin/pages/AdminPetFormPage';
import { AdminPetsPage } from './admin/pages/AdminPetsPage';
import { AdminUsersPage } from './admin/pages/AdminUsersPage';
import { AdminVerificationPage } from './admin/pages/AdminVerificationPage';
import { LoginPage } from './pages/auth/LoginPage';
import { OtpPage } from './pages/auth/OtpPage';
import { AddPetPage } from './pages/AddPetPage';
import { ChatPage } from './pages/ChatPage';
import { ClinicsPage } from './pages/ClinicsPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { PetDetailPage } from './pages/PetDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { ShopPage } from './pages/ShopPage';
import { VetConsultPage } from './pages/VetConsultPage';
import { WelcomePage } from './pages/WelcomePage';
import { PetOnboardingPage } from './pages/onboarding/PetOnboardingPage';
import { ProfileWizardPage } from './pages/onboarding/ProfileWizardPage';
import { RoleSelectPage } from './pages/onboarding/RoleSelectPage';
import { RoleWizardPage } from './pages/onboarding/RoleWizardPage';

export default function App() {
  return (
    <AppGuards>
      <Routes>
        <Route path="welcome" element={<WelcomePage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/otp" element={<OtpPage />} />
        <Route path="onboarding/role" element={<RoleSelectPage />} />
        <Route path="onboarding/profile" element={<ProfileWizardPage />} />
        <Route path="onboarding/wizard/:role" element={<RoleWizardPage />} />
        <Route path="onboarding/pet" element={<PetOnboardingPage />} />

        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="pets/:id" element={<PetDetailPage />} />
          <Route path="add-pet" element={<AddPetPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="chats/:matchId" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="clinics" element={<ClinicsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="vet-consult" element={<VetConsultPage />} />
        </Route>

        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="pets" element={<AdminPetsPage />} />
            <Route path="pets/new" element={<AdminPetFormPage />} />
            <Route path="pets/:id/edit" element={<AdminPetFormPage />} />
            <Route path="matches" element={<AdminMatchesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="verification" element={<AdminVerificationPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </AppGuards>
  );
}
