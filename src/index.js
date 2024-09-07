import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';

import DraggableDialog from './ui/DraggableDialog';

const App = () => {
    const dialogRef = useRef();

    return (
        <div>
            {(
                <DraggableDialog ref={dialogRef} title="Non-Modal Dialog">
                    <p>This is a draggable, non-modal dialog.</p>
                </DraggableDialog>
            )}
            <div id="info">
                <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" rel="noopener">particle.js </a>
                loading...
            </div>
            <div id='renderer-container' />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

import { start } from './main';
setTimeout(() => {
    requestAnimationFrame(start);
});