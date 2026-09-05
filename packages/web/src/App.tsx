import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OnboardingGuard, TelegramSync } from './components/OnboardingGuard';
import { WelcomePage } from './pages/WelcomePage';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { PetDetailPage } from './pages/PetDetailPage';
import { AddPetPage } from './pages/AddPetPage';
import { MatchesPage } from './pages/MatchesPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { ClinicsPage } from './pages/ClinicsPage';
import { ShopPage } from './pages/ShopPage';
import { VetConsultPage } from './pages/VetConsultPage';
import { RoleSelectPage } from './pages/onboarding/RoleSelectPage';
import { RoleWizardPage } from './pages/onboarding/RoleWizardPage';
import { PetOnboardingPage } from './pages/onboarding/PetOnboardingPage';
import { AdminGuard } from './admin/AdminGuard';
import { AdminLayout } from './admin/AdminLayout';
import { AdminLoginPage } from './admin/pages/AdminLoginPage';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { AdminPetsPage } from './admin/pages/AdminPetsPage';
import { AdminPetFormPage } from './admin/pages/AdminPetFormPage';
import { AdminMatchesPage } from './admin/pages/AdminMatchesPage';
import { AdminUsersPage } from './admin/pages/AdminUsersPage';
import { AdminVerificationPage } from './admin/pages/AdminVerificationPage';

export default function App() {
  return (
    <>
      <TelegramSync />
      <OnboardingGuard>
        <Routes>
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="onboarding/role" element={<RoleSelectPage />} />
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
        </Routes>
      </OnboardingGuard>
    </>
  );
}
