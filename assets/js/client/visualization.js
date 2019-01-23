// @flow
import React, {Component} from 'react';
import {Treemap, Geomap} from 'd3plus-react';
import {format} from 'd3-format';
import {Button, Label, Table} from 'react-bootstrap';

class Visualization extends Component {

    constructor(props) {
        super(props);

        this.DETAIL_TOTAL = 'total';
        this.DETAIL_CONTINENT = 'continent';
        this.DETAIL_COUNTRY = 'country';

        this.TOPOJSON_TOTAL = '../static/total_lvl.json';
        this.TOPOJSON_CONTINENT = '../static/continent_lvl.json';
        this.TOPOJSON_COUNTRY = '../static/country_lvl.json';

        var topoJson = null;
        switch (props.detailLevel) {
            case this.DETAIL_TOTAL:
                topoJson = this.TOPOJSON_TOTAL;
                break;
            case this.DETAIL_CONTINENT:
                topoJson = this.TOPOJSON_CONTINENT;
                break;
            case this.DETAIL_COUNTRY:
                topoJson = this.TOPOJSON_COUNTRY;
                break;
        }

        var sum = 0;
        props.data.forEach(d => {
            sum += d.value;
        });

        const key = Object.keys(props.unit)[0];
        var unit = key + ' ' + props.unit[key];

        switch (props.type) {
            case 'geo':
                this.state = {
                    type: props.type,
                    sum: sum,
                    unit: unit,
                    query: props.query,
                    model_details: props.model_details,
                    is_modelling_result: props.is_modelling_result,
                    callback: props.hide_callback,
                    geoconfig: {
                        colorScaleConfig: {
                            color: ["#a8acac", "#E0DD30", "#B4D26E"  , "#5FBDE5"]
                        },
                        data: props.data,
                        downloadButton: {type: "png"},
                        topojson: topoJson,
                        //set ocean to transparent
                        ocean: 'transparent',
                        //do not use tiles
                        tiles:0,
                        //add to tooltip the actual value
                        tooltipConfig: {
                            body: function(d) {
                                var found_item = props.data.find(function(p) {
                                    return p.id === d.id;
                                });
                                return format('e')(found_item.value);
                            },
                            footer: function(d) {
                                return unit;
                            }
                        },
                        colorScale: 'value'
                    }
                };
                break;
            case 'tree':
                this.state = {
                    type: props.type,
                    sum: sum,
                    unit: unit,
                    query: props.query,
                    model_details: props.model_details,
                    is_modelling_result: props.is_modelling_result,
                    callback: props.hide_callback,
                    treeconfig: {
                        tooltipConfig: {
                            body: function(d) {
                                return format('e')(d.value);
                            },
                            footer: function(d) {
                                return unit;
                            }
                        },
                        data: props.data,
                        downloadButton: {type: "png"},
                        groupBy: 'id',
                        size: d => d.value
                    }
                };
                break;
            default:
                this.state = {
                    type: 'unknown'
                };
                break;
        }

    }

    componentWillReceiveProps(nextProps) {
        var topoJson = null;
        switch (nextProps.detailLevel) {
            case this.DETAIL_TOTAL:
                topoJson = this.TOPOJSON_TOTAL;
                break;
            case this.DETAIL_CONTINENT:
                topoJson = this.TOPOJSON_CONTINENT;
                break;
            case this.DETAIL_COUNTRY:
                topoJson = this.TOPOJSON_COUNTRY;
                break;
        }

        var sum = 0;
        nextProps.data.forEach(d => {
            sum += d.value;
        });

        const key = Object.keys(nextProps.unit)[0];
        var unit = key + ' ' + nextProps.unit[key];

        switch (nextProps.type) {
            case 'geo':
                this.setState({
                    type: nextProps.type,
                    sum: sum,
                    unit: unit,
                    query: nextProps.query,
                    model_details: nextProps.model_details,
                    is_modelling_result: nextProps.is_modelling_result,
                    callback: nextProps.hide_callback,
                    geoconfig: {
                        colorScaleConfig: {
                            color: ["#a8acac", "#E0DD30", "#B4D26E"  , "#5FBDE5"]
                        },
                        data: nextProps.data,
                        downloadButton: {type: "png"},
                        //set ocean to transparent
                        ocean: 'transparent',
                        //do not use tiles
                        tiles:0,
                        topojson: topoJson,
                        tooltipConfig: {
                            body: function(d) {
                                var found_item = nextProps.data.find(function(p) {
                                    return p.id === d.id;
                                });
                                return format('e')(found_item.value);
                            },
                            footer: function(d) {
                                return unit;
                            }
                        },
                        colorScale: 'value'
                    }
                });
                break;
            case 'tree':
                this.setState({
                    type: nextProps.type,
                    sum: sum,
                    unit: unit,
                    query: nextProps.query,
                    model_details: nextProps.model_details,
                    is_modelling_result: nextProps.is_modelling_result,
                    callback: nextProps.hide_callback,
                    treeconfig: {
                        tooltipConfig: {
                            body: function(d) {
                                return format('e')(d.value);
                            },
                            footer: function(d) {
                                return unit;
                            }
                        },
                        data: nextProps.data,
                        downloadButton: {type: "png"},
                        groupBy: 'id',
                        size: d => d.value
                    }
                });
                break;
            default:
                this.setState({type: 'unknown'});
                break;
        }
    }

    render() {
        switch (this.state.type) {
            case 'geo':
                var visualization = <Geomap config={this.state.geoconfig} />;
                break;
            case 'tree':
                var visualization = <Treemap config={this.state.treeconfig} />;
                break;
            default:
                return (<div>Unknown visualization type</div>);
                break;
        }
        return (<div>
            <div className="visualization-panel">{visualization}</div>
            <Label bsStyle={this.state.is_modelling_result ? 'info' : 'success'}>{this.state.is_modelling_result ? 'Scenario Modelling Result' : 'Analysis Result'}</Label>
            <Label>{'Sum = ' + format('e')(this.state.sum) + ' (' + this.state.unit + ')'}</Label>
            <div className="table-responsive">
                <Table bordered condensed>
                    <thead>
                    <tr>
                        <th colSpan='5'>Query Parameters</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>Perspective</td>
                        <td colSpan='4'>{this.state.query.dimType}</td>
                    </tr>
                    <tr>
                        <td>{this.state.is_modelling_result ? 'Scenario ' : 'Year'}</td>
                        <td colSpan='4'>{this.state.query.year}</td>
                    </tr>
                    <tr>
                        <td>Region(s)</td>
                        <td colSpan='4'>{this.state.query.nodesReg.join('; ')}</td>
                    </tr>
                    <tr>
                        <td>Product(s)</td>
                        <td colSpan='4'>{this.state.query.nodesSec.join('; ')}</td>
                    </tr>
                    <tr>
                        <td>Indicator</td>
                        <td colSpan='4'>{this.state.query.extn}</td>
                    </tr>
                    {this.state.is_modelling_result &&
                    <React.Fragment>
                        <tr className="active">
                            <th colSpan='5'>Scenario Modelling Parameters</th>
                        </tr>
                        <tr>
                            <th className="col-xs-3">Product</th>
                            <th className="col-xs-3">Consumed by</th>
                            <th className="col-xs-2">Originating From</th>
                            <th className="col-xs-2">Consumed Where</th>
                            <th className="col-xs-2">Technical Change Coefficient</th>
                        </tr>
                        { this.state.model_details.map(function(model_detail, index) {
                            return (
                                <tr className="active" key={'model_detail-' + index}>
                                    <td>{model_detail.product}</td>
                                    <td>{model_detail.consumedBy}</td>
                                    <td>{model_detail.originReg}</td>
                                    <td>{model_detail.consumedReg}</td>
                                    <td>{model_detail.techChange}</td>
                                </tr>
                            )
                        })}
                    </React.Fragment>
                    }
                    </tbody>
                </Table>
            </div>
            <Button onClick={this.state.callback}>Close</Button>
            <sub className="pull-right">EXIOBASE v3.3.sm data</sub>
        </div>);
    }
}

export default Visualization;
