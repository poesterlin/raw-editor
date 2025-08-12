# STAGE 1: Build the Bun application
# This stage remains the same. It uses a debian-based image for glibc compatibility.
FROM oven/bun:debian AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Create the JS bundle
RUN bun run build && bun build --compile ./build/index.js --outfile executable

#####################################################################

# STAGE 2: Create a minimal base with only the RawTherapee CLI
# We use debian:bookworm-slim for the smallest possible base.
FROM debian:bookworm-slim AS rawtherapee-base

# Install only the rawtherapee-cli package and clean up in a single layer
RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends rawtherapee && \
    # This cleanup step is crucial for a small image size
    rm -rf /var/lib/apt/lists/*

#####################################################################

# STAGE 3: Final application image
FROM rawtherapee-base

WORKDIR /app

# Copy the single compiled executable from the 'build' stage.
COPY --from=build /app/executable .

EXPOSE 3000

# Run your compiled application.
# Your app can now call `rawtherapee-cli` directly as it's in the system's PATH.
CMD ["/app/executable"]