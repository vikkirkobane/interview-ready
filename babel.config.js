module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-transform-imports',
        {
          'tabler-icons-react-native': {
            transform: 'tabler-icons-react-native/icons-js/${member}',
            preventFullImport: true,
          },
        },
      ],
    ],
  };
};
