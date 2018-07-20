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
import AnalysisJob from './analysisJob';

var shortid = require('shortid');
var {perspective_helptext,visualization_helptext,visualization_detail_helptext,region_helptext,product_helptext,indicator_helptext} = require('./helptexts');

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
            selectedProductOptions: [],
            selectedRegionOptions: [],
            selectedIndicatorOptions: [],
            selectMultiProduct: true,
            selectMultiRegion: false,
            busy: false,
            jobs: []
        };
    }

    handleProductionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_PRODUCTION,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleConsumptionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_CONSUMPTION,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleTreeMapClicked() {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.VIZ_TREEMAP,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: (Array.isArray(this.state.selectedRegionOptions) ? this.state.selectedRegionOptions.slice(0,1) : this.state.selectedRegionOptions),
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: true,
            selectMultiRegion: false,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleGeoMapClicked() {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.VIZ_GEOMAP,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: (Array.isArray(this.state.selectedProductOptions) ? this.state.selectedProductOptions.slice(0,1) : this.state.selectedProductOptions),
            selectedRegionOptions: [],
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: false,
            selectMultiRegion: true,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleTotalClicked() {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.VIZDETAIL_TOTAL,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: [],
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleContinentClicked() {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.VIZDETAIL_CONTINENT,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: [],
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleCountryClicked() {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.VIZDETAIL_COUNTRY,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: [],
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleProductChange(value) {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: value,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleRegionChange(value) {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: value,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleIndicatorChange(value) {
        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: value,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: this.state.jobs
        });
    }

    handleAnalyse() {
        // make sure for single select dropdown trees that value is presented as an array
        var nodesSec = null;
        var nodesReg = null;
        var extn = null;
        if (!Array.isArray(this.state.selectedProductOptions)) {
            nodesSec = [this.state.selectedProductOptions];
        } else {
            nodesSec = this.state.selectedProductOptions;
        }
        if (!Array.isArray(this.state.selectedRegionOptions)) {
            nodesReg = [this.state.selectedRegionOptions];
        } else {
            // nodesReg = this.state.selectedRegionOptions.map(x => x.global_id);
            nodesReg = this.state.selectedRegionOptions
        }
        if (!Array.isArray(this.state.selectedIndicatorOptions)) {
            extn = [this.state.selectedIndicatorOptions];
        } else {
            extn = this.state.selectedIndicatorOptions;
        }

        const query = {
            'dimType': this.state.selectedPerspectiveOption,
            'vizType': this.state.selectedVisualizationOption,
            'nodesSec': nodesSec,
            'nodesReg': nodesReg,
            'extn': extn
        };

        // this.state.jobs.push(React.createElement(AnalysisJob, {query: query, resultHandler: this.renderVisualization.bind(this), deleteHandler: this.deleteJob.bind(this)}));

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, selected: false, auto_render: false, detailLevel: this.state.selectedVisualizationDetailOption});

        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: (jobs.length == this.MAX_JOB_COUNT),
            jobs: jobs
        });
    }

    componentWillMount() {
        const query = {
            'dimType': this.PERSPECTIVE_PRODUCTION,
            'vizType': this.VIZ_TREEMAP,
            'nodesSec': [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
            'nodesReg': [1],
            'extn': [1]
        };

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, selected: false, auto_render: true, detailLevel: this.VIZDETAIL_COUNTRY});

        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: (jobs.length == this.MAX_JOB_COUNT),
            jobs: jobs
        });
    }

    renderVisualization(data, unit, key) {
        // deselect currently selected job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.selected == true;
        });
        const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
        current_selected_job.selected = false;

        // select newly selected job
        const index = this.state.jobs.findIndex((job) => {
            return job.key === key;
        });
        const job = Object.assign({}, this.state.jobs[index]);
        job.selected = true;

        // update jobs array
        const jobs = Object.assign([], this.state.jobs);
        jobs[current_selected_index] = current_selected_job;
        jobs[index] = job;

        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedVisualizationDetailOption: this.state.selectedVisualizationDetailOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: this.state.busy,
            jobs: jobs
        });

        switch (job.query.vizType) {
            case this.VIZ_TREEMAP:
                var tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                render(<Visualization type='tree' data={tree_data} unit={unit}/>, document.getElementById('visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit}/>, document.getElementById('visualization'));
                break;
            default:
                break;
        }
    }

    deleteJob(selected, key) {
        // var new_jobs = Object.assign([], this.state.jobs);
        const jobs = this.state.jobs.filter(j => j.key != key);

        this.setState({
            selectedPerspectiveOption: this.state.selectedPerspectiveOption,
            selectedVisualizationOption: this.state.selectedVisualizationOption,
            selectedProductOptions: this.state.selectedProductOptions,
            selectedRegionOptions: this.state.selectedRegionOptions,
            selectedIndicatorOptions: this.state.selectedIndicatorOptions,
            selectMultiProduct: this.state.selectMultiProduct,
            selectMultiRegion: this.state.selectMultiRegion,
            busy: (jobs.length == this.MAX_JOB_COUNT),
            jobs: jobs
        });

        if (selected) {
            unmountComponentAtNode(document.getElementById('visualization'));
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
                                                        disabled={this.state.busy}>Production</Button>
                                                <Button onClick={this.handleConsumptionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_CONSUMPTION}
                                                        disabled={this.state.busy}>Final Consumption</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Visualization<CustomTooltip tooltip={visualization_helptext} id="visualization-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleTreeMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_TREEMAP}
                                                        disabled={this.state.busy}>TreeMap</Button>
                                                <Button onClick={this.handleGeoMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_GEOMAP}
                                                        disabled={this.state.busy}>GeoMap</Button>
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
                                                        disabled={this.state.busy}>Total</Button>
                                                <Button onClick={this.handleContinentClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_CONTINENT}
                                                        disabled={this.state.busy}>Continent</Button>
                                                <Button onClick={this.handleCountryClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY}
                                                        disabled={this.state.busy}>Country</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    }
                                    <Row>
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>{this.state.selectMultiRegion ? 'select multiple regions' : 'select a single region'}<CustomTooltip tooltip={region_helptext} id="region-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            {!this.state.selectMultiRegion &&
                                                <RegionFilterableSingleSelectDropdownTree disabled={this.state.busy}
                                                                                          onChange={this.handleRegionChange.bind(this)}
                                                                                          value={this.state.selectedRegionOptions}
                                                />
                                            }
                                            {this.state.selectMultiRegion &&
                                                <RegionFilterableMultiSelectDropdownTree disabled={this.state.busy}
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
                                            <ProductFilterableMultiSelectDropdownTree disabled={this.state.busy}
                                                                                      onChange={this.handleProductChange.bind(this)}
                                                                                      value={this.state.selectedProductOptions}
                                            />
                                            }
                                            {!this.state.selectMultiProduct &&
                                            <ProductFilterableSingleSelectDropdownTree disabled={this.state.busy}
                                                                                       onChange={this.handleProductChange.bind(this)}
                                                                                       value={this.state.selectedProductOptions}
                                            />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Indicator<CustomTooltip tooltip={indicator_helptext} id="indicator-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <IndicatorFilterableSingleSelectDropdownTree disabled={this.state.busy}
                                                                                        onChange={this.handleIndicatorChange.bind(this)}
                                                                                        value={this.state.selectedIndicatorOptions}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <Button bsStyle="success" onClick={this.handleAnalyse.bind(this)} disabled={this.state.busy || this.state.selectedProductOptions === undefined || this.state.selectedProductOptions.length <= 0 || this.state.selectedRegionOptions === undefined || this.state.selectedRegionOptions.length <= 0 || this.state.selectedIndicatorOptions === undefined || this.state.selectedIndicatorOptions.length <= 0}><Glyphicon glyph={this.state.busy ? 'hourglass' : 'play'}/>&nbsp;Analyse</Button>
                                        </Col>
                                    </Row>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Scenario Modelling
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    Not yet implemented
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
                                <Panel.Title>View</Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <div id="visualization"></div>
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
                                    <Table striped condensed hover>
                                        <tbody>
                                        {
                                            this.state.jobs.map(function(job) {
                                                // we cannot pass key to props, but we must use another property name e.g. id
                                                return (<AnalysisJob key={job.key} id={job.key} query={job.query} selected={job.selected} auto_render={job.auto_render} detailLevel={job.detailLevel} resultHandler={this.renderVisualization.bind(this)} deleteHandler={this.deleteJob.bind(this)} />)
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
                                    Not yet implemented
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
}

render(<App />, document.getElementById('container'));
