FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Copy proto files to dist directory
RUN mkdir -p dist/proto && cp -r src/proto/*.proto dist/proto/

EXPOSE 3000

CMD ["npm", "start"]