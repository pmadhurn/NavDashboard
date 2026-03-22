FROM imresamu/postgis:16-3.5

# Install pgvector extension
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        postgresql-server-dev-16 \
        git \
        ca-certificates && \
    git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git /tmp/pgvector && \
    cd /tmp/pgvector && \
    make && \
    make install && \
    rm -rf /tmp/pgvector && \
    apt-get remove -y build-essential postgresql-server-dev-16 git && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
