import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { slugify } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { SareeProvenanceCard } from '../components/ui/SareeProvenanceCard';
import { MAX_PRODUCT_IMAGES, ProductImageUploader } from '../components/ProductImageUploader';
import type { Product, ProductImageMeta, ProductStatus } from '../../types/domain';

export const AdminProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { adminData, refreshAdminData } = useStore();

  const existing = isEdit ? adminData?.products.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState({
    name: '',
    sku: '',
    slug: '',
    description: '',
    categoryId: adminData?.categories[0]?.id || 'cat-kanjeevaram',
    collectionId: adminData?.collections[0]?.id || 'col-royal-bridal',
    sellingPrice: 85000,
    mrp: 95000,
    stockQuantity: 5,
    lowStockThreshold: 3,
    fabric: 'Pure Mulberry Silk',
    sareeType: 'Handloom Kanjeevaram',
    color: 'Deep Burgundy & Antique Gold',
    occasion: 'Bridal & Festive',
    length: '6.3 meters (incl. 0.9m unstitched blouse)',
    blouseDetails: 'Matching silk blouse piece with woven zari border',
    careInstructions: 'Dry clean only. Store wrapped in unbleached muslin.',
    featured: true,
    bestseller: false,
    newArrival: true,
    seoTitle: '',
    seoDescription: '',
    status: 'Published' as ProductStatus,
    masterWeaver: 'K. Natarajan Weaving Atelier',
    loomLocation: 'Kanchipuram, Tamil Nadu',
    zariCertification: 'Silk Mark & Tested Gold Zari',
    weaveDurationDays: 32,
  });

  const [imageItems, setImageItems] = useState<ProductImageMeta[]>([]);
  const [imageValidationError, setImageValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        sku: existing.sku,
        slug: existing.slug,
        description: existing.description,
        categoryId: existing.categoryId,
        collectionId: existing.collectionId,
        sellingPrice: existing.sellingPrice,
        mrp: existing.mrp,
        stockQuantity: existing.stockQuantity,
        lowStockThreshold: existing.lowStockThreshold,
        fabric: existing.fabric,
        sareeType: existing.sareeType,
        color: existing.color,
        occasion: existing.occasion,
        length: existing.length,
        blouseDetails: existing.blouseDetails,
        careInstructions: existing.careInstructions,
        featured: existing.featured,
        bestseller: existing.bestseller,
        newArrival: existing.newArrival,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
        status: existing.status,
        masterWeaver: existing.provenance?.masterWeaver || '',
        loomLocation: existing.provenance?.loomLocation || '',
        zariCertification: existing.provenance?.zariCertification || '',
        weaveDurationDays: existing.provenance?.weaveDurationDays || 25,
      });

      if (existing.imageDetails && existing.imageDetails.length > 0) {
        setImageItems(existing.imageDetails);
      } else {
        setImageItems(
          (existing.images || []).map((url, idx) => ({
            url,
            filename: url.split('/').pop() || `saree-image-${idx + 1}.jpg`,
            viewType: idx === 0 ? 'Main Product' : 'Front View',
          }))
        );
      }
    }
  }, [existing]);

  const computedDiscount =
    form.mrp > form.sellingPrice ? Math.round(((form.mrp - form.sellingPrice) / form.mrp) * 100) : 0;

  const handleImagesChange = (nextImages: ProductImageMeta[]) => {
    setImageItems(nextImages);
    if (nextImages.length > 0) {
      setImageValidationError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setImageValidationError('');

    if (imageItems.length > MAX_PRODUCT_IMAGES) {
      const msg = `Maximum of ${MAX_PRODUCT_IMAGES} images allowed per product.`;
      setImageValidationError(msg);
      setError(msg);
      return;
    }

    if (form.status === 'Published' && imageItems.length === 0) {
      const msg = 'Please upload or select at least 1 product image before publishing this saree.';
      setImageValidationError(msg);
      setError(msg);
      return;
    }

    setSaving(true);

    const payload: Partial<Product> = {
      name: form.name,
      sku: form.sku,
      slug: form.slug || slugify(form.name),
      description: form.description,
      categoryId: form.categoryId,
      collectionId: form.collectionId,
      sellingPrice: Number(form.sellingPrice),
      mrp: Number(form.mrp),
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      fabric: form.fabric,
      sareeType: form.sareeType,
      color: form.color,
      occasion: form.occasion,
      length: form.length,
      blouseDetails: form.blouseDetails,
      careInstructions: form.careInstructions,
      featured: form.featured,
      bestseller: form.bestseller,
      newArrival: form.newArrival,
      images: imageItems.map((i) => i.url),
      imageDetails: imageItems,
      seoTitle: form.seoTitle || `${form.name} | AARANYA`,
      seoDescription: form.seoDescription || form.description.slice(0, 155),
      status: form.status,
      provenance: {
        masterWeaver: form.masterWeaver,
        loomLocation: form.loomLocation,
        zariCertification: form.zariCertification,
        weaveDurationDays: Number(form.weaveDurationDays || 21),
      },
    };

    try {
      if (isEdit && id) {
        await apiRequest(`/api/admin/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await refreshAdminData();
      navigate('/admin/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={isEdit ? `Edit Saree: ${existing?.name || ''}` : 'Add New Saree'}
      breadcrumbs={[{ label: 'Products', to: '/admin/products' }, { label: isEdit ? 'Edit' : 'New Saree' }]}
    >
      <div className="flex items-center justify-between">
        <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-[#534245] hover:text-[#641E32]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>
      </div>

      {error && (
        <div className="p-3 text-xs text-[#8B1E2D] bg-[#FBECEE] border border-[#E8A2AA] rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
              Core Listing Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#534245] mb-1">Product Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name: val,
                      slug: isEdit ? prev.slug : slugify(val),
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">SKU</label>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  placeholder="AAR-KAN-210"
                  className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">URL Slug</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#534245] mb-1">Curatorial Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
            </div>
          </div>

          {/* Dedicated Product Images Section */}
          <ProductImageUploader
            images={imageItems}
            onChange={handleImagesChange}
            validationError={imageValidationError}
          />

          {/* Pricing & Inventory */}
          <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
              Pricing & Vault Inventory
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Selling Price (₹)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">MRP (₹)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Discount (%)</label>
                <input
                  readOnly
                  value={`${computedDiscount}%`}
                  className="w-full px-3 py-2 text-sm tabular-nums bg-[#FAF7F2] border border-[#D8C9B4] rounded text-[#534245]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Stock Quantity</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                />
              </div>
            </div>
          </div>

          {/* Textile Specifications */}
          <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
              Textile Specifications & Provenance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Fabric</label>
                <input
                  value={form.fabric}
                  onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Saree Type</label>
                <input
                  value={form.sareeType}
                  onChange={(e) => setForm({ ...form, sareeType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Color Palette</label>
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Occasion</label>
                <input
                  value={form.occasion}
                  onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Length</label>
                <input
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Blouse Details</label>
                <input
                  value={form.blouseDetails}
                  onChange={(e) => setForm({ ...form, blouseDetails: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#534245] mb-1">Care Instructions</label>
                <input
                  value={form.careInstructions}
                  onChange={(e) => setForm({ ...form, careInstructions: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Master Weaver Guild</label>
                <input
                  value={form.masterWeaver}
                  onChange={(e) => setForm({ ...form, masterWeaver: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Loom Cluster</label>
                <input
                  value={form.loomLocation}
                  onChange={(e) => setForm({ ...form, loomLocation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Zari Certification</label>
                <input
                  value={form.zariCertification}
                  onChange={(e) => setForm({ ...form, zariCertification: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#534245] mb-1">Weave Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.weaveDurationDays}
                  onChange={(e) => setForm({ ...form, weaveDurationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm tabular-nums border border-[#D8C9B4] rounded"
                />
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
              Search Engine Metadata
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">SEO Title</label>
              <input
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                placeholder="Defaults to Product Name | AARANYA"
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">SEO Meta Description</label>
              <textarea
                rows={2}
                value={form.seoDescription}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>

        {/* Right 4 Columns */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
              Publishing & Organization
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Visibility Status</label>
              <select
                value={form.status}
                onChange={(e) => {
                  const nextStatus = e.target.value as ProductStatus;
                  setForm({ ...form, status: nextStatus });
                  if (nextStatus !== 'Published') {
                    setImageValidationError('');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                <option value="Published">Published (Live on Storefront)</option>
                <option value="Draft">Draft (Hidden from Storefront)</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                {(adminData?.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Collection</label>
              <select
                value={form.collectionId}
                onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded bg-white"
              >
                {(adminData?.collections || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs text-[#24211F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="accent-[#641E32]"
                />
                Featured on Homepage
              </label>
              <label className="flex items-center gap-2 text-xs text-[#24211F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.bestseller}
                  onChange={(e) => setForm({ ...form, bestseller: e.target.checked })}
                  className="accent-[#641E32]"
                />
                Collector Bestseller
              </label>
              <label className="flex items-center gap-2 text-xs text-[#24211F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.newArrival}
                  onChange={(e) => setForm({ ...form, newArrival: e.target.checked })}
                  className="accent-[#641E32]"
                />
                New Arrival
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-[#641E32] text-white text-sm font-semibold rounded hover:bg-[#3B1422] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEdit ? 'Save Saree Changes' : 'Create Saree Listing'}</span>
            </button>
          </div>

          {existing && <SareeProvenanceCard product={existing} />}
        </div>
      </form>
    </AdminLayout>
  );
};
