// @flow
import React from 'react';
import {createRoot} from 'react-dom/client';
import {unmountComponentAtNode} from 'react-dom';
import {OverlayTrigger, Popover} from 'react-bootstrap';

// Helper function to render with React 18 createRoot
export function renderToContainer(element, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(element);
        // Store root for potential unmounting later
        container._reactRoot = root;
    }
}

// Custom tooltip component
export function CustomTooltip({id, children, tooltip}) {
    return (
        <OverlayTrigger trigger="click" rootClose
            overlay={<Popover id={id} placement="right"><div dangerouslySetInnerHTML={{__html: tooltip}}></div></Popover>}
            delayShow={300}
            delayHide={150}
        >{children}
        </OverlayTrigger>
    );
}

// Helper function to process job data for visualization
export function processVisualizationData(data, model_details, is_modelling_result, scenarioCompRef) {
    const new_model_details = [];
    
    if (is_modelling_result && scenarioCompRef) {
        model_details.forEach(function (model_detail) {
            new_model_details.push({
                product: scenarioCompRef.getProductLabel(model_detail.product[0]),
                consumedBy: scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                originReg: scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                consumedReg: scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                techChange: model_detail.techChange
            });
        });
    }
    
    return new_model_details;
}