import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import type { PawserAnimal } from '../types';

function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months && months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}

interface AnimalDetailProps {
  animal: PawserAnimal;
  adoptUrlBase?: string;
  primaryColor?: string;
  onBack: () => void;
}

export function AnimalDetail({ animal, adoptUrlBase, primaryColor, onBack }: AnimalDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = animal.mediaAssets
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((m) => ({ src: m.url }));

  const age = formatAge(animal.ageYears, animal.ageMonths);
  const adoptUrl = adoptUrlBase
    ? `${adoptUrlBase}${animal.externalId}`
    : animal.adoptionUrl;

  const attrs = animal.attributes as Record<string, boolean> | null;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface font-semibold mb-6 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all animals
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          {photos.length > 0 && (
            <>
              <div
                className="aspect-square rounded-xl overflow-hidden bg-surface-container-low cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={photos[photoIndex].src}
                  alt={animal.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {photos.slice(0, 4).map((photo, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer bg-surface-container-low ${
                        i === photoIndex ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setPhotoIndex(i)}
                    >
                      <img src={photo.src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={photoIndex}
                slides={photos}
              />
            </>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-black text-on-surface">{animal.name}</h1>
            <p className="text-lg text-on-surface-variant mt-1">
              {animal.breedPrimary}
              {animal.breedSecondary ? ` / ${animal.breedSecondary}` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-xl">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Age</span>
              <p className="font-bold text-on-surface mt-1">{age}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sex</span>
              <p className="font-bold text-on-surface mt-1">{animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Size</span>
              <p className="font-bold text-on-surface mt-1">{animal.size.charAt(0).toUpperCase() + animal.size.slice(1)}</p>
            </div>
            {animal.color && (
              <div className="bg-surface-container-low p-4 rounded-xl">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Color</span>
                <p className="font-bold text-on-surface mt-1">{animal.color}</p>
              </div>
            )}
          </div>

          {attrs && (
            <div className="flex flex-wrap gap-2">
              {attrs.goodWithDogs && <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold">Good with dogs</span>}
              {attrs.goodWithCats && <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold">Good with cats</span>}
              {attrs.goodWithKids && <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold">Good with kids</span>}
              {attrs.houseTrained && <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">House trained</span>}
              {attrs.spayedNeutered && <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">Spayed/Neutered</span>}
              {attrs.vaccinated && <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">Vaccinated</span>}
            </div>
          )}

          {animal.description && (
            <div>
              <h3 className="font-bold text-on-surface mb-2">About {animal.name}</h3>
              <div className="text-on-surface-variant text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: animal.description }} />
            </div>
          )}

          {adoptUrl && (
            <a
              href={adoptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-4 rounded-xl font-bold text-white active:scale-95 transition-all shadow-lg"
              style={{ backgroundColor: primaryColor || '#00113f' }}
            >
              Adopt {animal.name}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
