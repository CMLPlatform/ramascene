// @flow
import React, {Component} from 'react';
import { Badge, Button, Glyphicon} from 'react-bootstrap';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'
import {csrftoken} from './csrfToken';
import $ from 'jquery';
import {CSVLink} from "react-csv";
import PropTypes from 'prop-types';
import ReactGA from 'react-ga';

let ws = null;

class AnalysisJob extends Component {

    constructor(props) {
        super(props);

        this.STATUS_STARTED = 'started';
        this.STATUS_COMPLETED = 'completed';
        this.STATUS_FAILED = 'Failed';

        this.ANALYSIS_JOB = 'analysis';
        this.MODELLING_JOB = 'modelling';

        this.state = {
            busy: props.busy,
            key: props.id,
            query: props.query,
            in_main_view: props.in_main_view,
            in_comparison_view: props.in_comparison_view,
            auto_render: props.auto_render,
            detailLevel: props.detailLevel,
            finishHandler: props.finishHandler,
            resultHandler: props.resultHandler,
            comparisonHandler: props.comparisonHandler,
            deleteHandler: props.deleteHandler,
            startModellingHandler: props.startModellingHandler,
            job_status: null,
            job_id: null,
            job_name: null,
            job_label: "",
            job_type: this.ANALYSIS_JOB
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({busy: nextProps.busy, in_main_view: nextProps.in_main_view, in_comparison_view: nextProps.in_comparison_view});
    }

    componentDidMount() {
        ws = new WebSocket(WEBSOCKET_URL);

        ws.onopen = function() {
            if (this.state.query.dimType == 'Hotspot' || this.state.query.dimType == 'Contribution') {
                ws.send(JSON.stringify({'querySelection': this.state.query, 'action': 'default'}));
            } else {
                ws.send(JSON.stringify({'querySelection': this.state.query, 'action': 'start_calc'}));
            }
            if (window.performance) {
                this.setState({performance_start: performance.now()});
            }
        }.bind(this);

        ws.onmessage = this.handleWebSocketResponse.bind(this);
    }

    handleWebSocketResponse(message) {
        const job = JSON.parse(message.data);
        if(job.job_status == this.STATUS_STARTED) {
            console.log('received: %s', JSON.stringify(job));

            // construct job label
            var label_parts = [job.job_name.dimType.substr(0, 4), job.job_name.vizType.substr(0, 4), job.job_name.nodesReg.toString().substr(0, 5), job.job_name.nodesSec.toString().substr(0, 5), job.job_name.year.toString(), job.job_name.extn.toString().substr(0, 5)];
            var simplified_id = job.job_id.toString().slice(-2);

            this.setState({
                job_status: job.job_status,
                job_id: job.job_id,
                job_name: job.job_name, // job_name is an object
                job_label: label_parts.join('/'),
                job_simplified_ID: simplified_id
            });
        } else if(job.job_status == this.STATUS_COMPLETED) {
            console.log('received: %s', JSON.stringify(job));
            ws.close();
            this.setState({
                job_status: job.job_status,
                // job_id: job.job_id, // job_id doesn't change
                // job_name: job.job_name // job_name is an invalid JSON string
            });

            $.ajax({
                cache: false,
                complete: function (jqXHR, textStatus) {
                    if (window.performance) {
                        ReactGA.timing({
                            category: this.state.job_type,
                            variable: 'Calculation timing',
                            value: Math.round(performance.now() - this.state.performance_start)
                        });
                    }
                }.bind(this),
                data: {'TaskID': this.state.job_id},
                dataType: 'json',
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                    ReactGA.exception({
                        description: 'AJAX request to retrieve results failed',
                        fatal: false
                    });
                },
                headers: {
                    'X-CSRFToken': csrftoken
                },
                method: 'POST',
                success: function (data, textStatus, jqXHR) {
                    if (this.state.auto_render == true || this.state.in_main_view) {
                        this.setState({
                            in_main_view: true,
                            raw_data: data,
                            csv_data: this.generateCSVdata(data)
                        });
                        this.retrieveRawResult(false);
                    } else if (this.state.in_comparison_view) {
                        this.setState({
                            in_comparison_view: true,
                            raw_data: data,
                            csv_data: this.generateCSVdata(data)
                        });
                        this.retrieveRawResult(true);
                    } else {
                        this.setState({
                            raw_data: data,
                            csv_data: this.generateCSVdata(data)
                        });
                    }
                }.bind(this),
                url: AJAX_URL
            });

            this.state.finishHandler();
        } else if(job.job_status == this.STATUS_FAILED) {
            console.log('received: %s', JSON.stringify(job));
            ReactGA.exception({
                description: 'Websocket message received with job_status = Failed',
                fatal: false
            });
            ws.close();
            this.setState({
                job_status: job.job_status,
                job_id: job.job_id,
                job_name: job.job_name
            });
            this.state.finishHandler();
        }
    }

    retrieveRawResult(comparison) {
        const result = JSON.parse(this.state.raw_data.rawResultData)['rawResultData'];
        const unit = JSON.parse(this.state.raw_data.rawResultData)['unit'];
        if (comparison) {
            if (this.state.job_type == this.MODELLING_JOB)
                this.state.comparisonHandler(result, unit, true, this.state.model_details, this.state.job_name, this.state.key);
            else
                this.state.comparisonHandler(result, unit, false, null, this.state.job_name, this.state.key);
        } else {
            if (this.state.job_type == this.MODELLING_JOB)
                this.state.resultHandler(result, unit, true, this.state.model_details, this.state.job_name, this.state.key);
            else
                this.state.resultHandler(result, unit, false, null, this.state.job_name, this.state.key);
        }
    }

    destroy() {

        confirmAlert({
            title: 'Confirm delete',
            message: 'Are you sure you want to delete this job?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: () => this.state.deleteHandler(this.state.in_main_view, this.state.in_comparison_view, this.state.key)
                },
                {
                    label: 'No'
                }
            ]
        });
    }

    generateCSVdata(data) {
        const raw_result_data = JSON.parse(data.rawResultData);
        const job_name = raw_result_data['job_name'];
        const dimType = job_name['dimType'];
        const vizType = job_name['vizType'];
        const nodesSec = job_name['nodesSec'];
        const nodesReg = job_name['nodesReg'];
        const extn = job_name['extn'];
        const year = job_name['year'];
        const unit = raw_result_data['unit'];

        // if (this.state.job_type == this.MODELLING_JOB) {
        //     const products = job_name['product'];
        //     const originRegs = job_name['originReg'];
        //     const consumedRegs = job_name['comsumedReg'];
        //     const techChanges = job_name['techChange'];
        // }
        var new_model_details = [];
        if (this.state.job_type == this.MODELLING_JOB) {
            this.state.model_details.forEach(function (model_detail) {
                new_model_details.push({
                    'Product': this.context.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    'Consumed by': this.context.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    'Originating from': this.context.scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                    'Consumed where': this.context.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    'Technical Change Coefficient': model_detail.techChange[0]
                });
            }.bind(this));
        }

        var result = [];
        if (vizType == 'Sectoral') {
            nodesSec.forEach(function(key) {
                result.push({vizType: vizType, dimType: dimType, extn: extn[0], year: year, nodesReg: nodesReg[0], nodesSec: key, /*products: products, originRegs: originRegs, consumedRegs: consumedRegs, techChanges: techChanges*/ model_details: JSON.stringify(new_model_details), value: raw_result_data['rawResultData'][key], unit: unit[extn[0]]});
            });
        } else {
            nodesReg.forEach(function(key) {
                result.push({vizType: vizType, dimType: dimType, extn: extn[0], year: year, nodesReg: key, nodesSec: nodesSec[0], /*products: products, originRegs: originRegs, consumedRegs: consumedRegs, techChanges: techChanges*/ model_details: JSON.stringify(new_model_details), value: raw_result_data['rawResultData'][key], unit: unit[extn[0]]});
            });
        }
        return result;
    }

    startModelling() {
        ReactGA.event({
            category: 'User',
            action: 'started modelling job'
        });

        this.state.startModellingHandler();

        this.setState({job_type: this.MODELLING_JOB, model_details: this.context.model_details});

        ws = new WebSocket(WEBSOCKET_URL);

        ws.onopen = function() {
            ws.send(JSON.stringify({'querySelection': this.state.query, 'model_details': this.context.model_details, 'action': 'model'}));
            if (window.performance) {
                this.setState({performance_start: performance.now()});
            }
        }.bind(this);

        ws.onmessage = this.handleWebSocketResponse.bind(this)
    }

    canModel() {
        return this.context.model_details.length > 0 && ((this.state.job_status == this.STATUS_COMPLETED && this.state.job_type == this.ANALYSIS_JOB) || (this.state.job_status == this.STATUS_FAILED && this.state.job_type == this.MODELLING_JOB));
    }   

    canCompare() {
        return this.state.job_status == this.STATUS_COMPLETED && this.state.raw_data !== undefined && !this.state.in_comparison_view;
    }

    canVisualize() {
        return this.state.job_status == this.STATUS_COMPLETED && this.state.raw_data !== undefined && !this.state.in_main_view;
    }

    canDownload() {
        return this.state.job_status == this.STATUS_COMPLETED && this.state.csv_data !== undefined;
    }

    canDestroy() {
        return this.state.job_status == this.STATUS_COMPLETED || this.state.job_status == this.STATUS_FAILED;
    }

    render() {
        const headers = [
            {label: 'visualization', key: 'vizType'},
            {label: 'dimension', key: 'dimType'},
            {label: 'indicator', key: 'extn'},
            {label: 'year', key: 'year'},
            {label: 'region', key: 'nodesReg'},
            {label: 'product', key: 'nodesSec'},
            // {label: 'modelling products', key: 'products'},
            // {label: 'modelling originating region', key: 'originRegs'},
            // {label: 'modelling consumer region', key: 'consumedRegs'},
            // {label: 'modelling technical changes', key: 'techChanges'},
            {label: 'modelling details', key: 'model_details'},
            {label: 'value', key: 'value'},
            {label: 'unit', key: 'unit'},
        ];
        return (
            <tr className={this.state.job_status == this.STATUS_COMPLETED ? (this.state.job_type == this.ANALYSIS_JOB ? 'success' : (this.state.job_type == this.MODELLING_JOB ? 'info' : 'danger')) : 'default'} key={this.state.key}>

                <td style={this.canVisualize() ? {cursor: 'pointer'} : {cursor: 'default'}}>
                    <tr>
                        {this.state.job_status == this.STATUS_STARTED && <Glyphicon glyph='hourglass'/>}&nbsp;
                        {this.canModel() && <Button onClick={this.startModelling.bind(this)} title={"Model"} disabled={this.state.busy}>M</Button>}
                        {this.canVisualize() && <Button onClick={this.retrieveRawResult.bind(this, false)} title={"View"}><Glyphicon glyph="eye-open"/></Button>}
                        {this.canCompare() && <Button onClick={this.retrieveRawResult.bind(this, true)} title={"Compare"}>C</Button>}
                        {this.canDownload() && <CSVLink headers={headers} data={this.state.csv_data} separator={";"} filename={"rama-scene.csv"} className="btn btn-default" style={{color: 'inherit'}}><Glyphicon glyph="download" style={{cursor: 'pointer'}} title={"Download RAW result data"}/></CSVLink>}
                        {this.canDestroy() && <Button onClick={this.destroy.bind(this)} title={"Delete"}><Glyphicon glyph="trash"/></Button>}
                    </tr>
                    <tr>
                        {this.state.in_main_view && <Badge>Main view</Badge>}&nbsp;
                        {this.state.in_comparison_view && <Badge>Comparison view</Badge>}&nbsp;
                    </tr>
                    <tr>
                        <div>Analysis ID: {this.state.job_simplified_ID}</div> 
                        {this.state.job_label}
                    </tr>
                </td>
            </tr>
        );
    }
}

AnalysisJob.contextTypes = {
    model_details: PropTypes.array,
    scenarioCompRef: PropTypes.object
};

export default AnalysisJob;
