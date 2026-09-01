import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SectionsPage } from './pages/SectionsPage';
import { SectionGamesPage } from './pages/SectionGamesPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { CreateGamePage } from './pages/CreateGamePage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="sections" element={<SectionsPage />} />
        <Route path="sections/:id" element={<SectionGamesPage />} />
        <Route path="games/:id" element={<GameDetailPage />} />
        <Route path="create" element={<CreateGamePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
