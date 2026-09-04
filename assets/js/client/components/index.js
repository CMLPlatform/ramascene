// @flow
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import ReactGA from 'react-ga';

// Initialize Google Analytics
ReactGA.initialize('UA-130048269-1', {
    gaOptions: {
        siteSpeedSampleRate: 50
    }
});

ReactGA.pageview('/ramascene/');

// Helper function to render with React 18 createRoot
function renderToContainer(element, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(element);
        // Store root for potential unmounting later
        container._reactRoot = root;
    }
}

// Export the App component and utilities
export {renderToContainer};
export default App;