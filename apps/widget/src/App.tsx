import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { AnimalGrid } from './components/AnimalGrid';
import { AnimalDetail } from './components/AnimalDetail';
import { useAnimal } from './hooks/useAnimal';
import type { PawserAnimal, PawserSettings } from './types';

function AnimalDetailRoute({ settings }: { settings: PawserSettings }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animal, loading } = useAnimal(settings.apiUrl, settings.orgSlug, id || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="text-center py-16">
        <p className="text-on-surface-variant">Animal not found.</p>
      </div>
    );
  }

  return (
    <AnimalDetail
      animal={animal}
      adoptUrlBase={settings.adoptUrlBase}
      onBack={() => navigate('/')}
    />
  );
}

function AnimalListRoute({ settings }: { settings: PawserSettings }) {
  const navigate = useNavigate();

  const handleAnimalClick = (animal: PawserAnimal) => {
    navigate(`/animal/${animal.slug || animal.id}`);
  };

  return <AnimalGrid settings={settings} onAnimalClick={handleAnimalClick} />;
}

interface AppProps {
  settings: PawserSettings;
}

export default function App({ settings }: AppProps) {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="font-body">
        <Routes>
          <Route path="/" element={<AnimalListRoute settings={settings} />} />
          <Route path="/animal/:id" element={<AnimalDetailRoute settings={settings} />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
