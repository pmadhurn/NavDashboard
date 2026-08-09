# Multi-stage. `dev` runs the Vite dev server (what docker-compose.yml uses);
# `production` ships a static build behind nginx (what docker-compose.prod.yml
# uses). Compose must name the stage explicitly via `target:` — otherwise it
# builds the last stage, which is `production`.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ── dev ────────────────────────────────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── build ──────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
# `npm run build` is `tsc && vite build`, so a type error fails the image
# rather than shipping a broken bundle.
RUN npm run build

# ── production ─────────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
