# Better-Manga-Web-Client

Better Manga App is an open-source project aimed at simplifying the process of reading manga. The project comprises two parts: front-end and back-end. This repository contains the front-end component of the project, which requires a back-end server to operate. The back-end server can be found in the following repository: [Better-Manga-Server](https://github.com/nohackjustnoobb/Better-Manga-Server).

## Quick Start

### Running with Docker

The easiest way to get started with the server is by running it as a Docker container.

1. Clone the project

```bash
git clone https://github.com/nohackjustnoobb/Better-Manga-Web-Client.git && cd Better-Manga-Web-Client
```

2. Create `docker-compose.yml`

The following file is an example of what the files should resemble or look like.

`docker-compose.yml`

```
version: "3.7"

services:
  better-manga-web-client:
    container_name: better-manga-web-client
    build:
      context: .
      args:
        - ADDRESS=<backend-server-url (WAN)>
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - ADDRESS=<backend-server-url (WAN/LAN)>
```

3. Start the server

The following command will pull the docker image and start the server.

```
sudo docker-compose up -d
```

### Manual Setup

```bash
# 1. Clone the project
# 2. CD into the project and install the dependencies
git clone https://github.com/nohackjustnoobb/Better-Manga-Web-Client.git
cd Better-Manga-Web-Client && yarn install

# 3. create .env.local
touch .env.local
# replace <backend-server-url> with the url of the backend server
echo "ADDRESS=<backend-server-url>" > file3.txt

# 4. Build the project
# 5. move build into server
yarn build
mv build server/public

# 6. CD into server and install the dependencies
# 7. Build the express server
# 8. Start the server
cd server && yarn install
yarn build
yarn start:prod

```

By default, the server is running on port 8080.

### Starting the development server

```bash
# 1. Clone the project
# 2. CD into the project and install the dependencies
# 3. Start the server
git clone https://github.com/nohackjustnoobb/Better-Manga-Web-Client.git
cd Better-Manga-Web-Client && yarn install
yarn start
```

By default, the server is running on port `3000`.
