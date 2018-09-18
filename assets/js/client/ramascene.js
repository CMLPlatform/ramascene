// @flow
import React, {Component} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import { Alert, Button, ButtonGroup, Col, Glyphicon, Grid, Image, Nav, Navbar, OverlayTrigger, Panel, Popover, Row, Table } from 'react-bootstrap';
import './stylesheets/ramascene.scss';
import Visualization from './visualization';
import ProductFilterableMultiSelectDropdownTree from './productFilterableMultiSelectDropdownTree';
import ProductFilterableSingleSelectDropdownTree from './productFilterableSingleSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from './regionFilterableSingleSelectDropdownTree';
import RegionFilterableMultiSelectDropdownTree from './regionFilterableMultiSelectDropdownTree';
import IndicatorFilterableSingleSelectDropdownTree from './indicatorFilterableSingleSelectDropdownTree';
import YearFilterableSingleSelectDropdownTree from './yearFilterableSingleSelectDropdownTree';
import AnalysisJob from './analysisJob';
import ScenarioModel from "./ScenarioModel";
// import {ModellingContext} from "./modellingContext";
import PropTypes from 'prop-types';

var shortid = require('shortid');
var {perspective_helptext,visualization_helptext,visualization_detail_helptext,year_helptext,region_helptext,product_helptext,indicator_helptext} = require('./helptexts');

function CustomTooltip({id, children, tooltip}) {
    return (
        <OverlayTrigger trigger="click"
            overlay={<Popover id={id} placement="right"><div dangerouslySetInnerHTML={{__html: tooltip}}></div></Popover>}
            delayShow={300}
            delayHide={150}
        >{children}
        </OverlayTrigger>
    );
};

class App extends Component {

    constructor(props) {
        super(props);

        this.PERSPECTIVE_PRODUCTION = 'Production';
        this.PERSPECTIVE_CONSUMPTION = 'Consumption';
        this.VIZ_TREEMAP = 'TreeMap';
        this.VIZ_GEOMAP = 'GeoMap';
        this.VIZDETAIL_TOTAL = 'total';
        this.VIZDETAIL_CONTINENT = 'continent';
        this.VIZDETAIL_COUNTRY = 'country';

        this.MAX_JOB_COUNT = 10;

        this.state = {
            selectedPerspectiveOption: this.PERSPECTIVE_PRODUCTION,
            selectedVisualizationOption: this.VIZ_TREEMAP,
            selectedVisualizationDetailOption: this.VIZDETAIL_COUNTRY,
            selectedYearOption: [],
            selectedProductOptions: [],
            selectedRegionOptions: [],
            selectedIndicatorOptions: [],
            selectMultiProduct: true,
            selectMultiRegion: false,
            busy: true,
            jobs: [],
            model_details: []
        };
    }

    handleProductionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_PRODUCTION
        });
    }

    handleConsumptionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_CONSUMPTION
        });
    }

    handleTreeMapClicked() {
        this.setState({
            selectedVisualizationOption: this.VIZ_TREEMAP,
            selectedRegionOptions: (Array.isArray(this.state.selectedRegionOptions) ? this.state.selectedRegionOptions.slice(0,1) : this.state.selectedRegionOptions),
            selectMultiProduct: true,
            selectMultiRegion: false
        });
    }

    handleGeoMapClicked() {
        this.setState({
            selectedVisualizationOption: this.VIZ_GEOMAP,
            selectedProductOptions: (Array.isArray(this.state.selectedProductOptions) ? this.state.selectedProductOptions.slice(0,1) : this.state.selectedProductOptions),
            selectedRegionOptions: [],
            selectMultiProduct: false,
            selectMultiRegion: true
        });
    }

    handleTotalClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_TOTAL,
            selectedRegionOptions: []
        });
    }

    handleContinentClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_CONTINENT,
            selectedRegionOptions: []
        });
    }

    handleCountryClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_COUNTRY,
            selectedRegionOptions: []
        });
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

    handleAnalyse() {
        // make sure for single select dropdown trees that value is presented as an array
        var nodesSec = null;
        var nodesReg = null;
        var extn = null;
        var year = null;
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
            'dimType': this.state.selectedPerspectiveOption,
            'vizType': this.state.selectedVisualizationOption,
            'nodesSec': nodesSec,
            'nodesReg': nodesReg,
            'extn': extn,
            'year': year
        };

        // this.state.jobs.push(React.createElement(AnalysisJob, {query: query, resultHandler: this.renderVisualization.bind(this), deleteHandler: this.deleteJob.bind(this)}));

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: false, detailLevel: this.state.selectedVisualizationDetailOption});

        this.setState({
            busy: true,
            jobs: jobs
        });
    }

    handleModelling() {
        this.setState({
            busy: true
        });
    }

    handleJobFinished() {
        this.setState({
            busy: false
        });
    }

    componentWillMount() {
        const query = {
            'dimType': this.PERSPECTIVE_PRODUCTION,
            'vizType': this.VIZ_TREEMAP,
            'nodesSec': [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
            'nodesReg': [1],
            'extn': [1],
            'year': [2011]
        };

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: true, detailLevel: this.VIZDETAIL_COUNTRY});

        this.setState({
            busy: true,
            jobs: jobs
        });
    }

    renderVisualization(data, unit, is_modelling_result, key) {
        // deselect currently in_main_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_main_view == true;
        });
        const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
        current_selected_job.in_main_view = false;

        // select newly in_main_view job
        const index = this.state.jobs.findIndex((job) => {
            return job.key === key;
        });
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_main_view = true;

        // update jobs array
        const jobs = Object.assign([], this.state.jobs);
        jobs[current_selected_index] = current_selected_job;
        jobs[index] = job;

        this.setState({
            jobs: jobs
        });

        switch (job.query.vizType) {
            case this.VIZ_TREEMAP:
                var tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                render(<Visualization type='tree' data={tree_data} unit={unit} year={job.query.year} is_modelling_result={is_modelling_result}/>, document.getElementById('visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} year={job.query.year} is_modelling_result={is_modelling_result}/>, document.getElementById('visualization'));
                break;
            default:
                break;
        }
    }

    renderComparisonVisualisation(data, unit, is_modelling_result, key) {
        // deselect currently in_main_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_comparison_view == true;
        });
        const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
        current_selected_job.in_comparison_view = false;

        // select newly in_main_view job
        const index = this.state.jobs.findIndex((job) => {
            return job.key === key;
        });
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_comparison_view = true;

        // update jobs array
        const jobs = Object.assign([], this.state.jobs);
        jobs[current_selected_index] = current_selected_job;
        jobs[index] = job;

        this.setState({
            jobs: jobs
        });

        switch (job.query.vizType) {
            case this.VIZ_TREEMAP:
                var tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                render(<Visualization type='tree' data={tree_data} unit={unit} year={job.query.year} is_modelling_result={is_modelling_result}/>, document.getElementById('comparison-visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} year={job.query.year} is_modelling_result={is_modelling_result}/>, document.getElementById('comparison-visualization'));
                break;
            default:
                break;
        }
    }

    deleteJob(in_main_view, in_comparison_view, key) {
        // var new_jobs = Object.assign([], this.state.jobs);
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

    render() {
        const selectedPerspectiveOption = this.state.selectedPerspectiveOption;
        const selectedVisualizationOption = this.state.selectedVisualizationOption;
        const selectedVisualizationDetailOption = this.state.selectedVisualizationDetailOption;

        return (
            <Grid fluid={true}>
                <Navbar>
                    <Navbar.Header>
                        <Navbar.Brand>
                            {/*<Image src="../static/logo.png"/>*/}
                            <a href="../">RaMa-Scene</a>
                        </Navbar.Brand>
                    </Navbar.Header>
                    <Nav>

                    </Nav>
                </Navbar>
                {this.state.jobs.length == this.MAX_JOB_COUNT && <Alert bsStyle={"warning"}>
                    You reached the maximum number of jobs on your job queue. You first have to delete a job from the queue before being able to do additional analyses.
                </Alert>}
                <Row>
                    <Col sm={3} md={3} lg={3}>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Selection menu
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <Row>
                                        <Col>
                                            <div>Perspective<CustomTooltip tooltip={perspective_helptext} id="perspective-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleProductionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_PRODUCTION}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Production</Button>
                                                <Button onClick={this.handleConsumptionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_CONSUMPTION}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Final Consumption</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Visualization<CustomTooltip tooltip={visualization_helptext} id="visualization-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleTreeMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_TREEMAP}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>TreeMap</Button>
                                                <Button onClick={this.handleGeoMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_GEOMAP}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>GeoMap</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    {(selectedVisualizationOption == this.VIZ_GEOMAP) &&
                                    <Row>
                                        <Col>
                                            <div>Visualization Detail<CustomTooltip tooltip={visualization_detail_helptext} id="visualization-detail-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleTotalClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_TOTAL}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Total</Button>
                                                <Button onClick={this.handleContinentClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_CONTINENT}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Continent</Button>
                                                <Button onClick={this.handleCountryClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Country</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    }
                                    <Row>
                                        <Col>
                                            <div>Year<CustomTooltip tooltip={year_helptext} id="year-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <YearFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                    onChange={this.handleYearChange.bind(this)}
                                                                                    value={this.state.selectedYearOption}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>{this.state.selectMultiRegion ? 'select multiple regions' : 'select a single region'}<CustomTooltip tooltip={region_helptext} id="region-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            {!this.state.selectMultiRegion &&
                                                <RegionFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                          onChange={this.handleRegionChange.bind(this)}
                                                                                          value={this.state.selectedRegionOptions}
                                                />
                                            }
                                            {this.state.selectMultiRegion &&
                                                <RegionFilterableMultiSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                         onChange={this.handleRegionChange.bind(this)}
                                                                                         value={this.state.selectedRegionOptions}
                                                                                         selectablelevel={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY ? 3 : selectedVisualizationDetailOption == this.VIZDETAIL_CONTINENT ? 2 : 1}
                                                />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        {/*<div>Products and Regions</div>*/}
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>{this.state.selectMultiProduct ? 'select multiple products' : 'select a single product'}<CustomTooltip tooltip={product_helptext} id="product-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            {this.state.selectMultiProduct &&
                                            <ProductFilterableMultiSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                      onChange={this.handleProductChange.bind(this)}
                                                                                      value={this.state.selectedProductOptions}
                                            />
                                            }
                                            {!this.state.selectMultiProduct &&
                                            <ProductFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                       onChange={this.handleProductChange.bind(this)}
                                                                                       value={this.state.selectedProductOptions}
                                            />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Indicator<CustomTooltip tooltip={indicator_helptext} id="indicator-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <IndicatorFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                        onChange={this.handleIndicatorChange.bind(this)}
                                                                                        value={this.state.selectedIndicatorOptions}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <Button bsStyle="success" onClick={this.handleAnalyse.bind(this)} disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT || this.state.selectedProductOptions === undefined || this.state.selectedProductOptions.length <= 0 || this.state.selectedRegionOptions === undefined || this.state.selectedRegionOptions.length <= 0 || this.state.selectedIndicatorOptions === undefined || this.state.selectedIndicatorOptions.length <= 0}><Glyphicon glyph={this.state.busy ? 'hourglass' : 'play'}/>&nbsp;Analyse</Button>
                                        </Col>
                                    </Row>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Scenario Modelling
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    {/*<ModellingContext.Provider value={{*/}
                                        {/*saveSettingsCallback: this.saveModellingSettings.bind(this),*/}
                                        {/*clearSettingsCallback: this.clearModellingSettings.bind(this)*/}
                                    {/*}}>*/}
                                        <ScenarioModel busy={this.state.busy}/>
                                    {/*</ModellingContext.Provider>*/}
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Report
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    Not yet implemented
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                    </Col>
                    <Col sm={6} md={6} lg={6}>
                        <Panel>
                            <Panel.Heading>
                                <Panel.Title>Main View</Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <div id="visualization"></div>
                                <sub className="pull-right">EXIOBASE v3.3. data</sub>
                            </Panel.Body>
                        </Panel>
                        <Panel>
                            <Panel.Heading>
                                <Panel.Title>Comparison View</Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <div id="comparison-visualization"></div>
                                <sub className="pull-right">EXIOBASE v3.3. data</sub>
                            </Panel.Body>
                        </Panel>
                    </Col>
                    <Col sm={3} md={3} lg={3}>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Analysis queue
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    {this.state.model_details.length > 0 && <Alert bsStyle={"info"}>Click on the M symbol if you are ready to model</Alert>}
                                    <Table striped condensed hover>
                                        <tbody>
                                        {
                                            this.state.jobs.map(function(job) {
                                                // we cannot pass key to props, but we must use another property name e.g. id
                                                return (<AnalysisJob key={job.key}
                                                                     busy={this.state.busy}
                                                                     id={job.key}
                                                                     query={job.query}
                                                                     in_main_view={job.in_main_view}
                                                                     in_comparison_view={job.in_comparison_view}
                                                                     auto_render={job.auto_render}
                                                                     detailLevel={job.detailLevel}
                                                                     finishHandler={this.handleJobFinished.bind(this)}
                                                                     resultHandler={this.renderVisualization.bind(this)}
                                                                     comparisonHandler={this.renderComparisonVisualisation.bind(this)}
                                                                     deleteHandler={this.deleteJob.bind(this)}
                                                                     startModellingHandler={this.handleModelling.bind(this)} />)

                                            }.bind(this))
                                        }
                                        </tbody>
                                    </Table>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Resources
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <h5>Didactics</h5>
                                    <ul>
                                        <li>Manual</li>
                                        <li>Excercises</li>
                                        <li>Slides</li>
                                        <li>Join the class</li>
                                        <li>Additional courses</li>
                                    </ul>
                                    <h5>Raw Materials Information System</h5>
                                    <ul>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Policy & Legislation</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Terminology & Library</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Critical Raw Materials (CRM)</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Raw Materials Monitoring & Indicators</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Secondary Raw Materials & Circular Economy</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Industry & Innovation</a></li>
                                        <li><a href="http://rmis.jrc.ec.europa.eu/">Raw Materials Knowledge Gateway</a></li>
                                    </ul>
                                    <h5>Other resources</h5>
                                    <ul>
                                        <li><a href="https://www.exiobase.eu/">EXIOBASE</a></li>
                                        <li><a href="https://cml.liacs.nl/exiovisuals/">EXIOVISUALS</a></li>
                                        <li><a href="https://atlas.media.mit.edu/en/visualize/tree_map/hs92/export/nga/all/show/2016/">Observatory of Economic Complexity</a></li>
                                        <li><a href="https://ielab.info/">Industrial Ecology Virtual Laboratory</a></li>
                                        <li><a href="http://tool.globalcalculator.org">The Global Calculator</a></li>
                                        <li><a href="https://ejatlas.org/">Environmental Justice Atlas</a></li>
                                        <li><a href="https://trase.earth/?lang=en">TRASE</a></li>
                                        <li><a href="http://www.ecolizer.be/">Ecolizer</a></li>
                                        <li><a href="https://www.environmentalfootprints.org/infographics#">Environmental Footprint Explorer</a></li>
                                        <li><a href="https://resourcetrade.earth/">Resource Trade</a></li>
                                        <li><a href="https://resourcewatch.org/data/explore">Resource Watch</a></li>
                                        <li><a href="http://data.footprintnetwork.org/">Data Footprint Network</a></li>
                                    </ul>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Partners
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <Image src="../static/partners.png" responsive />
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                    </Col>
                </Row>
            </Grid>
        );
    }

    getChildContext() {
        return {
            model_details: this.state.model_details,
            saveSettingsCallback: this.saveModellingSettings.bind(this),
            clearSettingsCallback: this.clearModellingSettings.bind(this)
        };
    }

    saveModellingSettings(model_details) {
        this.setState({model_details: model_details});
    }

    clearModellingSettings() {
        this.setState({model_details: []});
    }
}

App.childContextTypes = {
    model_details: PropTypes.array,
    saveSettingsCallback: PropTypes.func,
    clearSettingsCallback: PropTypes.func
};

render(<App />, document.getElementById('container'));
