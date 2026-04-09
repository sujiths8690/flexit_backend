FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Now copy rest (including src)
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3004

# Start with migration (if using Prisma)
CMD ["node", "dist/app.js"]

