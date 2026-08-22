module.exports = function analyticsConfig(request, response) {
  const measurementId = process.env.GA4_MEASUREMENT_ID || "";
  const adsConversionId = process.env.GOOGLE_ADS_CONVERSION_ID || "AW-9444322707";
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(200).json({
    measurementId: /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : null,
    adsConversionId: /^AW-\d+$/.test(adsConversionId) ? adsConversionId : null,
  });
};
