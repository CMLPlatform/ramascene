// @flow
// Webpack entry point
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './components/App';
import ReactGA from 'react-ga';

// Initialize Google Analytics
ReactGA.initialize('UA-130048269-1', {
    gaOptions: {
        siteSpeedSampleRate: 50
    }
});

ReactGA.pageview('/ramascene/');

// Main entry point - render the app
const container = document.getElementById('container');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

// Export for use by other modules (like visualization rendering)
export function renderToContainer(element, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(element);
        // Store root for potential unmounting later
        container._reactRoot = root;
    }
}