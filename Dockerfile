# syntax=docker/dockerfile:1

# One Dockerfile, two targets:
#   dev     – `next dev` with Fast Refresh, used by compose.yaml
#   runner  – minimal production image (standalone output), used by compose.prod.yaml

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- dependencies ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- development ----------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

# ---------- production build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# SITE_URL goes into prerendered pages (canonical URLs, sitemap.xml).
ARG SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    SITE_URL=${SITE_URL}
RUN npm run build

# ---------- production runtime ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The first staff account on the server: node create-staff.ts <email> "<name>" admin
COPY --chown=nextjs:nodejs scripts/create-staff.ts ./create-staff.ts
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
