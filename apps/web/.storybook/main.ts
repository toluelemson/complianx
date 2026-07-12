import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: [
    '../src/design-system/**/*.stories.@(ts|tsx|js|jsx|mdx)',
    '../src/stories/**/*.stories.@(ts|tsx|js|jsx|mdx)',
  ],
  addons: ['@storybook/addon-essentials', '@storybook/addon-links'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  webpackFinal: async (baseConfig) => {
    baseConfig.module?.rules?.push({
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              require.resolve('@babel/preset-env'),
              require.resolve('@babel/preset-typescript'),
              [
                require.resolve('@babel/preset-react'),
                { runtime: 'automatic' },
              ],
            ],
          },
        },
      ],
    });
    baseConfig.resolve?.extensions?.push('.ts', '.tsx');
    return baseConfig;
  },
};

export default config;
