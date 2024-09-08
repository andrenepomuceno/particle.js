import React, { useRef } from 'react';
import Dialog from '../components/Dialog';

const MenuView = ({ informationRef, children }) => {
    function handleInformationClick() {
        informationRef.current.open();
    }

    return (
        <div>
            <Dialog
                title='Main Menu'
                canClose='false'
                size={{ width: 640, height: 120 }}
                position={{ x: 10, y: 80 }}
            >
                <button onClick={handleInformationClick}>Information</button>
                <button>Controls</button>
                <button>Particle</button>
                <button>Selection</button>
                <button>Generator</button>
                <button>Field</button>
                <button>Advanced</button>
                <button>Parameters</button>
            </Dialog>
        </div>
    );
};

export default MenuView;