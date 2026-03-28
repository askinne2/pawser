import type { PawserAnimal } from '../types';

function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months && months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}

function getCoverPhoto(animal: PawserAnimal): string | undefined {
  const primary = animal.mediaAssets.find((m) => m.isPrimary);
  return primary?.url || animal.mediaAssets[0]?.url;
}

interface AnimalCardProps {
  animal: PawserAnimal;
  onClick: (animal: PawserAnimal) => void;
}

export function AnimalCard({ animal, onClick }: AnimalCardProps) {
  const coverPhoto = getCoverPhoto(animal);
  const age = formatAge(animal.ageYears, animal.ageMonths);

  return (
    <div className="group cursor-pointer" onClick={() => onClick(animal)}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-surface-container-low shadow-sm">
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt={animal.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
        {animal.status === 'available' && animal.intakeDate && (
          <div className="absolute top-3 left-3 bg-primary-container text-on-primary-container px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            New Arrival
          </div>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-on-surface text-base">{animal.name}</h4>
          <p className="text-on-surface-variant text-sm">
            {animal.breedPrimary} &bull; {age}
          </p>
          <p className="text-on-surface-variant/70 text-sm">
            {animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)} &bull;{' '}
            {animal.size.charAt(0).toUpperCase() + animal.size.slice(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
