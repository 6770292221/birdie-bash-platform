FROM node:lts-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client and build TypeScript
RUN npm run db:generate && npm run build

# gRPC and HTTP ports
EXPOSE 50051 3002

CMD ["npm", "start"]
