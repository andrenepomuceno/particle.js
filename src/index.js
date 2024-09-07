import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import DraggableDialog from './ui/DraggableDialog';

const App = () => {
    return (
        <div>
            <h1>Hello, World!</h1>
            {(
                <DraggableDialog title="Non-Modal Dialog">
                    <p>This is a draggable, non-modal dialog.</p>
                </DraggableDialog>
            )}
            {(
                <DraggableDialog title="Non-Modal Dialog 2">
                    <p>This is a draggable, non-modal dialog.</p>
                </DraggableDialog>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);