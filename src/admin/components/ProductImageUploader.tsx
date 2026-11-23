import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Maximize2,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getAuthToken } from '../../services/apiClient';
import { SAREE_IMAGES } from '../../data/seedData';
import { SafeImage } from './SafeImage';
import type { ProductImageMeta, SareeImageView } from '../../types/domain';

export const MAX_PRODUCT_IMAGES = 8;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const SAREE_VIEW_OPTIONS: SareeImageView[] = [
  'Main Product',
  'Front View',
  'Back View',
  'Border & Zari Details',
  'Fabric Close-up',
  'Model / Styling',
];

const CURATED_IMAGE_OPTIONS = [
  { label: 'Burgundy Banarasi Katan', filename: 'banarasi_burgundy_studio.jpg', url: SAREE_IMAGES.banarasiBurgundy },
  { label: 'Ivory Kanjeevaram Korvai', filename: 'kanjeevaram_ivory_studio.jpg', url: SAREE_IMAGES.kanjeevaramIvory },
  { label: 'Spiced Ochre Tussar', filename: 'tussar_ochre_studio.jpg', url: SAREE_IMAGES.tussarOchre },
  { label: 'Emerald Asharfi Chanderi', filename: 'chanderi_emerald_studio.jpg', url: SAREE_IMAGES.chanderiEmerald },
  { label: 'Atelier Heritage Drape', filename: 'hero_atelier_drape.jpg', url: SAREE_IMAGES.heroAtelier },
];

interface UploadingItem {
  id: string;
  filename: string;
  previewUrl: string;
  progress: number;
}

interface ProductImageUploaderProps {
  images: ProductImageMeta[];
  onChange: (nextImages: ProductImageMeta[]) => void;
  validationError?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

function uploadImageWithProgress(
  payload: { filename: string; mimeType: string; dataBase64: string },
  onProgress: (percent: number) => void
): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/uploads');
    xhr.setRequestHeader('Content-Type', 'application/json');
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && parsed.url) {
          onProgress(100);
          resolve({ url: parsed.url, filename: parsed.filename || payload.filename });
        } else {
          reject(new Error(parsed.error || 'Image upload failed.'));
        }
      } catch {
        reject(new Error('Unexpected server response during image upload.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading image.'));
    xhr.send(JSON.stringify(payload));
  });
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  images,
  onChange,
  validationError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const remainingSlots = MAX_PRODUCT_IMAGES - images.length - uploadingItems.length;

  const processFiles = async (fileList: FileList | File[]) => {
    setUploadError('');
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const available = MAX_PRODUCT_IMAGES - images.length - uploadingItems.length;
    if (available <= 0) {
      setUploadError(`Maximum of ${MAX_PRODUCT_IMAGES} images per saree reached. Remove an image to add more.`);
      return;
    }

    const acceptedFiles: File[] = [];
    const rejectedNames: string[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const validMime = ALLOWED_MIMES.includes(file.type.toLowerCase());
      const validExt = ALLOWED_EXTENSIONS.includes(ext);
      if (!validMime && !validExt) {
        rejectedNames.push(file.name);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 8 MB limit.`);
        continue;
      }
      if (acceptedFiles.length < available) {
        acceptedFiles.push(file);
      }
    }

    if (rejectedNames.length > 0) {
      setUploadError(`Unsupported format for: ${rejectedNames.join(', ')}. Allowed: JPG, JPEG, PNG, WEBP.`);
    } else if (files.length > available) {
      setUploadError(`Only ${available} more image(s) allowed (maximum ${MAX_PRODUCT_IMAGES} per saree).`);
    }

    if (acceptedFiles.length === 0) return;

    const pendingPlaceholders: UploadingItem[] = acceptedFiles.map((file, idx) => ({
      id: `up-${Date.now()}-${idx}`,
      filename: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 12,
    }));

    setUploadingItems((prev) => [...prev, ...pendingPlaceholders]);

    let latestList = [...images];
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const placeholder = pendingPlaceholders[i];
      let usedFallbackUrl = false;
      const defaultView: SareeImageView =
        latestList.length === 0
          ? 'Main Product'
          : latestList.length === 1
            ? 'Front View'
            : latestList.length === 2
              ? 'Back View'
              : latestList.length === 3
                ? 'Border & Zari Details'
                : latestList.length === 4
                  ? 'Fabric Close-up'
                  : 'Model / Styling';

      try {
        const dataBase64 = await readFileAsBase64(file);
        const mimeType =
          file.type ||
          (file.name.toLowerCase().endsWith('.png')
            ? 'image/png'
            : file.name.toLowerCase().endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg');

        const uploaded = await uploadImageWithProgress(
          { filename: file.name, mimeType, dataBase64 },
          (pct) => {
            setUploadingItems((prev) =>
              prev.map((u) => (u.id === placeholder.id ? { ...u, progress: pct } : u))
            );
          }
        );

        latestList = [
          ...latestList,
          {
            url: uploaded.url,
            filename: uploaded.filename,
            viewType: defaultView,
          },
        ];
        onChange(latestList);
      } catch {
        // Fallback to temporary local preview if upload endpoint is unavailable
        usedFallbackUrl = true;
        latestList = [
          ...latestList,
          {
            url: placeholder.previewUrl,
            filename: file.name,
            viewType: defaultView,
          },
        ];
        onChange(latestList);
        setUploadError(
          `Server upload unavailable — attached "${file.name}" using a temporary browser preview. Connect Supabase Storage for permanent cloud URLs.`
        );
      } finally {
        if (!usedFallbackUrl) {
          URL.revokeObjectURL(placeholder.previewUrl);
        }
        setUploadingItems((prev) => prev.filter((u) => u.id !== placeholder.id));
      }
    }
  };

  const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleCardReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };

  const handleSetMain = (index: number) => {
    if (index === 0 || index < 0 || index >= images.length) return;
    const updated = [...images];
    const [chosen] = updated.splice(index, 1);
    updated.unshift({ ...chosen, viewType: 'Main Product' });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
    if (lightboxIndex !== null) {
      if (updated.length === 0) setLightboxIndex(null);
      else if (lightboxIndex >= updated.length) setLightboxIndex(updated.length - 1);
    }
  };

  const handleViewChange = (index: number, viewType: SareeImageView) => {
    onChange(images.map((item, idx) => (idx === index ? { ...item, viewType } : item)));
  };

  const handleAddStudioAsset = (url: string) => {
    if (!url) return;
    setUploadError('');
    if (images.length >= MAX_PRODUCT_IMAGES) {
      setUploadError(`Maximum of ${MAX_PRODUCT_IMAGES} images allowed per product.`);
      return;
    }
    if (images.some((img) => img.url === url)) return;
    const match = CURATED_IMAGE_OPTIONS.find((opt) => opt.url === url);
    onChange([
      ...images,
      {
        url,
        filename: match?.filename || url.split('/').pop() || 'studio-saree.jpg',
        viewType: images.length === 0 ? 'Main Product' : 'Front View',
      },
    ]);
  };

  return (
    <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE7E3] pb-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-[#24211F]">Product Images</h2>
          <p className="text-xs text-[#534245]">
            Upload saree views (Main, Front, Back, Border &amp; Zari, Fabric close-up, Model styling). Drag cards to reorder.
          </p>
        </div>
        <span
          className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded border ${
            images.length >= MAX_PRODUCT_IMAGES
              ? 'text-[#7A5212] bg-[#FAF3E7] border-[#E5CFA0]'
              : 'text-[#641E32] bg-[#FAF7F2] border-[#D8C9B4]'
          }`}
        >
          {images.length} / {MAX_PRODUCT_IMAGES} images
        </span>
      </div>

      {/* Validation & Upload Errors */}
      {(validationError || uploadError) && (
        <div className="flex items-start gap-2 p-3 text-xs text-[#8B1E2D] bg-[#FBECEE] border border-[#E8A2AA] rounded">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError || validationError}</span>
        </div>
      )}

      {/* Large Drag-and-Drop Upload Area */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={handleDropZoneDrop}
        className={`border-2 border-dashed rounded p-6 sm:p-8 text-center transition-colors ${
          isDragOver
            ? 'border-[#641E32] bg-[#FAF3E7]'
            : 'border-[#D8C9B4] bg-[#FAF7F2] hover:border-[#C3A46C]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files);
              e.target.value = '';
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-11 h-11 rounded-full bg-white border border-[#D8C9B4] flex items-center justify-center text-[#641E32]">
            <Upload className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#24211F]">
              {isDragOver
                ? 'Drop saree images here to upload'
                : images.length > 0
                  ? 'Drag & drop more saree images or browse your computer'
                  : 'Drag & drop saree images here, or click to select from computer'}
            </p>
            <p className="text-xs text-[#534245]">
              Supports JPG, JPEG, PNG, and WEBP · Maximum {MAX_PRODUCT_IMAGES} images per saree (8 MB max each)
            </p>
          </div>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={remainingSlots <= 0}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422] disabled:bg-[#D8C9B4] disabled:text-[#534245] transition-colors cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{images.length > 0 ? 'Add More Images' : 'Upload Image'}</span>
            </button>
            <select
              onChange={(e) => {
                if (e.target.value) handleAddStudioAsset(e.target.value);
                e.target.value = '';
              }}
              defaultValue=""
              disabled={remainingSlots <= 0}
              className="px-3 py-2.5 text-xs border border-[#C3A46C] text-[#641E32] font-medium rounded bg-white hover:bg-[#FAF3E7] disabled:opacity-50"
            >
              <option value="">Or choose from Atelier Studio Library...</option>
              {CURATED_IMAGE_OPTIONS.map((opt) => (
                <option key={opt.url} value={opt.url}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Upload Progress Bars */}
      {uploadingItems.length > 0 && (
        <div className="space-y-2">
          {uploadingItems.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] border border-[#D8C9B4] rounded">
              <img
                src={u.previewUrl}
                alt={u.filename}
                className="w-10 h-12 object-cover rounded border border-[#D8C9B4] shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#24211F] truncate">{u.filename}</span>
                  <span className="tabular-nums font-semibold text-[#641E32]">{u.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#E8E1dd] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#641E32] transition-all duration-150"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Images Responsive Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((item, idx) => {
            const isMain = idx === 0;
            const isDraggedOver = dragTargetIndex === idx && dragIndex !== idx;
            return (
              <div
                key={`${item.url}-${idx}`}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragTargetIndex(idx);
                }}
                onDragLeave={() => setDragTargetIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null) {
                    handleCardReorder(dragIndex, idx);
                  }
                  setDragIndex(null);
                  setDragTargetIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragTargetIndex(null);
                }}
                className={`bg-white border rounded overflow-hidden flex flex-col transition-all ${
                  isMain
                    ? 'border-[#641E32] ring-1 ring-[#C3A46C]/60'
                    : isDraggedOver
                      ? 'border-[#C3A46C] bg-[#FAF3E7]'
                      : 'border-[#D8C9B4]'
                }`}
              >
                {/* Preview Container */}
                <div className="relative aspect-[3/4] bg-[#FAF7F2] group">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="block w-full h-full cursor-zoom-in"
                    title="Click for larger preview"
                  >
                    <SafeImage
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Top Left Main Badge or Drag Handle */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {isMain ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.05em] bg-[#641E32] text-white border border-[#C3A46C]">
                        <Star className="w-2.5 h-2.5 fill-[#C3A46C] text-[#C3A46C]" />
                        Main Image
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/90 border border-[#D8C9B4] text-[10px] font-semibold text-[#534245] cursor-grab"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-3 h-3" />
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Top Right Zoom & Remove */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="p-1.5 bg-white/90 border border-[#D8C9B4] text-[#24211F] rounded hover:text-[#641E32] cursor-pointer"
                      aria-label="Enlarge image preview"
                      title="Larger preview"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 bg-white/90 border border-[#E8A2AA] text-[#8B1E2D] rounded hover:bg-[#FBECEE] cursor-pointer"
                      aria-label={`Remove ${item.filename}`}
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Metadata & Controls */}
                <div className="p-2.5 space-y-2 border-t border-[#EEE7E3] bg-[#FAF7F2]">
                  <p className="text-[11px] font-medium text-[#24211F] truncate" title={item.filename}>
                    {item.filename}
                  </p>

                  <select
                    value={item.viewType}
                    onChange={(e) => handleViewChange(idx, e.target.value as SareeImageView)}
                    aria-label="Saree view angle"
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#D8C9B4] rounded text-[#24211F]"
                  >
                    {SAREE_VIEW_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {!isMain ? (
                      <button
                        type="button"
                        onClick={() => handleSetMain(idx)}
                        className="flex-1 py-1 px-2 text-[10px] font-semibold border border-[#C3A46C] text-[#641E32] bg-white rounded hover:bg-[#FAF3E7] cursor-pointer whitespace-nowrap"
                      >
                        Set as Main
                      </button>
                    ) : (
                      <span className="flex-1 py-1 px-2 text-[10px] font-semibold text-[#1C4A3A] bg-[#EBF3EF] border border-[#95C1AE] rounded text-center whitespace-nowrap">
                        Primary Gallery
                      </span>
                    )}

                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleCardReorder(idx, idx - 1)}
                        className="p-1 border border-[#D8C9B4] bg-white rounded text-[#534245] hover:text-[#641E32] disabled:opacity-35 cursor-pointer"
                        aria-label="Move image left"
                        title="Move left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleCardReorder(idx, idx + 1)}
                        className="p-1 border border-[#D8C9B4] bg-white rounded text-[#534245] hover:text-[#641E32] disabled:opacity-35 cursor-pointer"
                        aria-label="Move image right"
                        title="Move right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Larger Preview Modal */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B1422]/60 backdrop-blur-[4px] p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="bg-white border border-[#C3A46C] rounded max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 bg-[#FAF7F2] border-b border-[#D8C9B4]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#24211F] truncate">
                  {images[lightboxIndex].filename}
                </p>
                <p className="text-[11px] text-[#534245]">
                  {images[lightboxIndex].viewType} · Image {lightboxIndex + 1} of {images.length}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lightboxIndex !== 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSetMain(lightboxIndex);
                      setLightboxIndex(0);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer"
                  >
                    Set as Main Image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="p-1.5 text-[#534245] hover:text-[#641E32] cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative bg-[#F5F0E8] flex items-center justify-center max-h-[70vh] overflow-hidden p-4">
              <SafeImage
                src={images[lightboxIndex].url}
                alt={images[lightboxIndex].filename}
                className="max-h-[64vh] w-auto object-contain rounded border border-[#D8C9B4]"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)
                    }
                    className="absolute left-4 p-2 bg-white/90 border border-[#D8C9B4] rounded-full text-[#24211F] hover:text-[#641E32] cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
                    className="absolute right-4 p-2 bg-white/90 border border-[#D8C9B4] rounded-full text-[#24211F] hover:text-[#641E32] cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
