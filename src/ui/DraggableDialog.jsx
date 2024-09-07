import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Draggable from 'react-draggable';
import './DraggableDialog.css';

const DraggableDialog = forwardRef(({ title, children }, ref) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleCloseDialog = (e) => {
        setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
    }));

    if (!isOpen) return null;

    return (
        <Draggable handle=".dialog-header">
            <div className="draggable-dialog">
                <div className="dialog-header">
                    <span>{title}</span>
                    <button onClick={handleCloseDialog} className="close-button">
                        &times;
                    </button>
                </div>
                <div className="dialog-content">{children}</div>
            </div>
        </Draggable>
    );
});

export default DraggableDialog;