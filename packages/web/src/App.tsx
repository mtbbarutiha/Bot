import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WelcomePage } from './pages/WelcomePage';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { PetDetailPage } from './pages/PetDetailPage';
import { AddPetPage } from './pages/AddPetPage';
import { MatchesPage } from './pages/MatchesPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="welcome" element={<WelcomePage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="pets/:id" element={<PetDetailPage />} />
        <Route path="add-pet" element={<AddPetPage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
