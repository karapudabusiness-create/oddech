module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Pozwala importować pliki .sql (migracje Drizzle) jako stringi.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
