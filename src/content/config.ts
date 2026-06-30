import { defineCollection, z } from 'astro:content';

const listings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    status: z.enum(['available', 'sold', 'coming-soon', 'under-contract']),
    featured: z.boolean().default(false),
    state: z.enum(['Arizona', 'Tennessee']),
    county: z.string(),
    acreage: z.string(),
    price: z.string().optional(),
    zoning: z.string().optional(),
    roadAccess: z.string().optional(),
    water: z.string().optional(),
    power: z.string().optional(),
    gps: z.string().optional(),
    videoUrl: z.string().optional(),
    showVideo: z.boolean().default(true),
    zillowUrl: z.string().optional(),
    showZillow: z.boolean().default(false),
    showSellerFinance: z.boolean().default(false),
    photos: z.array(z.string()).default([]),
    amenityPhotos: z.array(z.object({
      image: z.string(),
      caption: z.string(),
      category: z.string().optional(),
    })).optional().default([]),
    dateSold: z.coerce.date().optional(),
    showDaysOnMarket: z.boolean().default(false),
    buyerTestimonial: z.string().optional(),
    buyerName: z.string().optional(),
    community: z.string().optional(),
    date: z.coerce.date(),
  }),
});

const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    location: z.string().optional(),
    role: z.string().optional(),
    featured: z.boolean().default(true),
    order: z.number().default(99),
    date: z.coerce.date(),
  }),
});

const communities = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    location: z.string().optional(),
    state: z.enum(['Arizona', 'Tennessee']).optional(),
    status: z.enum(['coming-soon', 'lots-available', 'sold-out']),
    image: z.string().optional(),
    videoUrl: z.string().optional(),
    showVideo: z.boolean().default(true),
    amenityPhotos: z.array(z.object({
      image: z.string(),
      caption: z.string(),
      category: z.string().optional(),
    })).optional().default([]),
    date: z.coerce.date(),
  }),
});

const press = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publication: z.string().optional(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    externalUrl: z.string().optional(),
    pdf: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const podcasts = defineCollection({
  type: 'content',
  schema: z.object({
    showName: z.string(),
    episodeTitle: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    coverImage: z.string().optional(),
    listenUrl: z.string(),
    featured: z.boolean().default(false),
  }),
});

const books = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    coverImage: z.string().optional(),
    description: z.string().optional(),
    amazonPaperbackUrl: z.string().optional(),
    amazonKindleUrl: z.string().optional(),
    publishedDate: z.coerce.date().optional(),
    featured: z.boolean().default(false),
  }),
});

const ebooks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    coverImage: z.string().optional(),
    description: z.string().optional(),
    audience: z.enum(['buyers', 'investors', 'sellers', 'both']).default('both'),
    featured: z.boolean().default(true),
  }),
});

const faqs = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    category: z.enum(['buying', 'selling', 'general']),
    order: z.number().default(99),
    active: z.boolean().default(true),
  }),
});

// CMS-editable site settings (src/content/settings/*.json)
const settings = defineCollection({
  type: 'data',
  schema: z.object({
    // contact.json
    phone: z.string().optional(),
    phoneRaw: z.string().optional(),
    email: z.string().optional(),
    // homepage.json
    homepageVideoId: z.string().optional(),
    heroTagline: z.string().optional(),
    // sugar-tree.json
    saleDate: z.string().optional(),
    heroVideoUrl: z.string().optional(),
  }),
});

const team = defineCollection({
  type: 'content',  // body = bio
  schema: z.object({
    name:   z.string(),
    role:   z.string(),
    photo:  z.string().optional(),
    order:  z.number().default(99),
    active: z.boolean().default(true),
  }),
});

const vendors = defineCollection({
  type: 'content',  // body = short description
  schema: z.object({
    name:        z.string(),
    category:    z.enum(['excavation-septic', 'builders', 'lenders']),
    state:       z.enum(['Arizona', 'Tennessee', 'Both']),
    logo:        z.string().optional(),
    serviceArea: z.string().optional(),
    phone:       z.string().optional(),
    website:     z.string().optional(),
    active:      z.boolean().default(true),
    order:       z.number().default(99),
  }),
});

export const collections = { listings, testimonials, communities, press, podcasts, books, ebooks, faqs, settings, team, vendors };
