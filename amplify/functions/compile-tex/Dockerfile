# Tectonic compile sidecar — Lambda container image.
# Build:   docker build -t neurolib-compile-tex .
# Test:    docker run --rm -p 9000:8080 neurolib-compile-tex
# Deploy:  push to ECR and reference from amplify/functions/compile-tex/resource.ts.

FROM public.ecr.aws/lambda/nodejs:20

# 1. Install Tectonic (musl static binary)
ARG TECTONIC_VERSION=0.15.0
RUN dnf install -y tar gzip && \
    curl -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
      -o /tmp/tectonic.tgz && \
    tar -xzf /tmp/tectonic.tgz -C /usr/local/bin && \
    rm /tmp/tectonic.tgz && \
    chmod +x /usr/local/bin/tectonic

# 2. Bundle the curated preamble next to the handler
COPY templates/preamble.tex ${LAMBDA_TASK_ROOT}/preamble.tex

# 3. Pre-warm the Tectonic package cache against the bundled preamble so
#    the first user compile doesn't pay the package-fetch cost.
RUN mkdir -p /opt/tectonic-cache && \
    TECTONIC_CACHE_DIR=/opt/tectonic-cache \
      tectonic --print --keep-intermediates --outdir /tmp \
        ${LAMBDA_TASK_ROOT}/preamble.tex || true && \
    chmod -R a+r /opt/tectonic-cache

ENV TECTONIC_CACHE_DIR=/opt/tectonic-cache
ENV PREAMBLE_PATH=${LAMBDA_TASK_ROOT}/preamble.tex

# 4. Handler — the Amplify build pipeline copies handler.ts → handler.js into the image
COPY handler.js ${LAMBDA_TASK_ROOT}/

CMD ["handler.handler"]
