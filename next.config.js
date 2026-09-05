const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

// A dev server must never replace chunks used by the production preview.
module.exports = (phase) => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next-production",
});
