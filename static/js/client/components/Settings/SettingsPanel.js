// @flow
import React from 'react';
import { Card, ButtonGroup, Button, Row, Col } from 'react-bootstrap';
import { CustomTooltip } from '../utils';
import {
    PERSPECTIVE_PRODUCTION, PERSPECTIVE_CONSUMPTION,
    VIZ_TREEMAP, VIZ_GEOMAP,
    VIZDETAIL_TOTAL, VIZDETAIL_CONTINENT, VIZDETAIL_COUNTRY,
    MAX_JOB_COUNT
} from '../constants';

// Import help texts
const {
    selection_menu_helptext, 
    perspective_helptext
} = require('../../helptexts');

function SettingsPanel({
    selectedPerspectiveOption, 
    selectedVisualizationOption, 
    selectedVisualizationDetailOption,
    busy, 
    jobCount,
    onProductionClick, 
    onConsumptionClick,
    onTreeMapClick, 
    onGeoMapClick,
    onTotalClick, 
    onContinentClick, 
    onCountryClick
}) {
    return (
        <Col sm={2} md={2} lg={2}>
            <Card>
                <Card.Header>
                    <Card.Title>Baseline settings <CustomTooltip tooltip={selection_menu_helptext} id="selection-menu-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></Card.Title>
                </Card.Header>

                <Card.Body>
                    <Row>
                        <Col>
                            <div>Analysis <CustomTooltip tooltip={perspective_helptext} id="perspective-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <ButtonGroup>
                                <Button 
                                    onClick={onProductionClick}
                                    active={selectedPerspectiveOption === PERSPECTIVE_PRODUCTION}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Hotspot
                                </Button>
                                <Button 
                                    onClick={onConsumptionClick}
                                    active={selectedPerspectiveOption === PERSPECTIVE_CONSUMPTION}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Contribution
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div>Visualisation</div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <ButtonGroup>
                                <Button 
                                    onClick={onTreeMapClick}
                                    active={selectedVisualizationOption === VIZ_TREEMAP}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Sectoral
                                </Button>
                                <Button 
                                    onClick={onGeoMapClick}
                                    active={selectedVisualizationOption === VIZ_GEOMAP}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Geographic
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div>Detail</div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <ButtonGroup>
                                <Button 
                                    onClick={onTotalClick}
                                    active={selectedVisualizationDetailOption === VIZDETAIL_TOTAL}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Total
                                </Button>
                                <Button 
                                    onClick={onContinentClick}
                                    active={selectedVisualizationDetailOption === VIZDETAIL_CONTINENT}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Continent
                                </Button>
                                <Button 
                                    onClick={onCountryClick}
                                    active={selectedVisualizationDetailOption === VIZDETAIL_COUNTRY}
                                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                                    Country
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Col>
    );
}

export default SettingsPanel;