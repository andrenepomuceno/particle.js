import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';

import 'react-resizable/css/styles.css';
import './DraggableDialog.css';

const DraggableDialog = forwardRef(({ title, children }, ref) => {
    const [isOpen, setIsOpen] = useState(true);
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(300);

    const handleCloseDialog = (e) => {
        setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
    }));

    if (!isOpen) return null;

    return (
        <Draggable
            handle=".dialog-header"
            defaultPosition={{ x: 20, y: 200 }}
            style={{ position: 'fixed' }}
        >
            <ResizableBox
                width={width}
                height={height}
                minConstraints={[160, 120]}
                maxConstraints={[800, 600]}
                onResize={(event, { size }) => {
                    console.log(size);
                    setWidth(size.width);
                    setHeight(size.height);
                }}
            >
                <div className="draggable-dialog" style={{ width, height }}>
                    <div className="dialog-header">
                        <span>{title}</span>
                        <button onClick={handleCloseDialog} className="close-button">
                            &times;
                        </button>
                    </div>
                    <div className="dialog-content">{children}</div>
                </div>
            </ResizableBox>
        </Draggable>
    );
});

export default DraggableDialog;