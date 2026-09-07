// @flow
import React from 'react';
import { Row, Col, Image } from 'react-bootstrap';

function FooterPanel() {
    return (
        <Row>
            <Col className="text-center">
                <div>
                    <Image src="../static/partners.png" fluid />
                    <Image src="../static/EIT_EU_logos/RM-Academy-Logo-White_300px_plus_EU_flag_vertical.png" fluid />
                </div>
            </Col>
        </Row>
    );
}

export default FooterPanel;