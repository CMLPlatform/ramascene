// @flow
import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { CustomTooltip } from '../utils';
import { MAX_JOB_COUNT } from '../constants';

// Import dropdown components
import ProductFilterableMultiSelectDropdownTree from '../../productFilterableMultiSelectDropdownTree';
import ProductFilterableSingleSelectDropdownTree from '../../productFilterableSingleSelectDropdownTree';
import RegionFilterableMultiSelectDropdownTree from '../../regionFilterableMultiSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from '../../regionFilterableSingleSelectDropdownTree';
import IndicatorFilterableSingleSelectDropdownTree from '../../indicatorFilterableSingleSelectDropdownTree';
import YearFilterableSingleSelectDropdownTree from '../../yearFilterableSingleSelectDropdownTree';

// Import help texts
const {
    product_helptext,
    indicator_helptext
} = require('../../helptexts');

class FilterPanel extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = {
            productRef: null,
            regionRef: null,
            indicatorRef: null,
            yearRef: null
        };
    }

    setProductRef = (component) => {
        this.setState({productRef: component});
        if (this.props.onProductRef) {
            this.props.onProductRef(component);
        }
    };

    setRegionRef = (component) => {
        this.setState({regionRef: component});
        if (this.props.onRegionRef) {
            this.props.onRegionRef(component);
        }
    };

    setIndicatorRef = (component) => {
        this.setState({indicatorRef: component});
    };

    setYearRef = (component) => {
        this.setState({yearRef: component});
    };

    render() {
        const {
            selectedProductOptions,
            selectedRegionOptions,
            selectedIndicatorOptions,
            selectedYearOption,
            busy,
            jobCount,
            selectMultiProduct,
            selectMultiRegion,
            onProductChange,
            onRegionChange,
            onIndicatorChange,
            onYearChange
        } = this.props;

        return (
            <Col sm={10} md={10} lg={10}>
                <Row>
                    <Col>
                        <Row>
                            <Col sm={3} md={3} lg={3}>
                                <div>Product <CustomTooltip tooltip={product_helptext} id="product-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                <div>Indicators <CustomTooltip tooltip={indicator_helptext} id="indicator-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                <div>Region <CustomTooltip tooltip={product_helptext} id="region-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                <div>Consumer <CustomTooltip tooltip={product_helptext} id="consumer-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Row>
                            <Col sm={3} md={3} lg={3}>
                                {selectMultiProduct ? (
                                    <ProductFilterableMultiSelectDropdownTree 
                                        onChange={onProductChange}
                                        value={selectedProductOptions}
                                        ref={this.setProductRef}
                                        disabled={busy || jobCount >= MAX_JOB_COUNT} />
                                ) : (
                                    <ProductFilterableSingleSelectDropdownTree 
                                        onChange={onProductChange}
                                        value={selectedProductOptions}
                                        ref={this.setProductRef}
                                        disabled={busy || jobCount >= MAX_JOB_COUNT} />
                                )}
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                <IndicatorFilterableSingleSelectDropdownTree 
                                    onChange={onIndicatorChange}
                                    value={selectedIndicatorOptions}
                                    ref={this.setIndicatorRef}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT} />
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                {selectMultiRegion ? (
                                    <RegionFilterableMultiSelectDropdownTree 
                                        onChange={onRegionChange}
                                        value={selectedRegionOptions}
                                        ref={this.setRegionRef}
                                        disabled={busy || jobCount >= MAX_JOB_COUNT} />
                                ) : (
                                    <RegionFilterableSingleSelectDropdownTree 
                                        onChange={onRegionChange}
                                        value={selectedRegionOptions}
                                        ref={this.setRegionRef}
                                        disabled={busy || jobCount >= MAX_JOB_COUNT} />
                                )}
                            </Col>
                            <Col sm={3} md={3} lg={3}>
                                <YearFilterableSingleSelectDropdownTree 
                                    onChange={onYearChange}
                                    value={selectedYearOption}
                                    ref={this.setYearRef}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT} />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Col>
        );
    }
}

export default FilterPanel;