# Better Manga App

Better Manga App is an open-source project aimed at simplifying the process of reading manga. The project comprises two parts: front-end and back-end. This repository contains the front-end component of the project, which requires a back-end server to operate. The back-end server can be found in the following repository: [Better-Manga-Server](https://github.com/nohackjustnoobb/Better-Manga-Server).

## Quick Start

In order to build or develop the project, it is essential to create a `.env.local` file that includes the IP address of the backend server. An example of the `.env.local` file is shown below:

```
REACT_APP_ADDRESS=http://<backend-server-ip-address>/
```

### Build the project

1. Clone the project

```
git clone https://github.com/nohackjustnoobb/Better-Manga-App
```

2. CD into the project and install the dependencies

```
cd Better-Manga-App && yarn install
```

3. Build the project

```
yarn build
```

The compiled project should be under the `build` folder.

### Starting the development server

1. Clone the project

```
git clone https://github.com/nohackjustnoobb/Better-Manga-App
```

2. CD into the project and install the dependencies

```
cd Better-Manga-App && yarn install
```

3. Start the server

```
yarn start
```

By default, the server is running on port `3000`.
