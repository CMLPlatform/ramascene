// @flow
import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import AnalysisJob from '../../analysisJob';

function VisualizationView({
    jobs,
    busy,
    onJobFinished,
    onRenderResult,
    onRenderComparison,
    onDeleteJob,
    onStartModelling,
    onHideView,
    viewTitle,
    containerId
}) {
    return (
        <Col lg={6}>
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <Card.Title>{viewTitle} <Button className="close ms-auto" onClick={onHideView} title="Clear visualization"><span>&times;</span></Button></Card.Title>
                </Card.Header>

                <Card.Body>
                    <Row>
                        <Col>
                            <div>
                                {jobs.map((job) => (
                                    <AnalysisJob 
                                        key={job.key}
                                        job={job}
                                        busy={busy}
                                        in_main_view={job.in_main_view}
                                        in_comparison_view={job.in_comparison_view}
                                        finishHandler={onJobFinished}
                                        resultHandler={onRenderResult}
                                        comparisonHandler={onRenderComparison}
                                        deleteHandler={onDeleteJob}
                                        startModellingHandler={onStartModelling} 
                                    />
                                ))}
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div id={containerId} className="visualization-container"></div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Col>
    );
}

export default VisualizationView;