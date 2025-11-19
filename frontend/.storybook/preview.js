import React from 'react';
import '../src/index.css';
import { StoryProviders } from '../src/storybook/StoryProviders';

const CenterDecorator = (Story, context) =>
  React.createElement(
    StoryProviders,
    null,
    React.createElement(
      'div',
      {
        style: {
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          padding: '2rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
      React.createElement(Story, context),
    ),
  );

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { expanded: true },
};

export const decorators = [CenterDecorator];
