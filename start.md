# First-time setup (run once)
cd /home/basel/Projects/Store
pnpm install                  # also rerun after dependency or .npmrc hoist-pattern changes so Medusa admin build resolution stays in sync
docker compose up -d          # postgres, redis, minio + minio-init (bucket `medusa`)
pnpm db:migrate               # after pulling changes (adds translation tables when enabled)
pnpm seed:locales             # once: en, ar, he in Medusa (Menu → Language in storefront)
pnpm --filter medusa exec medusa user -e admin@store.local -p Admin123!
							  # MinIO bootstrap also makes bucket `medusa` publicly readable for product media thumbnails

# Daily run
cd /home/basel/Projects/Store
docker compose up -d
pnpm dev:medusa               # API + admin → http://localhost:9244/app (files → MinIO when S3_* in apps/medusa/.env)
pnpm dev:storefront           # Next.js → http://localhost:8000
pnpm --filter medusa-next build && pnpm --filter medusa-next exec next start -p 8001
							   # production storefront smoke/profiling run; use HTTPS or a manual tenant cache cookie for local HTTP because production cookies are secure
pnpm test:storefront:unit
							   # lightweight Vitest coverage for shared storefront utilities, including Phase 6 WhatsApp formatter behavior
pnpm test:e2e:install-browsers
							   # first local Playwright setup: installs Chromium without sudo prompts
pnpm test:e2e:checkout
							   # runs the combined checkout Playwright suite (deep-link matrix + happy path)
pnpm test:e2e:checkout-matrix
							   # runs the automated checkout deep-link matrix (State A/B/C/D)
pnpm test:e2e:checkout-happy-path
							   # runs a full local manual-payment checkout through order confirmation
pnpm provision:tenant -- "Acme Store" acme store.acme.local en,ar usd*,eur track_visible
							   # creates/reuses one Medusa store + dedicated sales channel + publishable key and stores tenant defaults in store.metadata
pnpm delete:tenant -- acme
							   # deletes that tenant-owned store bundle cleanly (store + sales channel + publishable key)
pnpm describe:tenants -- acme
							   # prints the store/channel/key topology for that tenant slug
curl 'http://127.0.0.1:9244/tenant?tenant=acme'
							   # public tenant bootstrap lookup used by storefront middleware to resolve host → publishable key/defaults
pnpm verify:translations -- http://127.0.0.1:9244 <publishable_api_key> <product_handle> en,ar
							   # verifies localized product payload (EN/AR) using x-medusa-locale
pnpm smoke:test-uploads
							   # uploads a small text file through Medusa's file module, reads it back from MinIO, then deletes it
pnpm --filter medusa run preset:analytics -- --days=7 --limit=10
							   # summarizes persisted preset analytics events from Postgres (selection/add-to-cart/purchase funnels)
Admin → Preset Analytics
				   # dashboard UI for preset/product performance metrics, refreshable by day range and limit
Admin → Preset Defaults
							   # store-level preset combinations by product type; used when products do not have local preset metadata
# - http://localhost:8000  → your shop (Next.js storefront). This is the customer-facing app.
# - http://localhost:9101  → MinIO *console* only (browse S3 buckets/files). Infrastructure, not the store.
# - Medusa Admin/API       → same host as `pnpm dev:medusa` (port set in apps/medusa, e.g. 9244).
#
# Medusa Admin login: use the same email/password passed to `medusa user` above.
# For this setup: admin@store.local / Admin123!
#
# MinIO Console login (from docker-compose.yml):
# Username: minio
# Password: minio12345678
#
# If Medusa admin/frontend dependency resolution starts failing after package changes, rerun `pnpm install` from the workspace root.
# The workspace root `.npmrc` carries the pnpm hoist rules used by the Medusa admin build.
# CI note: checkout deep-link automation installs OS deps separately with `pnpm test:e2e:install-browsers:ci` inside GitHub Actions.
#
# Stock display: Product → Metadata → stock_mode = track_visible | track_hidden | no_stock
# Category image: Category → Metadata → image | image_url | thumbnail = full URL (e.g. MinIO or CDN). Add CDN hosts to `NEXT_IMAGE_REMOTE_PATTERNS` when they should be allowed by Next image optimization.
# Multi-store runtime: storefront middleware now resolves tenant context by request host using Medusa `/tenant`; for local host-based testing, map the provisioned `storefront_host` (for example `store.acme.local`) to your machine.