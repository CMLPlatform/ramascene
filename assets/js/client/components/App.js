// @flow
import React, {Component} from 'react';
import { Container, Row } from 'react-bootstrap';
import {unmountComponentAtNode} from 'react-dom';

// Import sub-components
import LayoutHeader from './Layout/LayoutHeader';
import SettingsPanel from './Settings/SettingsPanel';
import FilterPanel from './Filter/FilterPanel';
import ActionPanel from './Action/ActionPanel';
import VisualizationView from './Visualization/VisualizationView';
import ModellingPanel from './Modelling/ModellingPanel';
import FooterPanel from './Layout/FooterPanel';
import WaitingModal from './Layout/WaitingModal';

// Import utilities and constants
import {renderToContainer} from './utils';
import {
    PERSPECTIVE_PRODUCTION, PERSPECTIVE_CONSUMPTION,
    VIZ_TREEMAP, VIZ_GEOMAP,
    VIZDETAIL_TOTAL, VIZDETAIL_CONTINENT, VIZDETAIL_COUNTRY,
    MAX_JOB_COUNT, WAIT_INTERVAL, getDefaultQuery, getInitialState
} from './constants';

import shortid from 'shortid';
import ReactGA from 'react-ga';
import PropTypes from 'prop-types';

// Initialize Google Analytics
ReactGA.initialize('UA-130048269-1', {
    gaOptions: {
        siteSpeedSampleRate: 50
    }
});

ReactGA.pageview('/ramascene/');

class App extends Component {

    constructor(props) {
        super(props);

        this.state = getInitialState();
        
        this.scenarioCompRef = null;
        this.setScenarioRef = component => {
            this.scenarioCompRef = component;
        };

        this.timer = null;
    }

    // ==================== Event Handlers ====================

    handleProductionClicked = () => {
        this.setState({
            selectedPerspectiveOption: PERSPECTIVE_PRODUCTION
        });
    };

    handleConsumptionClicked = () => {
        this.setState({
            selectedPerspectiveOption: PERSPECTIVE_CONSUMPTION
        });
    };

    handleTreeMapClicked = () => {
        this.setState({
            selectedVisualizationOption: VIZ_TREEMAP
        });
    };

    handleGeoMapClicked = () => {
        this.setState({
            selectedVisualizationOption: VIZ_GEOMAP
        });
    };

    handleTotalClicked = () => {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_TOTAL
        });
    };

    handleContinentClicked = () => {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_CONTINENT
        });
    };

    handleCountryClicked = () => {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_COUNTRY
        });
    };

    handleDeleteAllClicked = () => {
        this.setState({jobs: []});
        unmountComponentAtNode(document.getElementById('visualization'));
        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    };

    handleYearChange = (value) => {
        this.setState({
            selectedYearOption: value
        });
    };

    handleProductChange = (value) => {
        this.setState({
            selectedProductOptions: value
        });
    };

    handleRegionChange = (value) => {
        this.setState({
            selectedRegionOptions: value
        });
    };

    handleIndicatorChange = (value) => {
        this.setState({
            selectedIndicatorOptions: value
        });
    };

    // ==================== Job Management Handlers ====================

    handleAnalyse = () => {
        ReactGA.event({
            category: 'Analysis',
            action: 'Perform Analysis'
        });

        // Process form data
        let nodesSec, nodesReg, extn, year;
        
        if (!Array.isArray(this.state.selectedProductOptions)) {
            nodesSec = [parseInt(this.state.selectedProductOptions)];
        } else {
            nodesSec = this.state.selectedProductOptions.map(x => parseInt(x));
        }
        
        if (!Array.isArray(this.state.selectedRegionOptions)) {
            nodesReg = [parseInt(this.state.selectedRegionOptions)];
        } else {
            nodesReg = this.state.selectedRegionOptions.map(x => parseInt(x));
        }

        if (!Array.isArray(this.state.selectedIndicatorOptions)) {
            extn = [parseInt(this.state.selectedIndicatorOptions)];
        } else {
            extn = this.state.selectedIndicatorOptions.map(x => parseInt(x));
        }

        if (!Array.isArray(this.state.selectedYearOption)) {
            year = [parseInt(this.state.selectedYearOption)];
        } else {
            year = this.state.selectedYearOption.map(x => parseInt(x));
        }

        const query = {
            dimType: this.state.selectedPerspectiveOption,
            vizType: this.state.selectedVisualizationOption,
            nodesSec: nodesSec,
            nodesReg: nodesReg,
            extn: extn,
            year: year
        };

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: false, detailLevel: this.state.selectedVisualizationDetailOption});

        this.setState({
            busy: true,
            jobs: jobs,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal, WAIT_INTERVAL);
    };

    handleModelling = () => {
        this.setState({
            busy: true,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal, WAIT_INTERVAL);
    };

    closeModal = () => {
        clearTimeout(this.timer);
        this.setState({waiting_modal_open: false});
    };

    handleJobFinished = () => {
        clearTimeout(this.timer);
        this.setState({
            busy: false
        });
    };

    // ==================== View Management ====================

    componentDidMount() {
        const query = getDefaultQuery();
        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: true, detailLevel: VIZDETAIL_COUNTRY});

        this.setState({
            busy: true,
            jobs: jobs,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal, WAIT_INTERVAL);
    }

    renderVisualization = (data, unit, is_modelling_result, model_details, job_name, key) => {
        this.updateJobViewState(key, 'in_main_view', true);

        const new_model_details = this.processModelDetails(model_details, is_modelling_result);

        // Import Visualization component dynamically to avoid circular dependency
        const Visualization = require('../visualization').default;

        switch (job_name.query.vizType) {
            case 'geo':
                const geo_data = this.processDataForVisualization(data);
                renderToContainer(
                    <Visualization 
                        type='geo' 
                        detailLevel={job_name.detailLevel} 
                        data={geo_data} 
                        unit={unit} 
                        model_details={new_model_details} 
                        query={job_name} 
                        is_modelling_result={is_modelling_result} 
                        hide_callback={this.hideMainView}
                    />,
                    'visualization'
                );
                break;
            case 'tree':
                const tree_data = this.processDataForVisualization(data);
                renderToContainer(
                    <Visualization 
                        type='tree' 
                        data={tree_data} 
                        unit={unit} 
                        model_details={new_model_details} 
                        query={job_name} 
                        is_modelling_result={is_modelling_result} 
                        hide_callback={this.hideMainView}
                    />,
                    'visualization'
                );
                break;
            default:
                break;
        }
    };

    renderComparisonVisualisation = (data, unit, is_modelling_result, model_details, job_name, key) => {
        this.updateJobViewState(key, 'in_comparison_view', true);

        const new_model_details = this.processModelDetails(model_details, is_modelling_result);

        // Import Visualization component dynamically to avoid circular dependency
        const Visualization = require('../visualization').default;

        switch (job_name.query.vizType) {
            case 'geo':
                const geo_data = this.processDataForVisualization(data);
                renderToContainer(
                    <Visualization 
                        type='geo' 
                        detailLevel={job_name.detailLevel} 
                        data={geo_data} 
                        unit={unit} 
                        model_details={new_model_details} 
                        query={job_name} 
                        is_modelling_result={is_modelling_result} 
                        hide_callback={this.hideComparisonView}
                    />,
                    'comparison-visualization'
                );
                break;
            case 'tree':
                const tree_data = this.processDataForVisualization(data);
                renderToContainer(
                    <Visualization 
                        type='tree' 
                        data={tree_data} 
                        unit={unit} 
                        model_details={new_model_details} 
                        query={job_name} 
                        is_modelling_result={is_modelling_result} 
                        hide_callback={this.hideComparisonView}
                    />,
                    'comparison-visualization'
                );
                break;
            default:
                break;
        }
    };

    hideMainView = () => {
        this.updateJobViewState(null, 'in_main_view', false);
        unmountComponentAtNode(document.getElementById('visualization'));
    };

    hideComparisonView = () => {
        this.updateJobViewState(null, 'in_comparison_view', false);
        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    };

    deleteJob = (in_main_view, in_comparison_view, key) => {
        const jobs = this.state.jobs.filter(j => j.key != key);
        this.setState({
            jobs: jobs
        });

        if (in_main_view) {
            unmountComponentAtNode(document.getElementById('visualization'));
        }
        if (in_comparison_view) {
            unmountComponentAtNode(document.getElementById('comparison-visualization'));
        }
    };

    // ==================== Helper Methods ====================

    updateJobViewState = (targetKey, viewProp, value) => {
        const jobs = Object.assign([], this.state.jobs);
        
        // Clear existing selection for this view property
        jobs.forEach(job => {
            if (job[viewProp] === true) {
                job[viewProp] = false;
            }
        });
        
        // Set the target job
        if (targetKey) {
            const targetIndex = jobs.findIndex(job => job.key === targetKey);
            if (targetIndex >= 0) {
                jobs[targetIndex][viewProp] = value;
            }
        }
        
        this.setState({
            jobs: jobs,
            model_details: this.state.model_details
        });
    };

    processModelDetails = (model_details, is_modelling_result) => {
        const new_model_details = [];
        
        if (is_modelling_result && this.scenarioCompRef) {
            model_details.forEach((model_detail) => {
                new_model_details.push({
                    product: this.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    consumedBy: this.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    originReg: this.scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                    consumedReg: this.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    techChange: model_detail.techChange
                });
            });
        }
        
        return new_model_details;
    };

    processDataForVisualization = (data) => {
        const result = [];
        Object.keys(data).forEach((key) => {
            result.push({id: key, value: data[key]});
        });
        return result;
    };

    // ==================== Context Management ====================

    getChildContext() {
        return {
            saveSettingsCallback: this.saveModellingSettings,
            clearSettingsCallback: this.clearModellingSettings,
            scenarioCompRef: this.scenarioCompRef
        };
    }

    saveModellingSettings = (model_details) => {
        this.setState({model_details: model_details});
    };

    clearModellingSettings = () => {
        this.setState({model_details: []});
    };

    // ==================== Render ====================

    render() {
        const {
            selectedPerspectiveOption,
            selectedVisualizationOption,
            selectedVisualizationDetailOption,
            busy,
            jobs,
            waiting_modal_open
        } = this.state;

        return (
            <Container fluid>
                <LayoutHeader jobCount={jobs.length} />
                
                <Row>
                    <SettingsPanel
                        selectedPerspectiveOption={selectedPerspectiveOption}
                        selectedVisualizationOption={selectedVisualizationOption}
                        selectedVisualizationDetailOption={selectedVisualizationDetailOption}
                        busy={busy}
                        jobCount={jobs.length}
                        onProductionClick={this.handleProductionClicked}
                        onConsumptionClick={this.handleConsumptionClicked}
                        onTreeMapClick={this.handleTreeMapClicked}
                        onGeoMapClick={this.handleGeoMapClicked}
                        onTotalClick={this.handleTotalClicked}
                        onContinentClick={this.handleContinentClicked}
                        onCountryClick={this.handleCountryClicked}
                    />
                    
                    <FilterPanel
                        selectedProductOptions={this.state.selectedProductOptions}
                        selectedRegionOptions={this.state.selectedRegionOptions}
                        selectedIndicatorOptions={this.state.selectedIndicatorOptions}
                        selectedYearOption={this.state.selectedYearOption}
                        busy={busy}
                        jobCount={jobs.length}
                        selectMultiProduct={this.state.selectMultiProduct}
                        selectMultiRegion={this.state.selectMultiRegion}
                        onProductChange={this.handleProductChange}
                        onRegionChange={this.handleRegionChange}
                        onIndicatorChange={this.handleIndicatorChange}
                        onYearChange={this.handleYearChange}
                        onProductRef={this.setScenarioRef}
                    />
                    
                    <ActionPanel
                        busy={busy}
                        jobCount={jobs.length}
                        onAnalyseClick={this.handleAnalyse}
                        onDeleteAllClick={this.handleDeleteAllClicked}
                    />
                </Row>

                <Row>
                    <VisualizationView
                        jobs={jobs}
                        busy={busy}
                        onJobFinished={this.handleJobFinished}
                        onRenderResult={this.renderVisualization}
                        onRenderComparison={this.renderComparisonVisualisation}
                        onDeleteJob={this.deleteJob}
                        onStartModelling={this.handleModelling}
                        onHideView={this.hideMainView}
                        viewTitle="Main View"
                        containerId="visualization"
                    />
                    
                    <VisualizationView
                        jobs={jobs}
                        busy={busy}
                        onJobFinished={this.handleJobFinished}
                        onRenderResult={this.renderVisualization}
                        onRenderComparison={this.renderComparisonVisualisation}
                        onDeleteJob={this.deleteJob}
                        onStartModelling={this.handleModelling}
                        onHideView={this.hideComparisonView}
                        viewTitle="Comparison View"
                        containerId="comparison-visualization"
                    />
                </Row>

                <ModellingPanel 
                    busy={busy} 
                    onScenarioRef={this.setScenarioRef}
                />

                <FooterPanel />

                <WaitingModal 
                    show={waiting_modal_open} 
                    onHide={this.closeModal}
                />
            </Container>
        );
    }
}

// Type checking for children
App.childContextTypes = {
    saveSettingsCallback: PropTypes.func,
    clearSettingsCallback: PropTypes.func,
    scenarioCompRef: PropTypes.object
};

export default App;