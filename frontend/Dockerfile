FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* variables are inlined into the JS bundle at build time,
# not read at container runtime -- so this has to be set before `next
# build` runs. It points at localhost:8000 because it's consumed by the
# *browser*, which reaches the backend through the port docker-compose
# publishes to the host, not through the internal container network.
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
