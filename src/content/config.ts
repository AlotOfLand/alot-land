import { defineCollection, z } from 'astro:content';

const listings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    status: z.enum(['available', 'sold']),
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

export const collections = { listings, testimonials };
