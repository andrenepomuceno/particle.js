import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import DraggableDialog from './components/DraggableDialog';
import NumberInput from './components/NumberInput';

const App = () => {
    const dialogRef = useRef();

    return (
        <div>
            <DraggableDialog ref={dialogRef} title="INFORMATION">
                <NumberInput name="Scenario Name"></NumberInput>
                <p>Scenario Name</p>
                <p>Scenario Folder</p>
                <p>Particles</p>
                <p>Max Particles</p>
                <p>Elapsed Time</p>
                <p>Camera</p>
            </DraggableDialog>
            <div id="info">
                <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" rel="noopener">particle.js </a>
                loading...
            </div>
            <div id='renderer-container'></div>
        </div>
    );
};

export const uiStart = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
}