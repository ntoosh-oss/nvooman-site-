module.exports = function analyticsConfig(request, response) {
  const measurementId = process.env.GA4_MEASUREMENT_ID || "";
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(200).json({
    measurementId: /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : null,
  });
};
