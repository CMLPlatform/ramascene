// @flow
import React from 'react';
import { Modal } from 'react-bootstrap';

function WaitingModal({ show, onHide }) {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                {/*<Modal.Title></Modal.Title>*/}
            </Modal.Header>
            <Modal.Body>
                <p>This may take a while - expected min. wait time 2 seconds for analytical calculations, max. wait time 10 minutes or longer at heavy traffic and doing modelling</p>
            </Modal.Body>
        </Modal>
    );
}

export default WaitingModal;