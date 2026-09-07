// @flow
import React from 'react';
import { Alert, Navbar, Nav, Image } from 'react-bootstrap';
import { MAX_JOB_COUNT } from '../constants';

function LayoutHeader({ jobCount }) {
    return (
        <>
            <Navbar expand="lg" className="mb-3">
                <Navbar.Brand href="../">
                    <Image src="../static/rama-logo-big.svg" />
                </Navbar.Brand>
                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <Nav>
                        <Nav.Link href="../">Home</Nav.Link>
                        <Nav.Link href="../#about">About</Nav.Link>
                        <Nav.Link href="../#methods">Methods</Nav.Link>
                        <Nav.Link href="../#deliverables">Resources</Nav.Link>
                        <Nav.Link href="../#contact">Contact</Nav.Link>
                        <Nav.Link href="https://www.jotform3.leidenuniv.nl/CMLformJweb/rama-scene-feedback" target="_blank">Feedback</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
            {jobCount >= MAX_JOB_COUNT && (
                <Alert variant="warning">
                    You reached the maximum number of jobs on your job queue. You first have to delete a job from the queue before being able to do additional analyses.
                </Alert>
            )}
        </>
    );
}

export default LayoutHeader;