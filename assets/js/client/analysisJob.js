// @flow
import React, {Component} from 'react';
import { Glyphicon } from 'react-bootstrap';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'
// import {csrftoken} from './csrfToken';
import $ from 'jquery';

class AnalysisJob extends Component {

    constructor(props) {
        super(props);

        this.STATUS_STARTED = 'started';
        this.STATUS_COMPLETED = 'completed';

        this.state = {key: props.id, query: props.query, selected: props.selected, detailLevel: props.detailLevel, resultHandler: props.resultHandler, deleteHandler: props.deleteHandler, job_status: null, job_id: null, job_name: null, job_label: ""};
    }

    componentWillReceiveProps(nextProps) {
        this.setState({key: this.state.key, query: this.state.query, selected: nextProps.selected, detailLevel: this.state.detailLevel, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: this.state.job_status, job_id: this.state.job_id, job_name: this.state.job_name, job_label: this.state.job_label, raw_data: this.state.raw_data});
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

            this.setState({key: this.state.key, query: this.state.query, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: job.job_status, job_id: job.job_id, job_name: job.job_name, job_label: label_parts.join('>')});
        } else if(job.job_status == this.STATUS_COMPLETED) {
            console.log('received: %s', JSON.stringify(job));
            this.setState({key: this.state.key, query: this.state.query, resultHandler: this.state.resultHandler, deleteHandler: this.state.deleteHandler, job_status: job.job_status, job_id: job.job_id, job_name: job.job_name, job_label: this.state.job_label});
        }
    }

    retrieveRawResult() {
        if (this.state.raw_data === undefined) {

            // I can't get this to work
            // fetch(AJAX_URL, {
            //     body: JSON.stringify({TaskID: + job.job_id}),
            //     cache: 'no-cache',
            //     method: 'POST',
            //     mode: 'cors',
            // })
            // .then(response => {
            //     if(response.ok)
            //         return response.json();
            //     throw new Error('Network response was not ok.');
            // })
            // .then(function(response) {
            //     console.log('received: %s', JSON.stringify(response));
            // this.state.dataCallback(response);
            // }.bind(this), function(error) {
            //     console.log(error);
            // }).finally(function() {
            //     this.setState({busy: false, startCallback: this.state.startCallback, completedCallback: this.state.completedCallback, dataCallback: this.state.dataCallback});
            //     this.state.completedCallback();
            // }.bind(this));

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
                    // 'X-CSRFToken': csrftoken
                },
                method: 'POST',
                success: function (data, textStatus, jqXHR) {
                    this.setState({
                        key: this.state.key,
                        query: this.state.query,
                        resultHandler: this.state.resultHandler,
                        deleteHandler: this.state.deleteHandler,
                        job_status: this.state.job_status,
                        job_id: this.state.job_id,
                        job_name: this.state.job_name,
                        job_label: this.state.job_label,
                        raw_data: data
                    });
                    const result = JSON.parse(data.rawResultData)['rawResultData'];
                    const unit = JSON.parse(data.rawResultData)['unit'];
                    console.log('received: %s - unit : %s', JSON.stringify(result), JSON.stringify(unit));
                    this.state.resultHandler(result, unit, this.state.key);
                }.bind(this),
                url: AJAX_URL
            });
        } else {
            const result = JSON.parse(this.state.raw_data.rawResultData)['rawResultData'];
            const unit = JSON.parse(this.state.raw_data.rawResultData)['rawResultData'];
            this.state.resultHandler(result, unit, this.state.key);
        }
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

    render() {
        return (
            <tr className={this.state.job_status == this.STATUS_STARTED ? 'primary' : (this.state.job_status == this.STATUS_COMPLETED ? 'success' : 'default')} key={this.state.key}>
                <td onClick={this.state.job_status == this.STATUS_COMPLETED ? this.retrieveRawResult.bind(this) : function() {}} style={this.state.job_status == this.STATUS_COMPLETED ? {cursor: 'pointer'} : {cursor: 'default'}}>
                    {this.state.selected && <Glyphicon glyph="chevron-left"/>} {this.state.job_label}
                </td>
                <td>{this.state.job_status == this.STATUS_COMPLETED && <Glyphicon glyph="eye-open" style={{cursor: 'pointer'}} onClick={this.retrieveRawResult.bind(this)}/>}
                    {this.state.job_status == this.STATUS_COMPLETED && <Glyphicon glyph="trash" style={{cursor: 'pointer'}} onClick={this.destroy.bind(this)}/>}</td>
            </tr>
        );
    }
}

export default AnalysisJob;