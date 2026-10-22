// expo-sqlite on web runs SQLite as WebAssembly in a worker and needs SharedArrayBuffer,
// which browsers only allow on cross-origin-isolated pages: the COOP/COEP headers are set in app.json
// (expo-router plugin, dev server) and render.yaml (production).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// Dev server: the app.json headers only apply to server output, so set them here too.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
