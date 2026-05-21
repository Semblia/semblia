/**
 * Curated testimonials for the widget studio when a project has too few real
 * approved testimonials to make a meaningful preview. Used as fallback content
 * inside `WidgetStudioPreview` only — never persisted, never sent to api_v2.
 */

import type { V2TestimonialDTO } from "@workspace/types";

const PLACEHOLDER_AVATAR = (seed: string) =>
  `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundType=gradientLinear&backgroundColor=f5e8d8,f8d7c4,e8d8f5,d8e8f5`;

const NOW = Date.now();

function makeTestimonial(
  id: string,
  authorName: string,
  authorRole: string | null,
  authorCompany: string | null,
  content: string,
  rating: number,
  daysAgo: number,
): V2TestimonialDTO {
  const iso = new Date(NOW - daysAgo * 86_400_000).toISOString();
  return {
    id: `demo_${id}`,
    projectId: "demo",
    formId: null,
    authorName,
    authorEmail: null,
    authorRole,
    authorCompany,
    authorAvatar: {
      id: `demo_${id}_avatar`,
      url: PLACEHOLDER_AVATAR(authorName),
      contentType: "image/svg+xml",
      byteSize: null,
      purpose: "TESTIMONIAL_AUTHOR_AVATAR",
      visibility: "PUBLIC",
      status: "ACTIVE",
      createdAt: iso,
    },
    content,
    type: "TEXT",
    video: null,
    media: null,
    source: "demo",
    sourceUrl: null,
    isPublished: true,
    rating,
    isApproved: true,
    isOAuthVerified: true,
    oauthProvider: "google",
    moderationStatus: "APPROVED",
    moderationScore: 0.02,
    moderationFlags: null,
    autoPublished: false,
    createdAt: iso,
    updatedAt: iso,
    tags: [],
  };
}

export const FALLBACK_TESTIMONIALS: V2TestimonialDTO[] = [
  makeTestimonial(
    "1",
    "Hana Mizuki",
    "Founder",
    "Linework Studio",
    "Switched our entire onboarding flow over in two afternoons. The team noticed within a week — completion rates jumped from 47% to 71%.",
    5,
    2,
  ),
  makeTestimonial(
    "2",
    "Olu Adesanya",
    "Staff Engineer",
    "Numera",
    "Genuinely the first tool I've shipped without fighting. The defaults are sharp enough that I almost never override them.",
    5,
    5,
  ),
  makeTestimonial(
    "3",
    "Margaux Renaud",
    "Product Designer",
    null,
    "Finally — testimonials that don't look glued onto the page. The wall sits inside our docs and looks like it was always there.",
    5,
    7,
  ),
  makeTestimonial(
    "4",
    "Devansh Iyer",
    "CTO",
    "Frame Forge",
    "Setup took eleven minutes. We've had it in production for two months and never had to touch it again. Boring is the highest praise here.",
    4,
    9,
  ),
  makeTestimonial(
    "5",
    "Beatrix Sølvberg",
    "Marketing Lead",
    "Hyperspell",
    "What sold us was the moderation queue — auto-flagging the obvious junk so we only see the testimonials worth showing.",
    5,
    12,
  ),
  makeTestimonial(
    "6",
    "Theo Wessel",
    "Indie maker",
    null,
    "I run three side projects on this. Embeds load fast, the wall page ranks for our brand searches, and the analytics show me what's actually working.",
    5,
    14,
  ),
  makeTestimonial(
    "7",
    "Priyanka Bhattacharya",
    "Head of Customer Success",
    "Aurora Labs",
    "Customers send us thank-yous in Slack constantly. Now half of those become testimonials with one click. Everyone wins.",
    5,
    18,
  ),
  makeTestimonial(
    "8",
    "Caleb Mwangi",
    "Founder",
    "Studio Karoo",
    "We used to chase quotes manually and paste them into Figma frames. That whole workflow is just gone now. Massive time-back.",
    4,
    21,
  ),
  makeTestimonial(
    "9",
    "Liesel Vandenberg",
    "Operations",
    "Slate & Co.",
    "The Wall of Love became our highest-converting landing page. Not the homepage — the wall. We didn't expect that.",
    5,
    25,
  ),
  makeTestimonial(
    "10",
    "Rohan Date",
    "Senior PM",
    "Kestrel",
    "Drop-in widget. No bundler config, no React gymnastics, no surprises. The kind of tool you forget about, which is exactly what you want.",
    5,
    28,
  ),
  makeTestimonial(
    "11",
    "Anaïs Dubois",
    "Brand Lead",
    "Vela & Vela",
    "Three customers told us the testimonial section is what made them buy. Not the pricing page. Not the demo. The wall.",
    5,
    32,
  ),
  makeTestimonial(
    "12",
    "Sho Nakamura",
    "Independent",
    null,
    "Embedded it in a portfolio site for a freelance designer. They got two leads in the first week — both mentioned the testimonials.",
    4,
    36,
  ),
];

/**
 * Pick `n` testimonials, mixing real ones first then padding with curated.
 * Always returns ≥ 1 unless both arrays are empty.
 */
export function selectPreviewTestimonials(
  real: V2TestimonialDTO[],
  count: number,
  minRealForExclusive = 3,
): { items: V2TestimonialDTO[]; usedFallback: boolean } {
  if (real.length >= minRealForExclusive) {
    return { items: real.slice(0, count), usedFallback: false };
  }
  const merged = [...real, ...FALLBACK_TESTIMONIALS];
  return { items: merged.slice(0, count), usedFallback: real.length === 0 };
}
