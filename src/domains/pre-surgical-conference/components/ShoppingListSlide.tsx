import { format } from 'date-fns';
import type { ConsumableBOM } from '../../../types';
import { ShoppingCart, Package, DollarSign, User, Calendar } from 'lucide-react';

interface ShoppingListSlideProps {
  consumableBOMs: ConsumableBOM[];
  patientName: string;
}

export default function ShoppingListSlide({ consumableBOMs, patientName }: ShoppingListSlideProps) {
  if (!consumableBOMs || consumableBOMs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <ShoppingCart size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Shopping List Generated</h2>
        <p className="text-gray-500 text-lg">No consumable BOMs have been prepared for {patientName}</p>
      </div>
    );
  }

  // Aggregate all consumables
  const allConsumables = consumableBOMs.flatMap(bom => 
    bom.consumables.map(item => ({
      ...item,
      serviceName: bom.serviceName,
      serviceType: bom.serviceType,
      bomDate: bom.performedAt,
    }))
  );

  // Group by service type
  const byServiceType = consumableBOMs.reduce((acc, bom) => {
    const key = bom.serviceType || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(bom);
    return acc;
  }, {} as Record<string, ConsumableBOM[]>);

  // Calculate totals
  const totalConsumables = consumableBOMs.reduce((sum, bom) => sum + bom.consumablesTotal, 0);
  const totalProfessional = consumableBOMs.reduce((sum, bom) => sum + bom.professionalFeesTotal, 0);
  const grandTotal = consumableBOMs.reduce((sum, bom) => sum + bom.grandTotal, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 rounded-xl p-6 border border-emerald-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShoppingCart size={28} className="text-emerald-400" />
              Shopping List / Consumables — {patientName}
            </h2>
            <p className="text-emerald-200/70 mt-1">
              {consumableBOMs.length} BOM{consumableBOMs.length !== 1 ? 's' : ''} • {allConsumables.length} items
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-400">₦{grandTotal.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Estimated Total</p>
          </div>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-900/20 rounded-xl p-5 border border-blue-700/30 text-center">
          <Package size={24} className="text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-300">₦{totalConsumables.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Consumables</p>
        </div>
        <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-700/30 text-center">
          <User size={24} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-300">₦{totalProfessional.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Professional Fees</p>
        </div>
        <div className="bg-emerald-900/20 rounded-xl p-5 border border-emerald-700/30 text-center">
          <DollarSign size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-emerald-300">₦{grandTotal.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Grand Total</p>
        </div>
      </div>

      {/* BOMs by Service Type */}
      {Object.entries(byServiceType).map(([serviceType, boms]) => (
        <div key={serviceType} className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/30">
          <h3 className="text-lg font-bold text-white capitalize mb-4 flex items-center gap-2">
            <Package size={20} className="text-gray-400" />
            {serviceType.replace(/_/g, ' ')}
          </h3>
          
          {boms.map(bom => (
            <div key={bom.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-200">{bom.serviceName}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={10} /> {format(new Date(bom.performedAt), 'PP')} • By {bom.performedBy}
                  </p>
                </div>
                <span className="text-emerald-400 font-semibold">₦{bom.grandTotal.toLocaleString()}</span>
              </div>

              {/* Consumable Items Table */}
              {bom.consumables.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Item</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Qty</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">Unit Price</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.consumables.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-700/20">
                          <td className="py-2 px-3 text-gray-200">{item.name}</td>
                          <td className="py-2 px-3 text-gray-300 text-center">{item.quantity} {item.unit || ''}</td>
                          <td className="py-2 px-3 text-gray-300 text-right">₦{(item.unitPrice || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-white font-medium text-right">₦{(item.totalPrice || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
