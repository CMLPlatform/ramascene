import React from 'react';

export const ModellingContext = React.createContext({
    model_details: null,
    saveSettingsCallback: null,
    clearSettingsCallback: null,
    scenarioCompRef: null
});