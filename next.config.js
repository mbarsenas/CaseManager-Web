const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

// A dev server must never replace chunks used by the production preview.
module.exports = (phase) => ({
  // Keep local development and local production previews separate, but use
  // Vercel's required standard output directory for its deployment packaging.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : process.env.VERCEL ? ".next" : ".next-production",
});
