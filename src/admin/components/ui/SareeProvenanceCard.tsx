import React from 'react';
import { Award, MapPin, ShieldCheck } from 'lucide-react';
import type { Product } from '../../../types/domain';
import { StatusBadge } from './StatusBadge';

interface SareeProvenanceCardProps {
  product: Product;
}

export const SareeProvenanceCard: React.FC<SareeProvenanceCardProps> = ({ product }) => {
  if (!product.provenance) return null;

  return (
    <div className="bg-[#FAF7F2] border border-[#D8C9B4] rounded p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#641E32]">
          <Award className="w-4 h-4 text-[#C3A46C]" />
          <span>Saree Provenance & Loom Registry</span>
        </div>
        <StatusBadge
          label={product.stockQuantity === 0 ? 'Out of Stock' : product.stockQuantity <= product.lowStockThreshold ? 'Low Stock' : 'Verified Stock'}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[#534245] block">Master Weaver</span>
          <span className="font-semibold text-[#24211F]">{product.provenance.masterWeaver}</span>
        </div>
        <div>
          <span className="text-[#534245] block">Loom Cluster</span>
          <span className="font-medium text-[#24211F] inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#C3A46C]" />
            {product.provenance.loomLocation}
          </span>
        </div>
        <div>
          <span className="text-[#534245] block">Zari & Silk Certification</span>
          <span className="font-medium text-[#1C4A3A] inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {product.provenance.zariCertification}
          </span>
        </div>
        <div>
          <span className="text-[#534245] block">Allocation & Craft Time</span>
          <span className="font-medium text-[#24211F] tabular-nums">
            {product.stockQuantity} in vault · {product.provenance.weaveDurationDays} loom days
          </span>
        </div>
      </div>
    </div>
  );
};
