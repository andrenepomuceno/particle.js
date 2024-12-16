import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Box, Button, Card, CardActions, CardContent, Paper, Typography } from '@mui/material';

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

    const onDragStop = (e, position) => {
        console.log(position);
        setPosition(position);
    };

    const onResize = (e, { size }) => {
        console.log(size);
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
                // height={dialogSize.height}
                minConstraints={[132, 100]}
                maxConstraints={[1200, 1000]}
                // onResize={onResize}
                onResizeStop={onResize}
            >
                <Card>
                    <CardContent>
                        <Box className='dialog-box'>
                            <div className="dialog-header">
                                <Typography variant="subtitle1" gutterBottom>
                                    {title}
                                </Typography>
                            </div>
                            <div className='dialog-content'>
                                {children}
                            </div>
                        </Box>
                    </CardContent>
                        {canClose && (
                            <CardActions>
                                <Button onClick={onClickClose}>Close</Button>
                            </CardActions>
                        )}
                </Card>
            </ResizableBox>
        </Draggable >
    );
};

export default CustomDialog;