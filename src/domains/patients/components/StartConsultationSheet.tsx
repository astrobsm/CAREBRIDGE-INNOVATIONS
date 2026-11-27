/**
 * "Start consultation": every way to document a visit, listed once.
 * A bottom sheet on the phone (pull down to close: it holds no data), a
 * centred dialog on wider screens. Focus, Escape and motion: the shared Sheet.
 */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, RefreshCw, FileEdit, Scissors, X, ChevronRight, Microscope } from 'lucide-react';
import { consultationOptions } from '../patientHubLinks';
import { Sheet } from '../../../components/motion';

interface Props {
  open: boolean;
  patientId: string;
  patientName: string;
  hasInitialClerking: boolean;
  onClose: () => void;
}

export default function StartConsultationSheet({ open, patientId, patientName, hasInitialClerking, onClose }: Props) {
  const opts = consultationOptions(patientId, hasInitialClerking);
  const closeRef = useRef<HTMLButtonElement>(null);

  const icon = (id: string) =>
    id === 'initial' ? <ClipboardList size={20} className="text-emerald-600" />
      : id === 'derm_rheum' ? <Microscope size={20} className="text-orange-600" />
      : <RefreshCw size={20} className="text-sky-600" />;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="start-consultation-title" dragToDismiss initialFocusRef={closeRef} className="sm:max-w-md">
        <div className="flex items-start justify-between gap-3 px-4 pt-2 sm:pt-4 pb-2">
          <div className="min-w-0">
            <h2 id="start-consultation-title" className="text-lg font-semibold text-gray-900">Start consultation</h2>
            <p className="text-sm text-gray-500 truncate">{patientName}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <ul className="px-2 pb-2">
          {opts.primary.map(o => (
            <li key={o.id}>
              <Link to={o.href} onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50">
                <span className="p-2 rounded-lg bg-gray-50" aria-hidden="true">{icon(o.id)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900">{o.label}</span>
                  {o.hint && <span className="block text-xs text-gray-500">{o.hint}</span>}
                </span>
                <ChevronRight size={18} className="text-gray-300" aria-hidden="true" />
              </Link>
            </li>
          ))}

          <li className="px-3 py-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-lg bg-gray-50" aria-hidden="true"><Scissors size={20} className="text-indigo-600" /></span>
              <span>
                <span className="block font-medium text-gray-900">Procedure review</span>
                <span className="block text-xs text-gray-500">Plastic-surgery procedure template, by stage.</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pl-0 sm:pl-12">
              {opts.procedureReview.map(o => (
                <Link
                  key={o.id}
                  to={o.href}
                  onClick={onClose}
                  className="text-center text-sm font-medium py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </li>

          <li>
            <Link to={opts.quickNote.href} onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50">
              <span className="p-2 rounded-lg bg-gray-50" aria-hidden="true"><FileEdit size={20} className="text-gray-600" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900">{opts.quickNote.label}</span>
                <span className="block text-xs text-gray-500">{opts.quickNote.hint}</span>
              </span>
              <ChevronRight size={18} className="text-gray-300" aria-hidden="true" />
            </Link>
          </li>
        </ul>
    </Sheet>
  );
}
