FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 3005

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
