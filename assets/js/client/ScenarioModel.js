//@flow
import React, {Component} from 'react';
import {Button, Col, FormControl, Glyphicon, OverlayTrigger, Popover, Row, Well} from 'react-bootstrap';
import ProductFilterableSingleSelectDropdownTree from './productFilterableSingleSelectDropdownTree';
import ConsumerFilterableSingleSelectDropdownTree from './consumerFilterableSingleSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from './regionFilterableSingleSelectDropdownTree';
import PropTypes from 'prop-types';

var shortid = require('shortid');
var {changes_helptext, coefficient_helptext, consumer_helptext, destination_helptext, origin_helptext, product_model_helptext} = require('./helptexts');

function CustomTooltip({id, children, tooltip}) {
    return (
        <OverlayTrigger trigger="click" rootClose
                        overlay={<Popover id={id} placement="right"><div dangerouslySetInnerHTML={{__html: tooltip}}></div></Popover>}
                        delayShow={300}
                        delayHide={150}
        >{children}
        </OverlayTrigger>
    );
};

class ScenarioModel extends Component {

    constructor(props) {
        super(props);

        this.MAX_CHANGES = 5;

        this.state = {busy: props.busy, model_details: [], coefficient: 0};

        this.productCompRef = null;
        this.setProductRef = component => {
            this.productCompRef = component;
        };
        this.consumerCompRef = null;
        this.setConsumerRef = component => {
            this.consumerCompRef = component;
        };
        this.originCompRef = null;
        this.setOriginRef = component => {
            this.originCompRef = component;
        };
        this.destCompRef = null;
        this.setDestRef = component => {
            this.destCompRef = component;
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({busy: nextProps.busy});
    }

    render() {
        return (
            <React.Fragment>
                <Row>
                    <Col>
                        <div>Product <CustomTooltip tooltip={product_model_helptext} id="product-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        <ProductFilterableSingleSelectDropdownTree onChange={this.handleProductChange.bind(this)}
                                                                   value={this.state.selectedProductOption}
                                                                   ref={this.setProductRef}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div>Product's origin <CustomTooltip tooltip={origin_helptext} id="origin-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        {/*TODO how should the country list look like ?*/}
                        <RegionFilterableSingleSelectDropdownTree onChange={this.handleOriginChange.bind(this)}
                                                                  value={this.state.selectedOriginOption}
                                                                  ref={this.setOriginRef}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div>Consumption activity <CustomTooltip tooltip={consumer_helptext} id="consumer-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        <ConsumerFilterableSingleSelectDropdownTree onChange={this.handleConsumerChange.bind(this)}
                                                                    value={this.state.selectedConsumerOption}
                                                                    ref={this.setConsumerRef}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div>Consumption location <CustomTooltip tooltip={destination_helptext} id="destination-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        {/*TODO how should the country list look like ?*/}
                        <RegionFilterableSingleSelectDropdownTree onChange={this.handleDestinationChange.bind(this)}
                                                                  value={this.state.selectedDestinationOption}
                                                                  ref={this.setDestRef}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div>Relative change to coefficients <CustomTooltip tooltip={coefficient_helptext} id="coefficient-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        <div className="input-group">
                            <FormControl type="number" placeholder="0" value={this.state.coefficient} onChange={this.handleCoefficientChange.bind(this)}/>
                            <span className="input-group-addon">%</span>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col lg={6}>
                        <Button onClick={this.handleAddClick.bind(this)} bsStyle="success" disabled={this.state.selectedProductOption === undefined || this.state.selectedConsumerOption === undefined || this.state.selectedOriginOption === undefined || this.state.selectedDestinationOption === undefined || this.state.coefficient === undefined}>Add change</Button>
                    </Col>
                    <Col lg={6}>
                        <Button onClick={this.handleRemoveClick.bind(this)} bsStyle="success" disabled={this.state.model_details.length == 0}>Remove last</Button>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div>Added changes <CustomTooltip tooltip={changes_helptext} id="changes-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                        <Well>{
                            this.state.model_details.map(function(model, index) {
                                return (<div key={shortid.generate()}>
                                    {index + 1})&nbsp;
                                    {this.productCompRef.getLabel(model.product)}&raquo;
                                    {this.consumerCompRef.getLabel(model.consumedBy)}&raquo;
                                    {this.originCompRef.getLabel(model.originReg)}&raquo;
                                    {this.destCompRef.getLabel(model.consumedReg)}&raquo;
                                    {model.techChange}%
                                </div>)
                            }.bind(this))
                        }</Well>
                    </Col>
                </Row>
                <Row>
                    {/*<ModellingContext.Consumer>*/}
                        {/*{({saveSettingsCallback, clearSettingsCallback}) => (*/}
                            {/*<React.Fragment>*/}
                            <Col lg={6}>
                                <Button onClick={this.handleSaveClick.bind(this, this.context.saveSettingsCallback)} bsStyle="success" disabled={this.state.model_details.length == 0}>Save settings</Button>
                            </Col>
                            <Col lg={6}>
                                <Button onClick={this.handleClearClick.bind(this, this.context.clearSettingsCallback)} bsStyle="success">Clear settings</Button>
                            </Col>
                            {/*</React.Fragment>*/}
                        {/*)}*/}
                    {/*</ModellingContext.Consumer>*/}
                </Row>
            </React.Fragment>
        );
    }

    handleProductChange(value) {
        this.setState({
            selectedProductOption: value
        });
    }

    handleConsumerChange(value) {
        this.setState({
            selectedConsumerOption: value
        });
    }

    handleOriginChange(value) {
        this.setState({
            selectedOriginOption: value
        });
    }

    handleDestinationChange(value) {
        this.setState({
            selectedDestinationOption: value
        });
    }

    handleCoefficientChange(e) {
        this.setState({
            coefficient: parseInt(e.target.value)
        });
    }

    handleAddClick() {
        // make sure for single select dropdown trees the value is presented as an array
        var product = null;
        var consumer = null;
        var origin = null;
        var destination = null;
        if (!Array.isArray(this.state.selectedProductOption)) {
            product = [parseInt(this.state.selectedProductOption)];
        } else {
            product = this.state.selectedProductOption.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedOriginOption)) {
            origin = [parseInt(this.state.selectedOriginOption)];
        } else {
            origin = this.state.selectedOriginOption.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedDestinationOption)) {
            destination = [parseInt(this.state.selectedDestinationOption)];
        } else {
            destination = this.state.selectedDestinationOption.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedConsumerOption)) {
            consumer = [parseInt(this.state.selectedConsumerOption)];
        } else {
            consumer = this.state.selectedConsumerOption.map(x => parseInt(x));
        }

        const model_detail = {
            'product': product,
            'originReg': origin,
            'consumedBy': consumer,
            'consumedReg': destination,
            'techChange': [this.state.coefficient]
        };

        const model_details = Object.assign([], this.state.model_details);
        model_details.push(model_detail);

        this.setState({model_details: model_details, busy: model_details.length == this.MAX_CHANGES});
    }

    handleRemoveClick() {
        const model_details = Object.assign([], this.state.model_details);
        model_details.pop();

        this.setState({model_details: model_details, busy: false});
    }

    handleSaveClick(callback) {
        callback(this.state.model_details);
    }

    handleClearClick(callback) {
        this.setState({model_details: []});
        callback();
    }

    getProductLabel(value) {
        return this.productCompRef.getLabel(value);
    }

    getConsumerLabel(value) {
        return this.consumerCompRef.getLabel(value);
    }

    getOrigLabel(value) {
        return this.originCompRef.getLabel(value);
    }

    getDestLabel(value) {
        return this.destCompRef.getLabel(value);
    }
}

ScenarioModel.contextTypes = {
    saveSettingsCallback: PropTypes.func,
    clearSettingsCallback: PropTypes.func
};

export default ScenarioModel;
