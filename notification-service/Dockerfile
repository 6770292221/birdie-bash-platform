# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
# ต้องมี package*.json เพื่อให้ npm เห็น scripts
COPY package*.json ./
# ใช้ node_modules จาก deps (มี devDeps สำหรับ tsc)
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# มี curl ไว้ให้ healthcheck ใช้
RUN apk add --no-cache curl
# คัดลอกไฟล์ที่ต้องใช้ตอนรัน
COPY package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
# ตัด devDependencies ออกให้เบา
RUN npm prune --omit=dev
EXPOSE 3009
# ค่าเริ่มต้นให้รัน API (worker จะ override command ใน compose)
CMD ["node", "dist/server.js"]
