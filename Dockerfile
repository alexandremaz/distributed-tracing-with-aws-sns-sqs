ARG NODE_IMAGE=24.12.0-alpine3.23

FROM node:${NODE_IMAGE}

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./

