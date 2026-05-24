FROM node:22-alpine

RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --ignore-scripts

COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./

WORKDIR /workspace/packages/backend

EXPOSE 3001

CMD ["pnpm", "dev"]
