# Raito Web Client

This is the front-end of [Raito-Manga](https://github.com/nohackjustnoobb/Raito-Manga.git).

## Quick start

1. Clone the repository

```bash
git clone https://github.com/nohackjustnoobb/Raito-Web-Client.git && cd Raito-Web-Client
```

2. Create a `.env.local` file like this:

```
SYNC_ADDRESS=https://sync.example.com/
DEFAULT_SOURCE_ADDRESS=https://api.example.com/
```

3. Install the dependencies

```bash
yarn install
```

4. Build the static files

```bash
yarn run build
```

## Known Issues

~~On iOS 17, there is a known issue with the `window.matchMedia("(prefers-color-scheme: dark)")` functionality. Once the web page is initialized, this media query does not update. As a result, if a user sets the dark theme to "auto" within the app settings (to switch between light and dark modes based on system preferences), the web app's theme will not change accordingly. To align the web app's theme with the system theme, users will need to restart the web app.~~ Fixed in iOS 18.
