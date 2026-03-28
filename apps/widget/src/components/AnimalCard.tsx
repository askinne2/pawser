import type { MouseEvent } from 'react';
import type { PawserAnimal } from '../types';
import {
  formatSpeciesLabel,
  orderedMediaAssets,
  shouldShowNewArrivalBadge,
  titleCaseOrDash,
  truncateBreed,
} from '../utils/animalDisplay';

function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months && months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}

function orderedMedia(animal: PawserAnimal) {
  return orderedMediaAssets(animal.mediaAssets);
}

function getPrimaryAndSecond(animal: PawserAnimal): { primary?: string; second?: string } {
  const ordered = orderedMedia(animal);
  if (ordered.length === 0) return {};
  const primaryAsset = ordered.find((m) => m.isPrimary) || ordered[0];
  const rest = ordered.filter((m) => m.url !== primaryAsset.url);
  const second = rest[0];
  return { primary: primaryAsset?.url, second: second?.url };
}

interface AnimalCardProps {
  animal: PawserAnimal;
  onClick: (animal: PawserAnimal) => void;
}

export function AnimalCard({ animal, onClick }: AnimalCardProps) {
  const { primary: coverPhoto, second: secondPhoto } = getPrimaryAndSecond(animal);
  const age = formatAge(animal.ageYears, animal.ageMonths);
  const breed = truncateBreed(animal.breedPrimary);
  const speciesLabel = formatSpeciesLabel(animal.species);

  const handleAdopt = (e: MouseEvent) => {
    e.stopPropagation();
    onClick(animal);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="group cursor-pointer text-left bg-surface-container-lowest rounded-xl shadow-sm p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => onClick(animal)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(animal);
        }
      }}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-surface-container-low">
        {coverPhoto ? (
          <>
            <img
              src={coverPhoto}
              alt={animal.name}
              className={
                secondPhoto
                  ? 'absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-100 group-hover:opacity-0'
                  : 'absolute inset-0 w-full h-full object-cover'
              }
              loading="lazy"
            />
            {secondPhoto ? (
              <img
                src={secondPhoto}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100"
                aria-hidden
                loading="lazy"
              />
            ) : null}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
        {shouldShowNewArrivalBadge(animal.intakeDate, animal.status) ? (
          <div className="absolute top-3 left-3 bg-primary-container text-on-primary-container px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            New Arrival
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h4 className="font-black text-on-surface text-base leading-tight">{animal.name}</h4>
        <div className="flex flex-wrap gap-1.5">
          {speciesLabel ? (
            <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
              {speciesLabel}
            </span>
          ) : null}
          {breed ? (
            <span className="inline-block text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full max-w-full truncate">
              {breed}
            </span>
          ) : null}
          <span className="inline-block text-[11px] font-semibold text-on-surface-variant/80 px-2 py-0.5 rounded-full">
            {age}
          </span>
          <span className="inline-block text-[11px] font-semibold text-on-surface-variant/80 px-2 py-0.5 rounded-full">
            {titleCaseOrDash(animal.sex)}
          </span>
          <span className="inline-block text-[11px] font-semibold text-on-surface-variant/80 px-2 py-0.5 rounded-full">
            {titleCaseOrDash(animal.size)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAdopt}
          className="w-full mt-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm active:scale-[0.98] transition-transform"
        >
          Adopt Me
        </button>
      </div>
    </div>
  );
}
