import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders qbitctl shell', () => {
  const { getByText } = render(<App />);
  const headingElement = getByText(/qbitctl/i);
  expect(headingElement).toBeInTheDocument();
});
