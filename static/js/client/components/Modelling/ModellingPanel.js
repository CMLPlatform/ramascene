// @flow
import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { CustomTooltip } from '../utils';
import ScenarioModel from '../../ScenarioModel';

// Import help text
const {modelling_menu_helptext} = require('../../helptexts');

function ModellingPanel({ busy, onScenarioRef }) {
    return (
        <Row>
            <Col>
                <Card>
                    <Card.Header>
                        <Card.Title>Counterfactual settings <CustomTooltip tooltip={modelling_menu_helptext} id="modelling-menu-tooltip"><i className="fas fa-question-circle"></i></CustomTooltip></Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <ScenarioModel ref={onScenarioRef} busy={busy} />
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}

export default ModellingPanel;