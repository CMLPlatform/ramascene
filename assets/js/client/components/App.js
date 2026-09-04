// @flow
import React, {Component} from 'react';
import { Alert, Button, ButtonGroup, Card, Col, Container, Image, Modal, Nav, Navbar, OverlayTrigger, Popover, Row, Spinner, Table } from 'react-bootstrap';
import {renderToContainer, unmountComponentAtNode, CustomTooltip} from './utils';
import { 
    PERSPECTIVE_PRODUCTION, PERSPECTIVE_CONSUMPTION,
    VIZ_TREEMAP, VIZ_GEOMAP, 
    VIZDETAIL_TOTAL, VIZDETAIL_CONTINENT, VIZDETAIL_COUNTRY,
    MAX_JOB_COUNT, WAIT_INTERVAL, getDefaultQuery, getInitialState
} from './constants';
import Visualization from '../visualization';
import ProductFilterableMultiSelectDropdownTree from '../productFilterableMultiSelectDropdownTree';
import ProductFilterableSingleSelectDropdownTree from '../productFilterableSingleSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from '../regionFilterableSingleSelectDropdownTree';
import RegionFilterableMultiSelectDropdownTree from '../regionFilterableMultiSelectDropdownTree';
import IndicatorFilterableSingleSelectDropdownTree from '../indicatorFilterableSingleSelectDropdownTree';
import YearFilterableSingleSelectDropdownTree from '../yearFilterableSingleSelectDropdownTree';
import AnalysisJob from '../analysisJob';
import ScenarioModel from "../ScenarioModel";
import PropTypes from 'prop-types';
import ReactGA from 'react-ga';
import shortid from 'shortid';

// Initialize Google Analytics
ReactGA.initialize('UA-130048269-1', {
    gaOptions: {
        siteSpeedSampleRate: 50
    }
});

ReactGA.pageview('/ramascene/');

// Import help texts
var {selection_menu_helptext, perspective_helptext, product_helptext, indicator_helptext, modelling_menu_helptext, analysis_queue_helptext, product_model_helptext} = require('../helptexts');

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

    handleProductionClicked() {
        this.setState({
            selectedPerspectiveOption: PERSPECTIVE_PRODUCTION
        });
    }

    handleConsumptionClicked() {
        this.setState({
            selectedPerspectiveOption: PERSPECTIVE_CONSUMPTION
        });
    }

    handleTreeMapClicked() {
        this.setState({
            selectedVisualizationOption: VIZ_TREEMAP
        });
    }

    handleGeoMapClicked() {
        this.setState({
            selectedVisualizationOption: VIZ_GEOMAP
        });
    }

    handleTotalClicked() {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_TOTAL
        });
    }

    handleContinentClicked() {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_CONTINENT
        });
    }

    handleCountryClicked() {
        this.setState({
            selectedVisualizationDetailOption: VIZDETAIL_COUNTRY
        });
    }

    handleDeleteAllClicked() {
        this.setState({jobs: []});
        unmountComponentAtNode(document.getElementById('visualization'));
        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    }

    handleYearChange(value) {
        this.setState({
            selectedYearOption: value
        });
    }

    handleProductChange(value) {
        this.setState({
            selectedProductOptions: value
        });
    }

    handleRegionChange(value) {
        this.setState({
            selectedRegionOptions: value
        });
    }

    handleIndicatorChange(value) {
        this.setState({
            selectedIndicatorOptions: value
        });
    }

    // ==================== Job Management Handlers ====================

    handleAnalyse() {
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
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    handleModelling() {
        this.setState({
            busy: true,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    closeModal() {
        clearTimeout(this.timer);
        this.setState({waiting_modal_open: false});
    }

    handleJobFinished() {
        clearTimeout(this.timer);
        this.setState({
            busy: false
        });
    }

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
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    renderVisualization(data, unit, is_modelling_result, model_details, job_name, key) {
        const jobs = Object.assign([], this.state.jobs);
        
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_main_view == true;
        });
        
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_main_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        const index = this.state.jobs.findIndex((job) => {
            return job.key == key;
        });
        
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_main_view = true;
        jobs[index] = job;

        this.setState({
            jobs: jobs,
            model_details: model_details
        });

        const new_model_details = [];
        if (is_modelling_result) {
            model_details.forEach(function (model_detail) {
                new_model_details.push({
                    product: this.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    consumedBy: this.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    originReg: this.scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                    consumedReg: this.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    techChange: model_detail.techChange
                });
            }.bind(this));
        }

        switch (job.query.vizType) {
            case 'geo':
                const geo_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                
                renderToContainer(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideMainView.bind(this)}/>, 'visualization');
                break;
            case 'tree':
                const tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                
                renderToContainer(<Visualization type='tree' data={tree_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideMainView.bind(this)}/>, 'visualization');
                break;
            default:
                // Unknown visualization type
                break;
        }
    }

    renderComparisonVisualisation(data, unit, is_modelling_result, model_details, job_name, key) {
        const jobs = Object.assign([], this.state.jobs);
        
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_comparison_view == true;
        });
        
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_comparison_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        const index = this.state.jobs.findIndex((job) => {
            return job.key == key;
        });
        
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_comparison_view = true;
        jobs[index] = job;

        this.setState({
            jobs: jobs,
            model_details: model_details
        });

        const new_model_details = [];
        if (is_modelling_result) {
            model_details.forEach(function (model_detail) {
                new_model_details.push({
                    product: this.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    consumedBy: this.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    originReg: this.scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                    consumedReg: this.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    techChange: model_detail.techChange
                });
            }.bind(this));
        }

        switch (job.query.vizType) {
            case 'geo':
                const geo_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                
                renderToContainer(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideComparisonView.bind(this)}/>, 'comparison-visualization');
                break;
            case 'tree':
                const tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                
                renderToContainer(<Visualization type='tree' data={tree_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideComparisonView.bind(this)}/>, 'comparison-visualization');
                break;
            default:
                // Unknown visualization type
                break;
        }
    }

    hideMainView() {
        const jobs = Object.assign([], this.state.jobs);
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_main_view == true;
        });
        
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_main_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        this.setState({
            jobs: jobs
        });

        unmountComponentAtNode(document.getElementById('visualization'));
    }

    hideComparisonView() {
        const jobs = Object.assign([], this.state.jobs);
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_comparison_view == true;
        });
        
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_comparison_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        this.setState({
            jobs: jobs
        });

        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    }

    deleteJob(in_main_view, in_comparison_view, key) {
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
    }

    // ==================== Context Management ====================

    getChildContext() {
        return {
            saveSettingsCallback: this.saveModellingSettings.bind(this),
            clearSettingsCallback: this.clearModellingSettings.bind(this),
            scenarioCompRef: this.scenarioCompRef
        };
    }

    saveModellingSettings(model_details) {
        this.setState({model_details: model_details});
    }

    clearModellingSettings() {
        this.setState({model_details: []});
    }

    // ==================== Render ====================

    render() {
        const selectedPerspectiveOption = this.state.selectedPerspectiveOption;
        const selectedVisualizationOption = this.state.selectedVisualizationOption;
        const selectedVisualizationDetailOption = this.state.selectedVisualizationDetailOption;

        return (
            <Container fluid>
                <Navbar expand="lg" className="mb-3">
                    <Navbar.Brand href="../">
                        <Image src="../static/rama-logo-big.svg" />
                    </Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse className="justify-content-end">
                        <Nav>
                            <Nav.Link href="../">Home</Nav.Link>
                            <Nav.Link href="../#about">About</Nav.Link>
                            <Nav.Link href="../#methods">Methods</Nav.Link>
                            <Nav.Link href="../#deliverables">Resources</Nav.Link>
                            <Nav.Link href="../#contact">Contact</Nav.Link>
                            <Nav.Link href="https://www.jotform3.leidenuniv.nl/CMLformJweb/rama-scene-feedback" target="_blank">Feedback</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                {this.state.jobs.length == MAX_JOB_COUNT && <Alert variant="warning">
                    You reached the maximum number of jobs on your job queue. You first have to delete a job from the queue before being able to do additional analyses.
                </Alert>}
                <Row>
                    <Col sm={2} md={2} lg={2}>
                        <Card>
                            <Card.Header>
                                <Card.Title>Baseline settings <CustomTooltip tooltip={selection_menu_helptext} id="selection-menu-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></Card.Title>
                            </Card.Header>

                            <Card.Body>
                                <Row>
                                    <Col>
                                        <div>Analysis <CustomTooltip tooltip={perspective_helptext} id="perspective-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <ButtonGroup>
                                            <Button onClick={this.handleProductionClicked.bind(this)}
                                                active={selectedPerspectiveOption == PERSPECTIVE_PRODUCTION}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Hotspot</Button>
                                            <Button onClick={this.handleConsumptionClicked.bind(this)}
                                                active={selectedPerspectiveOption == PERSPECTIVE_CONSUMPTION}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Contribution</Button>
                                        </ButtonGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <div>Visualisation</div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <ButtonGroup>
                                            <Button onClick={this.handleTreeMapClicked.bind(this)}
                                                active={selectedVisualizationOption == VIZ_TREEMAP}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Sectoral</Button>
                                            <Button onClick={this.handleGeoMapClicked.bind(this)}
                                                active={selectedVisualizationOption == VIZ_GEOMAP}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Geographic</Button>
                                        </ButtonGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <div>Detail</div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <ButtonGroup>
                                            <Button onClick={this.handleTotalClicked.bind(this)}
                                                active={selectedVisualizationDetailOption == VIZDETAIL_TOTAL}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Total</Button>
                                            <Button onClick={this.handleContinentClicked.bind(this)}
                                                active={selectedVisualizationDetailOption == VIZDETAIL_CONTINENT}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Continent</Button>
                                            <Button onClick={this.handleCountryClicked.bind(this)}
                                                active={selectedVisualizationDetailOption == VIZDETAIL_COUNTRY}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>Country</Button>
                                        </ButtonGroup>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col sm={10} md={10} lg={10}>
                        <Row>
                            <Col>
                                <Row>
                                    <Col sm={3} md={3} lg={3}>
                                        <div>Product <CustomTooltip tooltip={product_helptext} id="product-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        <div>Indicators <CustomTooltip tooltip={indicator_helptext} id="indicator-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        <div>Region <CustomTooltip tooltip={product_helptext} id="region-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        <div>Consumer <CustomTooltip tooltip={product_helptext} id="consumer-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Row>
                                    <Col sm={3} md={3} lg={3}>
                                        {this.state.selectMultiProduct ? (
                                            <ProductFilterableMultiSelectDropdownTree onChange={this.handleProductChange.bind(this)}
                                                value={this.state.selectedProductOptions}
                                                ref={this.setProductRef}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                        ) : (
                                            <ProductFilterableSingleSelectDropdownTree onChange={this.handleProductChange.bind(this)}
                                                value={this.state.selectedProductOptions}
                                                ref={this.setProductRef}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                        )}
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        <IndicatorFilterableSingleSelectDropdownTree onChange={this.handleIndicatorChange.bind(this)}
                                            value={this.state.selectedIndicatorOptions}
                                            ref={this.setIndicatorRef}
                                            disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        {this.state.selectMultiRegion ? (
                                            <RegionFilterableMultiSelectDropdownTree onChange={this.handleRegionChange.bind(this)}
                                                value={this.state.selectedRegionOptions}
                                                ref={this.setRegionRef}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                        ) : (
                                            <RegionFilterableSingleSelectDropdownTree onChange={this.handleRegionChange.bind(this)}
                                                value={this.state.selectedRegionOptions}
                                                ref={this.setRegionRef}
                                                disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                        )}
                                    </Col>
                                    <Col sm={3} md={3} lg={3}>
                                        <YearFilterableSingleSelectDropdownTree onChange={this.handleYearChange.bind(this)}
                                            value={this.state.selectedYearOption}
                                            ref={this.setYearRef}
                                            disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT} />
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={6}>
                                <Button onClick={this.handleAnalyse.bind(this)} variant="success" disabled={this.state.busy || this.state.jobs.length == MAX_JOB_COUNT}>
                                    {this.state.busy ? (<Spinner animation="border" size="sm" />) : 'Analyse'}
                                </Button>
                            </Col>
                            <Col lg={6}>
                                <Button onClick={this.handleDeleteAllClicked.bind(this)} variant="danger" disabled={this.state.busy || this.state.jobs.length == 0}>
                                    Clear All
                                </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row>
                    <Col lg={6}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <Card.Title>Main View <Button className="close ms-auto" onClick={this.hideMainView.bind(this)} title="Clear visualization"><span>&times;</span></Button></Card.Title>
                            </Card.Header>

                            <Card.Body>
                                <Row>
                                    <Col>
                                        <div>
                                            {this.state.jobs.map(function(job) {
                                                return (<AnalysisJob key={job.key}
                                                    job={job}
                                                    busy={this.state.busy}
                                                    in_main_view={job.in_main_view}
                                                    in_comparison_view={job.in_comparison_view}
                                                    finishHandler={this.handleJobFinished.bind(this)}
                                                    resultHandler={this.renderVisualization.bind(this)}
                                                    comparisonHandler={this.renderComparisonVisualisation.bind(this)}
                                                    deleteHandler={this.deleteJob.bind(this)}
                                                    startModellingHandler={this.handleModelling.bind(this)} />)
                                            }.bind(this))}
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <div id="visualization" className="visualization-container"></div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <Card.Title>Comparison View <Button className="close ms-auto" onClick={this.hideComparisonView.bind(this)} title="Clear visualization"><span>&times;</span></Button></Card.Title>
                            </Card.Header>

                            <Card.Body>
                                <Row>
                                    <Col>
                                        <div>
                                            {this.state.jobs.map(function(job) {
                                                return (<AnalysisJob key={job.key}
                                                    job={job}
                                                    busy={this.state.busy}
                                                    in_main_view={job.in_main_view}
                                                    in_comparison_view={job.in_comparison_view}
                                                    finishHandler={this.handleJobFinished.bind(this)}
                                                    resultHandler={this.renderVisualization.bind(this)}
                                                    comparisonHandler={this.renderComparisonVisualisation.bind(this)}
                                                    deleteHandler={this.deleteJob.bind(this)}
                                                    startModellingHandler={this.handleModelling.bind(this)} />)
                                            }.bind(this))}
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <div id="comparison-visualization" className="visualization-container"></div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Card>
                            <Card.Header>
                                <Card.Title>Counterfactual settings <CustomTooltip tooltip={modelling_menu_helptext} id="modelling-menu-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <ScenarioModel ref={this.setScenarioRef}
                                    busy={this.state.busy}>
                                </ScenarioModel>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col className="text-center">
                        <div>
                            <Image src="../static/partners.png" fluid />
                            <Image src="../static/EIT_EU_logos/RM-Academy-Logo-White_300px_plus_EU_flag_vertical.png" fluid />
                        </div>
                    </Col>
                </Row>
                <Modal show={this.state.waiting_modal_open} onHide={this.closeModal.bind(this)}>
                    <Modal.Header closeButton>
                        {/*<Modal.Title></Modal.Title>*/}
                    </Modal.Header>
                    <Modal.Body>
                    <p>This may take a while - expected min. wait time 2 seconds for analytical calculations, max. wait time 10 minutes or longer at heavy traffic and doing modelling</p>
                    </Modal.Body>
                </Modal>
            </Container>
        );
    }
}

// Type checking for children
awesomeApp.childContextTypes = {
    saveSettingsCallback: PropTypes.func,
    clearSettingsCallback: PropTypes.func,
    scenarioCompRef: PropTypes.object
};

export default App;