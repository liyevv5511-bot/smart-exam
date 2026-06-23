FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
# Sxemi qur (IF NOT EXISTS), admini yarat (ON CONFLICT), sonra serveri başlat — təkrar işə salmağa təhlükəsizdir
CMD ["sh", "-c", "npx tsx src/db/init.ts && npx tsx src/db/seed.ts && npx tsx src/index.ts"]
