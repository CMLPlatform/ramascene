// @flow
import React, {Component} from 'react';
import { Glyphicon } from 'react-bootstrap';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'
import {csrftoken} from './csrfToken';
import $ from 'jquery';
import {CSVLink} from "react-csv";

class AnalysisJob extends Component {

    constructor(props) {
        super(props);

        this.STATUS_STARTED = 'started';
        this.STATUS_COMPLETED = 'completed';

        this.state = {key: props.id, query: props.query, selected: props.selected, auto_render: props.auto_render, detailLevel: props.detailLevel, resultHandler: props.resultHandler, deleteHandler: props.deleteHandler, job_status: null, job_id: null, job_name: null, job_label: ""};
    }

    componentWillReceiveProps(nextProps) {
        this.setState({key: this.state.key, query: this.state.query, selected: nextProps.selected, auto_render: this.state.auto_render, detailLevel: this.state.detailLevel, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: this.state.job_status, job_id: this.state.job_id, job_name: this.state.job_name, job_label: this.state.job_label, raw_data: this.state.raw_data, csv_data: this.state.csv_data});
    }

    componentDidMount() {
        const ws = new WebSocket(WEBSOCKET_URL);

        ws.onopen = function() {
            ws.send(JSON.stringify({'querySelection': this.state.query, 'action': 'start_calc'}));
        }.bind(this);

        ws.onmessage = this.handleWebSocketResponse.bind(this);
    }

    handleWebSocketResponse(message) {
        const job = JSON.parse(message.data);
        if(job.job_status == this.STATUS_STARTED) {
            console.log('received: %s', JSON.stringify(job));

            // construct job label
            var label_parts = [job.job_name.dimType.substr(0, 4), job.job_name.vizType.substr(0, job.job_name.vizType.length - 3), job.job_name.nodesSec.toString().substr(0, 10), job.job_name.nodesReg.toString().substr(0, 10), job.job_name.extn.toString().substr(0, 10)];

            this.setState({key: this.state.key, query: this.state.query, selected: this.state.selected, auto_render: this.state.auto_render, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: job.job_status, job_id: job.job_id, job_name: job.job_name, job_label: label_parts.join('>')});
        } else if(job.job_status == this.STATUS_COMPLETED) {
            console.log('received: %s', JSON.stringify(job));
            this.setState({key: this.state.key, query: this.state.query, selected: this.state.selected, auto_render: this.state.auto_render, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: job.job_status, job_id: job.job_id, job_name: job.job_name, job_label: this.state.job_label});

            $.ajax({
                cache: false,
                complete: function (jqXHR, textStatus) {

                },
                data: {'TaskID': this.state.job_id},
                dataType: 'json',
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                },
                headers: {
                    'X-CSRFToken': csrftoken
                },
                method: 'POST',
                success: function (data, textStatus, jqXHR) {
                    if (this.state.auto_render == true) {
                        this.setState({
                            key: this.state.key,
                            query: this.state.query,
                            selected: true,
                            auto_render: this.state.auto_render,
                            resultHandler: this.state.resultHandler,
                            deleteHandler: this.state.deleteHandler,
                            job_status: this.state.job_status,
                            job_id: this.state.job_id,
                            job_name: this.state.job_name,
                            job_label: this.state.job_label,
                            raw_data: data,
                            csv_data: this.generateCSVdata(data)
                        });
                        this.retrieveRawResult();
                    } else {
                        this.setState({
                            key: this.state.key,
                            query: this.state.query,
                            selected: this.state.selected,
                            auto_render: this.state.auto_render,
                            resultHandler: this.state.resultHandler,
                            deleteHandler: this.state.deleteHandler,
                            job_status: this.state.job_status,
                            job_id: this.state.job_id,
                            job_name: this.state.job_name,
                            job_label: this.state.job_label,
                            raw_data: data,
                            csv_data: this.generateCSVdata(data)
                        });
                    }
                }.bind(this),
                url: AJAX_URL
            });
        }
    }

    retrieveRawResult() {
        const result = JSON.parse(this.state.raw_data.rawResultData)['rawResultData'];
        const unit = JSON.parse(this.state.raw_data.rawResultData)['unit'];
        this.state.resultHandler(result, unit, this.state.key);
    }

    destroy() {

        confirmAlert({
            title: 'Confirm delete',
            message: 'Are you sure to delete this job ?',
            buttons: [
                {
                    label: 'Yes',
                    onClick: () => this.state.deleteHandler(this.state.selected, this.state.key)
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
        const unit = raw_result_data['unit'];
        var result = [];
        if (vizType == 'TreeMap') {
            nodesSec.forEach(function(key) {
                result.push({vizType: vizType, dimType: dimType, extn: extn[0], nodesReg: nodesReg[0], nodesSec: key, value: raw_result_data['rawResultData'][key], unit: unit[extn[0]]});
            });
        } else {
            nodesReg.forEach(function(key) {
                result.push({vizType: vizType, dimType: dimType, extn: extn[0], nodesReg: key, nodesSec: nodesSec[0], value: raw_result_data['rawResultData'][key], unit: unit[extn[0]]});
            });
        }
        return result;
    }

    canVisualize() {
        return this.state.job_status == this.STATUS_COMPLETED && this.state.raw_data !== undefined
    }

    canDownload() {
        return this.state.job_status == this.STATUS_COMPLETED && this.state.csv_data !== undefined
    }

    canDestroy() {
        return this.state.job_status == this.STATUS_COMPLETED
    }

    render() {
        const headers = [
            {label: 'visualization', key: 'vizType'},
            {label: 'dimension', key: 'dimType'},
            {label: 'indicator', key: 'extn'},
            {label: 'region', key: 'nodesReg'},
            {label: 'product', key: 'nodesSec'},
            {label: 'value', key: 'value'},
            {label: 'unit', key: 'unit'},
        ];
        return (
            <tr className={this.state.job_status == this.STATUS_STARTED ? 'primary' : (this.state.job_status == this.STATUS_COMPLETED ? 'success' : 'default')} key={this.state.key}>
                <td onClick={this.canVisualize() ? this.retrieveRawResult.bind(this) : function() {}} style={this.canVisualize() ? {cursor: 'pointer'} : {cursor: 'default'}}>
                    {this.state.selected && <Glyphicon glyph="chevron-left"/>} {this.state.job_label}
                </td>
                <td>{this.canVisualize() && <Glyphicon glyph="eye-open" style={{cursor: 'pointer'}} onClick={this.retrieveRawResult.bind(this)} title={"View"}/>}
                    {this.canDownload() && <CSVLink headers={headers} data={this.state.csv_data} separator={";"} filename={"rama-scene.csv"} className="" style={{color: 'inherit'}}><Glyphicon glyph="download" style={{cursor: 'pointer'}} title={"Download RAW result data"}/></CSVLink>}
                    {this.canDestroy() && <Glyphicon glyph="trash" style={{cursor: 'pointer'}} onClick={this.destroy.bind(this)} title={"Delete"}/>}</td>
            </tr>
        );
    }
}

export default AnalysisJob;