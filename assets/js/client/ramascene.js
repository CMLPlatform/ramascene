// @flow
import React, {Component} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import { Button, ButtonGroup, Col, Glyphicon, Grid, Panel, Row, Table } from 'react-bootstrap';
import 'react-select/scss/default.scss';
import './stylesheets/ramascene.scss';
import registerServiceWorker from './registerServiceWorker';
import Visualization from './visualization';
import ProductFilterableMultiSelectDropdownTree from './productFilterableMultiSelectDropdownTree';
import ProductFilterableSingleSelectDropdownTree from './productFilterableSingleSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from './regionFilterableSingleSelectDropdownTree';
import RegionFilterableMultiSelectDropdownTree from './regionFilterableMultiSelectDropdownTree';
import IndicatorFilterableSingleSelectDropdownTree from './indicatorFilterableSingleSelectDropdownTree';
import AnalysisJob from './analysisJob';
import TreeSelect from "rc-tree-select";

var shortid = require('shortid');

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
            selectedRegionOptions: this.state.selectedRegionOptions,
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
        jobs.push({key: shortid.generate(), query: query, selected: false, detailLevel: this.state.selectedVisualizationDetailOption});

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
    }

    renderVisualization(data, key) {
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
                render(<Visualization type='tree' data={tree_data}/>, document.getElementById('visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    Object.keys(data).forEach(function(key) {
                        const value = data[key];
                        geo_data.push({id: key, value: value});
                    });
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data}/>, document.getElementById('visualization'));
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
            busy: this.state.busy,
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
                                            <div>Perspective</div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleProductionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_PRODUCTION}
                                                        disabled={this.state.busy}>Production</Button>
                                                <Button onClick={this.handleConsumptionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_CONSUMPTION}
                                                        disabled={this.state.busy}>Consumption</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Visualization</div>
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
                                    <Row>
                                        {/*<div>Products and Regions</div>*/}
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>Products</div>
                                            {this.state.selectMultiProduct &&
                                                <ProductFilterableMultiSelectDropdownTree disabled={this.state.busy}
                                                                                          onChange={this.handleProductChange.bind(this)}
                                                                                          value={this.state.selectedProductOptions}
                                                                                          strategy={TreeSelect.SHOW_PARENT}
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
                                    {(selectedVisualizationOption == this.VIZ_GEOMAP) &&
                                    <Row>
                                        <Col>
                                            <div>Visualization Detail</div>
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
                                            <div>Regions</div>
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
                                                                                         strategy={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY ? TreeSelect.SHOW_CHILD: TreeSelect.SHOW_PARENT}
                                                />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Indicator</div>
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
                        <Panel defaultExpanded>
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
                        <Panel defaultExpanded>
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
                                <div id="visualization" className="visualization-panel"></div>
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
                                                return (<AnalysisJob key={job.key} id={job.key} query={job.query} selected={job.selected} detailLevel={job.detailLevel} resultHandler={this.renderVisualization.bind(this)} deleteHandler={this.deleteJob.bind(this)} />)
                                            }.bind(this))
                                        }
                                        </tbody>
                                    </Table>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
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
                    </Col>
                </Row>
            </Grid>
        );
    }
}

render(<App />, document.getElementById('container'));
registerServiceWorker();