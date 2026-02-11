import { useState } from 'react';
import { format } from 'date-fns';
import type { ClinicalEncounter, Wound } from '../../../types';
import { Camera, Maximize2, X, MapPin } from 'lucide-react';

interface ClinicalPhotographsSlideProps {
  encounters: ClinicalEncounter[];
  wounds: Wound[];
  patientName: string;
}

interface PhotoItem {
  id: string;
  imageData: string;
  description?: string;
  bodyLocation?: string;
  capturedAt: Date;
  source: string;
}

export default function ClinicalPhotographsSlide({ encounters, wounds, patientName }: ClinicalPhotographsSlideProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  // Collect all photos from encounters
  const allPhotos: PhotoItem[] = [];

  encounters.forEach(encounter => {
    if (encounter.clinicalPhotos && encounter.clinicalPhotos.length > 0) {
      encounter.clinicalPhotos.forEach(photo => {
        allPhotos.push({
          id: photo.id,
          imageData: photo.imageData,
          description: photo.description,
          bodyLocation: photo.bodyLocation,
          capturedAt: new Date(photo.capturedAt),
          source: `Encounter - ${format(new Date(encounter.createdAt), 'PP')}`,
        });
      });
    }
  });

  // Collect photos from wounds
  wounds.forEach(wound => {
    if (wound.photos && wound.photos.length > 0) {
      wound.photos.forEach(photo => {
        allPhotos.push({
          id: photo.id,
          imageData: photo.url,
          description: wound.etiology || `${wound.type} wound`,
          bodyLocation: wound.location,
          capturedAt: new Date(photo.capturedAt),
          source: `Wound - ${wound.type}`,
        });
      });
    }
  });

  // Sort by date, newest first
  allPhotos.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

  if (allPhotos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <Camera size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Clinical Photographs</h2>
        <p className="text-gray-500 text-lg">No photographs have been captured for {patientName}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-teal-900/40 rounded-xl p-6 border border-cyan-700/30">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Camera size={28} className="text-cyan-400" />
          Clinical Photographs — {patientName}
        </h2>
        <p className="text-cyan-200/70 mt-1">{allPhotos.length} photograph{allPhotos.length !== 1 ? 's' : ''} available</p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allPhotos.map(photo => (
          <div
            key={photo.id}
            className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/50 cursor-pointer hover:border-cyan-500/50 transition-all group"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="relative aspect-square">
              <img
                src={photo.imageData}
                alt={photo.description || 'Clinical photograph'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="p-3 space-y-1">
              {photo.description && (
                <p className="text-sm text-gray-200 font-medium truncate">{photo.description}</p>
              )}
              {photo.bodyLocation && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={10} /> {photo.bodyLocation}
                </p>
              )}
              <p className="text-xs text-gray-500">{format(photo.capturedAt, 'PP')}</p>
              <p className="text-xs text-cyan-400/70">{photo.source}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center" onClick={() => setSelectedPhoto(null)}>
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={selectedPhoto.imageData}
            alt={selectedPhoto.description || 'Clinical photograph'}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="mt-4 text-center" onClick={e => e.stopPropagation()}>
            {selectedPhoto.description && <p className="text-lg text-white">{selectedPhoto.description}</p>}
            {selectedPhoto.bodyLocation && <p className="text-sm text-gray-400 mt-1">Location: {selectedPhoto.bodyLocation}</p>}
            <p className="text-sm text-gray-500 mt-1">{format(selectedPhoto.capturedAt, 'PPP')} • {selectedPhoto.source}</p>
          </div>
        </div>
      )}
    </div>
  );
}
