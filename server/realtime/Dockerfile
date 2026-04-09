FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ❌ REMOVE prisma steps
# COPY prisma ./prisma
# RUN npx prisma generate

RUN npm run build

EXPOSE 3003

CMD ["node", "dist/app.js"]