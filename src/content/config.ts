import { defineCollection, z } from 'astro:content';

const listings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    status: z.enum(['available', 'sold', 'coming-soon']),
    featured: z.boolean().default(false),
    state: z.enum(['Arizona', 'Tennessee', 'Northwest Arkansas']),
    county: z.string(),
    acreage: z.string(),
    price: z.string().optional(),
    zoning: z.string().optional(),
    roadAccess: z.string().optional(),
    water: z.string().optional(),
    power: z.string().optional(),
    gps: z.string().optional(),
    videoUrl: z.string().optional(),
    photos: z.array(z.string()).default([]),
    buyerTestimonial: z.string().optional(),
    buyerName: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
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
    status: z.enum(['coming-soon', 'lots-available', 'sold-out']),
    image: z.string().optional(),
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
    audience: z.enum(['buyers', 'investors', 'both']).default('both'),
    mailerliteEmbed: z.string().optional(),
    featured: z.boolean().default(true),
  }),
});

export const collections = { listings, testimonials, communities, press, podcasts, books, ebooks };
