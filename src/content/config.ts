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
    date: z.coerce.date(),
  }),
});

export const collections = { listings };
