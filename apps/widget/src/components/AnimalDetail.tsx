import { useState, useCallback } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import type { PawserAnimal } from '../types';
import { coerceString, orderedMediaAssets, titleCaseOrDash } from '../utils/animalDisplay';

function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months && months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}

interface AnimalDetailProps {
  animal: PawserAnimal;
  adoptUrlBase?: string;
  onBack: () => void;
}

export function AnimalDetail({ animal, adoptUrlBase, onBack }: AnimalDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = orderedMediaAssets(animal.mediaAssets).map((m) => ({ src: m.url }));

  const age = formatAge(animal.ageYears, animal.ageMonths);
  const adoptUrl = adoptUrlBase ? `${adoptUrlBase}${animal.externalId}` : animal.adoptionUrl;

  const attrs = animal.attributes as Record<string, boolean> | null;

  const openLightboxAt = useCallback((index: number) => {
    setPhotoIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleAdopt = () => {
    if (!adoptUrl) return;
    window.open(adoptUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface font-semibold mb-6 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all animals
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {photos.length > 0 ? (
            <>
              <button
                type="button"
                className="aspect-square w-full rounded-xl overflow-hidden bg-surface-container-low cursor-pointer text-left shadow-sm"
                onClick={() => openLightboxAt(photoIndex)}
              >
                <img
                  src={photos[photoIndex].src}
                  alt={animal.name}
                  className="w-full h-full object-cover"
                />
              </button>
              {photos.length > 1 ? (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="list">
                  {photos.map((photo, i) => (
                    <button
                      key={`${photo.src}-${i}`}
                      type="button"
                      role="listitem"
                      className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-surface-container-low shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        i === photoIndex ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => openLightboxAt(i)}
                    >
                      <img src={photo.src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={photoIndex}
                slides={photos}
                on={{
                  view: ({ index }) => setPhotoIndex(index),
                }}
              />
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-black text-on-surface">{animal.name}</h1>
            <p className="text-lg text-on-surface-variant mt-1">
              {[coerceString(animal.breedPrimary), coerceString(animal.breedSecondary)]
                .filter(Boolean)
                .join(' / ') || '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Age</span>
              <p className="font-bold text-on-surface mt-1">{age}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sex</span>
              <p className="font-bold text-on-surface mt-1">{titleCaseOrDash(animal.sex)}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Size</span>
              <p className="font-bold text-on-surface mt-1">{titleCaseOrDash(animal.size)}</p>
            </div>
            {animal.color ? (
              <div className="bg-surface-container-low p-4 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Color</span>
                <p className="font-bold text-on-surface mt-1">{animal.color}</p>
              </div>
            ) : null}
          </div>

          {attrs ? (
            <div className="flex flex-wrap gap-2">
              {attrs.goodWithDogs ? (
                <span className="bg-surface-container-high text-on-surface px-3 py-1 rounded-full text-xs font-bold">Good with dogs</span>
              ) : null}
              {attrs.goodWithCats ? (
                <span className="bg-surface-container-high text-on-surface px-3 py-1 rounded-full text-xs font-bold">Good with cats</span>
              ) : null}
              {attrs.goodWithKids ? (
                <span className="bg-surface-container-high text-on-surface px-3 py-1 rounded-full text-xs font-bold">Good with kids</span>
              ) : null}
              {attrs.houseTrained ? (
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">House trained</span>
              ) : null}
              {attrs.spayedNeutered ? (
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">Spayed/Neutered</span>
              ) : null}
              {attrs.vaccinated ? (
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">Vaccinated</span>
              ) : null}
            </div>
          ) : null}

          {animal.description ? (
            <div>
              <h3 className="font-bold text-on-surface mb-2">About {animal.name}</h3>
              <div
                className="text-on-surface-variant text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: animal.description }}
              />
            </div>
          ) : null}

          {adoptUrl ? (
            <button
              type="button"
              onClick={handleAdopt}
              className="block w-full text-center py-4 rounded-xl font-bold bg-primary text-on-primary active:scale-[0.99] transition-transform shadow-sm"
            >
              Adopt {animal.name}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
