import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';

import 'react-resizable/css/styles.css';
import './Dialog.css';

const Dialog = forwardRef((
    {
        title, canClose = 'true',
        size = { width: 200, height: 200 },
        position = { x: 10, y: 10 },
        children
    }, ref) => {
    const [isOpen, setIsOpen] = useState(true);
    const [width, setWidth] = useState(size.width);
    const [height, setHeight] = useState(size.height);

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
            defaultPosition={{ x: position.x, y: position.y }}
            style={{ position: 'fixed' }}
        >
            <ResizableBox
                width={width}
                height={height}
                minConstraints={[64, 64]}
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
                        {((canClose == 'true') && <button onClick={handleCloseDialog} className="close-button">
                            &times;
                        </button>)}
                    </div>
                    <div className="dialog-content">{children}</div>
                </div >
            </ResizableBox>
        </Draggable >
    );
});

export default Dialog;