FROM node:21-alpine as builder

WORKDIR /app

COPY . .

# build web page
RUN yarn install

ARG ADDRESS
ENV ADDRESS $ADDRESS
RUN yarn build

FROM node:21-alpine as final
USER node:node
WORKDIR /app

# move page to server public directory
COPY --from=builder --chown=node:node /app/build /app/public
COPY --from=builder --chown=node:node /app/server /app

# build server
RUN yarn install
RUN yarn build

# start server
EXPOSE 8080
CMD [ "yarn", "start:prod" ]
