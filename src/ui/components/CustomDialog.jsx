import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Box, Button, Typography } from '@mui/material';

import 'react-resizable/css/styles.css';
import './CustomDialog.css';

const CustomDialog = ({
    title = 'Dialog',
    canClose = true,
    size = { width: 200, height: 200 },
    position = { x: 10, y: 10 },
    open = true,
    onClose,
    children,
}) => {
    const [isOpen, setIsOpen] = useState(open);
    const [dialogSize, setSize] = useState(size);
    const [dialogPos, setPosition] = useState(position);

    useEffect(() => {
        setIsOpen(open);
    }, [open]);

    const onClickClose = (e) => {
        setIsOpen(false);
        if (onClose) onClose(e);
    };

    const onDragStop = (e, { x, y }) => {
        setPosition({ x, y });
    };

    const onResize = (e, { size }) => {
        setSize(size);
    }

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
                // onResize={onResize}
                onResizeStop={onResize}
            >
                <Box className='dialog-box'>
                    <div className="dialog-header">
                        <Typography variant="subtitle1" gutterBottom>
                            {title}
                        </Typography>
                        {canClose && (<Button onClick={onClickClose}>Close</Button>)}
                    </div>
                    <div className='dialog-content'>
                        {children}
                    </div>
                </Box>
            </ResizableBox>
        </Draggable >
    );
};

export default CustomDialog;