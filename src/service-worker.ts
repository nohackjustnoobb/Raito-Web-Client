/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA
precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }: { request: Request; url: URL }) => {
    // If this isn't a navigation, skip.
    if (request.mode !== "navigate") {
      return false;
    }

    // If this is a URL that starts with /_, skip.
    if (url.pathname.startsWith("/_")) {
      return false;
    }

    // If this looks like a URL for a resource, because it contains
    // a file extension, skip.
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    // Return true to signal that we want to use the handler.
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + "/index.html")
);

// An example runtime caching route for requests that aren't handled by the
// precache, in this case images requests
async function clearExpiredCacheEntries() {
  const cache = await caches.open("images");
  const keys = await cache.keys();
  const now = Date.now();

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get("Date");
      const cacheControlHeader = response.headers.get("Cache-Control");

      if (dateHeader && cacheControlHeader) {
        const maxAgeMatch = cacheControlHeader.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const date = new Date(dateHeader);
          const age = (now - date.getTime()) / 1000;
          const maxAge = parseInt(maxAgeMatch[1]);

          if (maxAge && maxAge > age) continue;
        }
      }

      await cache.delete(request);
    }
  }
}

setInterval(clearExpiredCacheEntries, 5 * 60 * 1000);

async function removeLeastUsedCacheEntry() {
  const cache = await caches.open("images");
  const keys = await cache.keys();
  let leastUsed: Date | null = null;
  let leastUsedEntry: Request | null = null;

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get("Date");
      if (dateHeader) {
        const date = new Date(dateHeader);
        if (!leastUsed || leastUsed > date) {
          leastUsed = date;
          leastUsedEntry = request;
        }
      }
    }
  }

  if (leastUsedEntry) await cache.delete(leastUsedEntry);
}

const imagesExtensionRegexp = /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i;
registerRoute(
  // Add in any other file extensions or routing criteria as needed.
  ({ url }) => url.pathname.match(imagesExtensionRegexp),
  async ({ request }) => {
    const cache = await caches.open("images");
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get("Date");
      const cacheControlHeader = cachedResponse.headers.get("Cache-Control");
      if (cacheControlHeader && dateHeader) {
        const maxAgeMatch = cacheControlHeader.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1]);
          const date = new Date(dateHeader);
          const age = (Date.now() - date.getTime()) / 1000;
          if (age < maxAge) {
            // The cached response is still valid
            return cachedResponse;
          } else {
            await cache.delete(request);
          }
        }
      }
    }

    // Fetch a fresh response
    const freshResponse = await fetch(request);

    // Check if the response is cacheable
    if (freshResponse.status === 200) {
      const cacheControlHeader = freshResponse.headers.get("Cache-Control");
      if (!cacheControlHeader || !cacheControlHeader.includes("no-store")) {
        // Clone the response and add it to the cache
        const responseToCache = freshResponse.clone();
        try {
          await cache.put(request, responseToCache);
        } catch (e) {
          await removeLeastUsedCacheEntry();
          try {
            await cache.put(request, responseToCache);
          } catch (e) {
            console.error(
              "Failed to cache after removing least used entry:",
              e
            );
          }
        }
      }
    }

    return freshResponse;
  }
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Any other custom service worker logic can go here.
