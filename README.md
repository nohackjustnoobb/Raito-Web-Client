# Better-Manga-Web-Client

Better Manga App is an open-source project aimed at simplifying the process of reading manga. The project comprises two parts: front-end and back-end. This repository contains the front-end component of the project, which requires a back-end server to operate. The back-end server can be found in the following repository: [Better-Manga-Server](https://github.com/nohackjustnoobb/Better-Manga-Server).

## Quick Start

In order to build or develop the project, it is essential to create a `.env` file that includes the IP address of the backend server. An example of the `.env` file is shown below:

`.env`

```
REACT_APP_VERSION=$npm_package_version
REACT_APP_ADDRESS=http://<backend-server-ip-address>/
```

### Running with Docker

The easiest way to get started with the server is by running it as a Docker container.

1. Create `docker-compose.yml`

The following file is an example of what the files should resemble or look like.

`docker-compose.yml`

```
version: "3.7"

services:
  better-manga-web-client:
    image: nohackjustnoobb/better-manga-web-client
    container_name: better-manga-web-client
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
```

2. Start the server

The following command will pull the docker image and start the server.

```
sudo docker-compose up -d
```

### Manual Setup

1. Clone the project

```
git clone https://github.com/nohackjustnoobb/Better-Manga-Web-Client.git
```

2. CD into the project and install the dependencies

```
cd Better-Manga-Web-Client && yarn install
```

3. Build the project

```
yarn build
```

The compiled webpage should be under the `build` folder.

4. move build into server

```
mv build server/public
```

5. CD into server and install the dependencies

```
cd server && yarn install
```

6. Build the express server

```
yarn build
```

7. Start the server

```
yarn start:prod
```

By default, the server is running on port 8080.

### Starting the development server

1. Clone the project

```
git clone https://github.com/nohackjustnoobb/Better-Manga-Web-Client.git
```

2. CD into the project and install the dependencies

```
cd Better-Manga-Web-Client && yarn install
```

3. Start the server

```
yarn start
```

By default, the server is running on port `3000`.
