// @flow
import React from 'react';
import { Row, Col, Button, Spinner } from 'react-bootstrap';
import { MAX_JOB_COUNT } from '../constants';

function ActionPanel({ 
    busy, 
    jobCount, 
    onAnalyseClick, 
    onDeleteAllClick 
}) {
    return (
        <Row>
            <Col lg={6}>
                <Button 
                    onClick={onAnalyseClick} 
                    variant="success" 
                    disabled={busy || jobCount >= MAX_JOB_COUNT}>
                    {busy ? (<Spinner animation="border" size="sm" />) : 'Analyse'}
                </Button>
            </Col>
            <Col lg={6}>
                <Button 
                    onClick={onDeleteAllClick} 
                    variant="danger" 
                    disabled={busy || jobCount === 0}>
                    Clear All
                </Button>
            </Col>
        </Row>
    );
}

export default ActionPanel;