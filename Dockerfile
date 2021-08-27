FROM node:16.8.0-alpine3.14

WORKDIR /usr/local/slack-basic
COPY package.json .
COPY package-lock.json .
RUN npm install --only=production
COPY dist/ .

CMD node main.js
