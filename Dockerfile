FROM node:20-slim

# Install git, gh CLI, bash, curl, ca-certs
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    gnupg \
    --no-install-recommends \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | gpg --dearmor -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y gh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 scanner \
    && useradd --uid 1001 --gid scanner --shell /bin/bash --create-home scanner

# App directory owned by non-root user
WORKDIR /app
COPY --chown=scanner:scanner . .

# Install Node deps. .npmrc sets ignore-scripts=true, so no dependency lifecycle
# scripts run during install (defense-in-depth). --ignore-scripts is explicit too.
RUN npm ci --omit=dev --ignore-scripts

# Repos will be cloned here at runtime (tmpfs or volume)
RUN mkdir -p /workspace && chown scanner:scanner /workspace

# Switch to non-root
USER scanner

# Run via the hardened launcher (applies --disallow-code-generation-from-strings).
ENTRYPOINT ["node", "bin/polinrider.js"]
