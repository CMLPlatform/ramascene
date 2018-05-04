// @flow
import React, {Component} from 'react';
import {Treemap, Geomap} from 'd3plus-react';

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

        switch (props.type) {
            case 'geo':
                this.state = {
                    type: props.type,
                    geoconfig: {
                      //workaround for scale (make white -> not visible),because set to 'value' renders wrong numberic scale values
                      colorScaleConfig: {
                        axisConfig: {
                          shapeConfig: {
                            labelConfig: {
                              fontColor: "white"
                            },
                          }
                        },
                        //scale_colors are changed in colorScaleConfig
                        color: ["#000000"
                            ,"#080000"
                            ,"#100000"
                            ,"#180000"
                            ,"#300000"
                            ,"#200000"
                            ,"#280000"
                            ,"#380000"
                            ,"#400000"
                            ,"#480000"
                            ,"#500000"
                            ,"#580000"
                            ,"#600000"
                            ,"#780000"
                            ,"#680000"
                            ,"#700000"
                            ,"#800000"
                            ,"#870000"
                            ,"#970000"
                            ,"#8f0000"
                            ,"#9f0000"
                            ,"#b70000"
                            ,"#a70000"
                            ,"#af0000"
                            ,"#bf0000"
                            ,"#c70000"
                            ,"#cf0000"
                            ,"#d70000"
                            ,"#df0000"
                            ,"#e70000"
                            ,"#ef0000"
                            ,"#ff0000"],
                        },
                        data: props.data,
                        //removing downloadbutton func. because it does not render well with geomap
                        ///downloadButton: {type: "jpeg"},
                        // topojson: 'countries_97_topo.json',
                        topojson: topoJson,
                        //add to tooltip the actual value
                        tooltipConfig: {
                                body: function(d){
                                  const test = props.data
                                  const arrayLength = test.length;
                                  for (var i = 0; i < arrayLength; i++) {
                                    if (test[i].id == d.id){
                                        return test[i].value
                                    }
                                  }
                                }
                              },
                              colorScale: 'value',
                        // TODO how can we get filter to work when dynamically changing topojson and data ?
                        // fitFilter: function(d) {
                        //      return props.data.find(function(p) {
                        //          return p.id === d.id;
                        //      });
                        // }.bind(props)
                        // topojsonFilter: function(d) {
                        //     return props.data.find(function(p) {
                        //         return p.id === d.id;
                        //     });
                        // }.bind(props)
                    }
                };
                break;
            case 'tree':
                this.state = {
                    type: props.type,
                    treeconfig: {
                        tooltipConfig: {
                              body: function(d){
                                return d.value
                              }
                            },
                        data: props.data,
                        //downloadButton: {type: "png"},
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

        switch (nextProps.type) {
            case 'geo':
                this.setState({
                    type: nextProps.type,
                    geoconfig: {
                      colorScaleConfig: {
                        axisConfig: {
                          shapeConfig: {
                            labelConfig: {
                              fontColor: "white"
                            },

                          }
                        },
                        color: ["#000000"
                            ,"#080000"
                            ,"#100000"
                            ,"#180000"
                            ,"#300000"
                            ,"#200000"
                            ,"#280000"
                            ,"#380000"
                            ,"#400000"
                            ,"#480000"
                            ,"#500000"
                            ,"#580000"
                            ,"#600000"
                            ,"#780000"
                            ,"#680000"
                            ,"#700000"
                            ,"#800000"
                            ,"#870000"
                            ,"#970000"
                            ,"#8f0000"
                            ,"#9f0000"
                            ,"#b70000"
                            ,"#a70000"
                            ,"#af0000"
                            ,"#bf0000"
                            ,"#c70000"
                            ,"#cf0000"
                            ,"#d70000"
                            ,"#df0000"
                            ,"#e70000"
                            ,"#ef0000"
                            ,"#ff0000"],
                        },
                        data: nextProps.data,
                        //downloadButton: {type: "png"},
                        // topojson: 'countries_97_topo.json',
                        topojson: topoJson,
                        tooltipConfig: {
                                body: function(d){
                                  const test = nextProps.data
                                  const arrayLength = test.length;
                                  for (var i = 0; i < arrayLength; i++) {
                                      if (test[i].id == d.id){
                                          return test[i].value
                                      }
                                  }
                                }
                              },
                      colorScale: 'value',
                        // fitFilter: function(d) {
                        //     return nextProps.data.find(function(p) {
                        //         return p.id === d.id;
                        //     });
                        // }.bind(nextProps)
                        // topojsonFilter: function(d) {
                        //     return nextProps.data.find(function(p) {
                        //         return p.id === d.id;
                        //     });
                        // }.bind(nextProps)
                    }
                });
                break;
            case 'tree':
                this.setState({
                    type: nextProps.type,
                    treeconfig: {
                        tooltipConfig: {
                              body: function(d){
                                return d.value
                              }
                        },
                        data: nextProps.data,
                        //downloadButton: {type: "png"},
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
                return (<Geomap config={this.state.geoconfig} />);
                break;
            case 'tree':
                return (<Treemap config={this.state.treeconfig} />);
                break;
            default:
                return (<div>Unknown visualization type</div>);
                break;
        }
    }
}

export default Visualization;
