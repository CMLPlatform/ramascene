// @flow
import React, {Component} from 'react';
import {Treemap, Geomap} from 'd3plus-react';
import {format} from 'd3-format';
import {Badge} from 'react-bootstrap';

class Visualization extends Component {

    constructor(props) {
        super(props);

        this.DETAIL_TOTAL = 'total';
        this.DETAIL_CONTINENT = 'continent';
        this.DETAIL_COUNTRY = 'country';

        this.TOPOJSON_TOTAL = '../static/working_total.json';
        this.TOPOJSON_CONTINENT = '../static/working_continent.json';
        this.TOPOJSON_COUNTRY = '../static/working_low_lvl.json';

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
                    geoconfig: {
                        colorScaleConfig: {
                            color: ["#384172" , "#f0f6f6" , "#D29C31", "#B22401"]
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
                                return format('~s')(found_item.value);
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
                    treeconfig: {
                        tooltipConfig: {
                            body: function(d) {
                                return format('~s')(d.value);
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
                    geoconfig: {
                        colorScaleConfig: {
                            color: ["#384172" , "#f0f6f6" , "#D29C31", "#B22401"]
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
                                return format('~s')(found_item.value);
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
                    treeconfig: {
                        tooltipConfig: {
                            body: function(d) {
                                return format('~s')(d.value);
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
                return (<div><div className="visualization-panel"><Geomap config={this.state.geoconfig} /></div><Badge>{'Sum = ' + format('~s')(this.state.sum) + ' (' + this.state.unit + ')'}</Badge></div>);
                break;
            case 'tree':
                return (<div><div className="visualization-panel"><Treemap config={this.state.treeconfig} /></div><Badge>{'Sum = ' + format('~s')(this.state.sum) + ' (' + this.state.unit + ')'}</Badge></div>);
                break;
            default:
                return (<div>Unknown visualization type</div>);
                break;
        }
    }
}

export default Visualization;
