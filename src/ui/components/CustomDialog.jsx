import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Box, Button, Card, CardActions, CardContent, Typography } from '@mui/material';

import 'react-resizable/css/styles.css';
import './CustomDialog.css';

const LOCAL_STORAGE_PREFIX = 'customDialogState';

const CustomDialog = ({
    title = 'Dialog',
    canClose = true,
    size = { width: 200, height: 200 },
    position = { x: 10, y: 10 },
    open = true,
    onClose,
    children,
}) => {
    // Load initial state from localStorage or fallback to default props
    const localStorageKey = LOCAL_STORAGE_PREFIX + ":" + title;
    const getInitialState = () => {
        const savedState = localStorage.getItem(localStorageKey);
        if (savedState) {
            return JSON.parse(savedState);
        }
        return { size, position };
    };

    const [isOpen, setIsOpen] = useState(open);
    const [dialogSize, setSize] = useState(getInitialState().size);
    const [dialogPos, setPosition] = useState(getInitialState().position);

    useEffect(() => {
        setIsOpen(open);
    }, [open]);

    // Save state to localStorage whenever size or position changes
    useEffect(() => {
        localStorage.setItem(
            localStorageKey,
            JSON.stringify({ size: dialogSize, position: dialogPos })
        );
    }, [dialogSize, dialogPos]);

    const onClickClose = (e) => {
        setIsOpen(false);
        if (onClose) onClose(e);
    };

    const onDragStop = (e, position) => {
        setPosition({ x: position.x, y: position.y });
    };

    const onResize = (e, { size }) => {
        setSize(size);
    };

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
                onResizeStop={onResize}
            >
                <Card variant='outlined'>
                    <CardContent>
                        <div className="dialog-header">
                            <Typography variant="subtitle1">
                                {title}
                            </Typography>
                        </div>
                        <div className="dialog-content">
                            {children}
                        </div>
                    </CardContent>
                    {canClose && (
                        <CardActions>
                            <Button onClick={onClickClose}>Close</Button>
                        </CardActions>
                    )}
                </Card>
            </ResizableBox>
        </Draggable>
    );
};

export default CustomDialog;
