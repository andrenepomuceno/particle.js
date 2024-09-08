import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Box, Button } from '@mui/material';

import 'react-resizable/css/styles.css';
import './Dialog.css';

const Dialog = forwardRef(({
        title = 'Dialog',
        canClose = true,
        size = { width: 200, height: 200 },
        position = { x: 10, y: 10 },
        open = true,
        children,
    }, ref) => {
    const [isOpen, setIsOpen] = useState(open);
    const [dialogSize, setSize] = useState(size);
    const [dialogPos, setPosition] = useState(position);

    const onClickClose = (e) => {
        setIsOpen(false);
    };

    const onDragStop = (e, { x, y }) => {
        setPosition({ x, y });
    };

    const onResize = (e, { size }) => {
        setSize(size);
    }

    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
    }));

    if (!isOpen) return null;

    return (
        <Draggable
            handle=".dialog-header"
            position={dialogPos}
            onStop={onDragStop}
        >
            <ResizableBox
                width={dialogSize.width}
                height={dialogSize.height}
                minConstraints={[100, 100]}
                // maxConstraints={[800, 800]}
                onResize={onResize}
            >
                <Box>
                    <div className='dialog-body'>
                        <div className="dialog-header">
                            <span>{title}</span>
                            {canClose && (<Button onClick={onClickClose}>Close</Button>)}
                        </div>
                        <div className='dialog-content'>
                            {children}
                        </div>
                    </div>
                </Box>
            </ResizableBox>
        </Draggable >
    );
});

export default Dialog;