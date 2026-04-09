FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👇 THIS IS THE FIX
RUN npx prisma generate

# If using TypeScript
RUN npm run build

EXPOSE 3002

CMD ["node", "dist/app.js"]