# STAGE 1: Build the Bun application
# This stage remains mostly the same, using a Debian-based image for glibc compatibility.
FROM oven/bun:debian AS build

WORKDIR /app

COPY package.json bun.lock ./

# Copy source (use .dockerignore to exclude unnecessary files like node_modules, .git)
COPY . .

# Install dependencies
RUN bun install

# Create the JS bundle
RUN bun run build

#####################################################################

# STAGE 2: Create a minimal base with the RawTherapee CLI from AppImage
# Use Debian 12 for the smallest possible base.
FROM debian:12 AS rawtherapee-base

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install dependencies for downloading and extracting the AppImage
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        libexpat1 \
        gawk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install rawtherapee from appimage
RUN \
  RAWTHERAPEE_VERSION=$(curl -sX GET "https://api.github.com/repos/rawtherapee/rawtherapee/releases/latest" \
  | awk '/tag_name/{print $4;exit}' FS='[""]') && \
  cd /tmp && \
  curl -o \
    /tmp/rawtherapee.app -L \
    "https://github.com/rawtherapee/rawtherapee/releases/download/${RAWTHERAPEE_VERSION}/RawTherapee_${RAWTHERAPEE_VERSION}_release.AppImage" && \
  chmod +x /tmp/rawtherapee.app && \
  ./rawtherapee.app --appimage-extract && \
  mv squashfs-root /opt/rawtherapee && \
  rm -rf /tmp/*

# Add rawtherapee to the path
ENV PATH="/opt/rawtherapee/usr/bin:${PATH}"

#####################################################################

# STAGE 3: Final application image
FROM rawtherapee-base

# Copy Bun binary from the build stage (oven/bun places it here; compatible with Debian glibc)
COPY --from=build /usr/local/bin/bun /usr/local/bin/bun

# Set PATH permanently for Bun - this prepends to the existing PATH
ENV PATH="/usr/local/bin:${PATH}"

# Set production env for runtime
ENV NODE_ENV=production

WORKDIR /app

# Ensure import dir exists for the RAF file
RUN mkdir -p /app/import

# Copy the single compiled executable from the 'build' stage
COPY --from=build /app/build/ build/

# Copy node_modules and package.json if your build requires dynamic requires at runtime
# (Omit these lines if your 'bun run build' produces a fully self-contained bundle to save ~200MB+)
COPY --from=build /app/node_modules/ node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000

# Run your compiled application (assumes it calls rawtherapee-cli internally)
# Your app can now call `rawtherapee-cli` directly as it's in the system's PATH.
CMD ["bun", "/app/build/index.js"]
