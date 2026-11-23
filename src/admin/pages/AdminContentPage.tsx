import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Plus, Save, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';
import { AdminLayout } from '../components/AdminLayout';
import { SlideOverModal } from '../components/ui/SlideOverModal';
import { SafeImage } from '../components/SafeImage';
import type { SiteContent } from '../../types/domain';

export const AdminContentPage: React.FC = () => {
  const { adminData, refreshAdminData } = useStore();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (adminData?.siteContent) {
      setContent(structuredClone(adminData.siteContent));
    }
  }, [adminData?.siteContent]);

  if (!content) {
    return (
      <AdminLayout title="Website Content & CMS" breadcrumbs={[{ label: 'Website Content' }]}>
        <div className="p-8 bg-white border border-[#D8C9B4] rounded text-xs text-[#534245]">
          Loading website content configuration...
        </div>
      </AdminLayout>
    );
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await apiRequest('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      await refreshAdminData();
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  };

  const addTestimonial = () => {
    setContent({
      ...content,
      testimonials: [
        ...content.testimonials,
        {
          id: `test-${Date.now()}`,
          customerName: 'New Patron',
          location: 'Mumbai',
          occasion: 'Bridal Trousseau',
          quote: 'Heirloom weave with extraordinary zari detail.',
          featured: true,
        },
      ],
    });
  };

  return (
    <AdminLayout
      title="Website Content Management"
      breadcrumbs={[{ label: 'Website Content' }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#C3A46C] text-[#641E32] rounded hover:bg-[#FAF3E7] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> Preview CMS Layout
          </button>
          <button
            type="submit"
            form="cms-content-form"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-[#641E32] text-white rounded hover:bg-[#3B1422] cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save & Publish Content Config'}
          </button>
        </div>
      }
    >
      {savedBanner && (
        <div className="flex items-center gap-2 p-3 bg-[#EBF3EF] border border-[#95C1AE] text-[#1C4A3A] text-xs rounded">
          <CheckCircle2 className="w-4 h-4" />
          <span>Website content configuration saved and published to the CMS API.</span>
        </div>
      )}

      <p className="text-xs text-[#534245]">
        Last published: <strong className="tabular-nums">{formatDateTime(content.lastPublishedAt)}</strong>
      </p>

      <form id="cms-content-form" onSubmit={handlePublish} className="space-y-6">
        {/* Announcement Bar */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEE7E3] pb-2">
            <h2 className="font-serif text-lg font-semibold text-[#24211F]">Top Announcement Bar</h2>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcementBar.enabled}
                onChange={(e) =>
                  setContent({
                    ...content,
                    announcementBar: { ...content.announcementBar, enabled: e.target.checked },
                  })
                }
                className="accent-[#641E32]"
              />
              Show Announcement Bar
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#534245] mb-1">Announcement Text</label>
              <input
                value={content.announcementBar.text}
                onChange={(e) =>
                  setContent({
                    ...content,
                    announcementBar: { ...content.announcementBar, text: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Link Label</label>
              <input
                value={content.announcementBar.linkLabel}
                onChange={(e) =>
                  setContent({
                    ...content,
                    announcementBar: { ...content.announcementBar, linkLabel: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
            Homepage Hero & Editorial Banner
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Eyebrow Label</label>
              <input
                value={content.hero.eyebrow}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, eyebrow: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Hero Headline</label>
              <input
                value={content.hero.headline}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, headline: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#534245] mb-1">Subheadline</label>
              <textarea
                rows={2}
                value={content.hero.subheadline}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, subheadline: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Primary CTA Label</label>
              <input
                value={content.hero.ctaLabel}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, ctaLabel: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Banner Image Path</label>
              <input
                value={content.hero.image}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, image: e.target.value } })}
                className="w-full px-3 py-2 text-sm font-mono border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>

        {/* Homepage Curated Sections */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
            Homepage Collection & Merchandising Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-[#534245] mb-1">
                <span>Featured Collections Title</span>
                <input
                  type="checkbox"
                  checked={content.sections.showFeaturedCollections}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      sections: { ...content.sections, showFeaturedCollections: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
              </label>
              <input
                value={content.sections.featuredCollectionsTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    sections: { ...content.sections, featuredCollectionsTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-[#534245] mb-1">
                <span>Best Sellers Title</span>
                <input
                  type="checkbox"
                  checked={content.sections.showBestSellers}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      sections: { ...content.sections, showBestSellers: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
              </label>
              <input
                value={content.sections.bestSellersTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    sections: { ...content.sections, bestSellersTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-[#534245] mb-1">
                <span>New Arrivals Title</span>
                <input
                  type="checkbox"
                  checked={content.sections.showNewArrivals}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      sections: { ...content.sections, showNewArrivals: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
              </label>
              <input
                value={content.sections.newArrivalsTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    sections: { ...content.sections, newArrivalsTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-[#534245] mb-1">
                <span>Wedding Collection Title</span>
                <input
                  type="checkbox"
                  checked={content.sections.showWeddingCollection}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      sections: { ...content.sections, showWeddingCollection: e.target.checked },
                    })
                  }
                  className="accent-[#641E32]"
                />
              </label>
              <input
                value={content.sections.weddingCollectionTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    sections: { ...content.sections, weddingCollectionTitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>

        {/* Brand Story & Testimonials */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
            Brand Heritage & Patron Testimonials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Brand Story Title</label>
              <input
                value={content.brandStory.title}
                onChange={(e) =>
                  setContent({ ...content, brandStory: { ...content.brandStory, title: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Atelier City</label>
              <input
                value={content.brandStory.atelierCity}
                onChange={(e) =>
                  setContent({ ...content, brandStory: { ...content.brandStory, atelierCity: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#534245] mb-1">Narrative</label>
              <textarea
                rows={3}
                value={content.brandStory.narrative}
                onChange={(e) =>
                  setContent({ ...content, brandStory: { ...content.brandStory, narrative: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#641E32]">Testimonials</span>
              <button
                type="button"
                onClick={addTestimonial}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Testimonial
              </button>
            </div>
            {content.testimonials.map((t, idx) => (
              <div key={t.id} className="p-3 bg-[#FAF7F2] border border-[#D8C9B4] rounded grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={t.customerName}
                  onChange={(e) => {
                    const next = [...content.testimonials];
                    next[idx] = { ...t, customerName: e.target.value };
                    setContent({ ...content, testimonials: next });
                  }}
                  placeholder="Customer name"
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#D8C9B4] rounded"
                />
                <input
                  value={t.location}
                  onChange={(e) => {
                    const next = [...content.testimonials];
                    next[idx] = { ...t, location: e.target.value };
                    setContent({ ...content, testimonials: next });
                  }}
                  placeholder="City"
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#D8C9B4] rounded"
                />
                <div className="flex gap-2">
                  <input
                    value={t.occasion}
                    onChange={(e) => {
                      const next = [...content.testimonials];
                      next[idx] = { ...t, occasion: e.target.value };
                      setContent({ ...content, testimonials: next });
                    }}
                    placeholder="Occasion"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#D8C9B4] rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        testimonials: content.testimonials.filter((x) => x.id !== t.id),
                      })
                    }
                    className="p-1.5 text-[#8B1E2D] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={t.quote}
                  onChange={(e) => {
                    const next = [...content.testimonials];
                    next[idx] = { ...t, quote: e.target.value };
                    setContent({ ...content, testimonials: next });
                  }}
                  className="md:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-[#D8C9B4] rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer & SEO */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
            Footer Contact & Default SEO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Concierge Email</label>
              <input
                value={content.footer.conciergeEmail}
                onChange={(e) =>
                  setContent({ ...content, footer: { ...content.footer, conciergeEmail: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Concierge Phone</label>
              <input
                value={content.footer.conciergePhone}
                onChange={(e) =>
                  setContent({ ...content, footer: { ...content.footer, conciergePhone: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#534245] mb-1">Atelier Flagship Address</label>
              <input
                value={content.footer.atelierAddress}
                onChange={(e) =>
                  setContent({ ...content, footer: { ...content.footer, atelierAddress: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Default SEO Title</label>
              <input
                value={content.seo.defaultTitle}
                onChange={(e) => setContent({ ...content, seo: { ...content.seo, defaultTitle: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Default SEO Description</label>
              <input
                value={content.seo.defaultDescription}
                onChange={(e) =>
                  setContent({ ...content, seo: { ...content.seo, defaultDescription: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>
        {/* Social Media Links */}
        <div className="bg-white border border-[#D8C9B4] rounded p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#24211F] border-b border-[#EEE7E3] pb-2">
            Social Media Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Instagram URL</label>
              <input
                type="url"
                value={content.socialLinks?.instagram || ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    socialLinks: { ...content.socialLinks, instagram: e.target.value },
                  })
                }
                placeholder="https://instagram.com/aaranyasilks"
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Facebook URL</label>
              <input
                type="url"
                value={content.socialLinks?.facebook || ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    socialLinks: { ...content.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="https://facebook.com/aaranyasilks"
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">Pinterest URL</label>
              <input
                type="url"
                value={content.socialLinks?.pinterest || ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    socialLinks: { ...content.socialLinks, pinterest: e.target.value },
                  })
                }
                placeholder="https://pinterest.com/aaranyasilks"
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#534245] mb-1">YouTube URL</label>
              <input
                type="url"
                value={content.socialLinks?.youtube || ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    socialLinks: { ...content.socialLinks, youtube: e.target.value },
                  })
                }
                placeholder="https://youtube.com/@aaranyasilks"
                className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded"
              />
            </div>
          </div>
        </div>
      </form>

      <SlideOverModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="CMS Hero & Editorial Preview"
        subtitle="Preview of configured announcement bar, hero banner, and social channels"
        size="xl"
      >
        <div className="border border-[#D8C9B4] rounded overflow-hidden">
          {content.announcementBar.enabled && (
            <div className="bg-[#3B1422] text-[#F5F0E8] px-4 py-2 text-xs text-center">
              {content.announcementBar.text} — <span className="text-[#C3A46C] underline">{content.announcementBar.linkLabel}</span>
            </div>
          )}
          <div className="bg-[#3B1422] text-white grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 space-y-3 flex flex-col justify-center">
              <p className="text-[10px] tracking-[0.2em] text-[#C3A46C] uppercase">{content.hero.eyebrow}</p>
              <h3 className="font-serif text-3xl font-semibold">{content.hero.headline}</h3>
              <p className="text-xs text-[#D8C9B4] leading-relaxed">{content.hero.subheadline}</p>
              <span className="inline-block w-fit px-4 py-2 bg-[#C3A46C] text-[#24211F] text-xs font-semibold rounded">
                {content.hero.ctaLabel}
              </span>
            </div>
            <div className="aspect-[16/10]">
              <SafeImage src={content.hero.image} alt={content.hero.headline} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </SlideOverModal>
    </AdminLayout>
  );
};
