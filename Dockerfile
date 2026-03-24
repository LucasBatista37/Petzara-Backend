FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE ${PORT:-5000}

CMD ["npm", "start"]
