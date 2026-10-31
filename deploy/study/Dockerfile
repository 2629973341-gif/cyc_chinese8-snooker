FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 g++ nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 learner && useradd --uid 10001 --gid 10001 --no-create-home learner
USER 10001:10001
WORKDIR /work
CMD ["node", "--version"]
