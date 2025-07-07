const helmet = require('helmet');

const setupHelmetConfig = (app) => {
  // Base Helmet configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://app.oalizo.com", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // Additional Helmet configuration for iframes
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        frameAncestors: [
          "'self'",
          "https://oalizo.netlify.app"
        ]
      }
    }
  }));
};

module.exports = { setupHelmetConfig };
