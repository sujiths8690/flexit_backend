FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👇 THIS IS THE FIX
RUN npx prisma generate

RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
