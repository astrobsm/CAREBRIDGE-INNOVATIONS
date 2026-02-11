import { X } from 'lucide-react';

interface SlideWrapperProps {
  title: string;
  subtitle?: string;
  onExit: () => void;
  children: React.ReactNode;
  slideNumber: number;
  totalSlides: number;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function SlideWrapper({ 
  title, 
  subtitle, 
  onExit, 
  children, 
  slideNumber, 
  totalSlides,
  onNext,
  onPrev
}: SlideWrapperProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 text-white flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold">
            {slideNumber} / {totalSlides}
          </div>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
        >
          <X size={18} />
          Exit Presentation
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-t border-gray-700">
        <button
          onClick={onPrev}
          disabled={slideNumber <= 1}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
        >
          ← Previous
        </button>
        <div className="flex gap-1">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i + 1 === slideNumber ? 'bg-primary' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <button
          onClick={onNext}
          disabled={slideNumber >= totalSlides}
          className="px-6 py-2 bg-primary hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
