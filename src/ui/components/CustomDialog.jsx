import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Button, Card, CardActions, CardContent, CardHeader, CardMedia } from '@mui/material';

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
    header = true,
}) => {
    // Load initial state from localStorage or fallback to default props
    const localStorageKey = "CustomDialog:" + title;
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
    const [zIndex, setZIndex] = useState(1000);
    const [isDragging, setIsDragging] = useState(false);

    if (dialogPos.x + dialogSize.width > window.innerWidth) {
        setPosition({
            x: window.innerWidth - dialogSize.width,
            y: dialogPos.y
        });
    }

    if (dialogPos.y + dialogSize.height > window.innerHeight) {
        setPosition({
            x: dialogPos.x,
            y: window.innerHeight - dialogSize.height
        });
    }

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

    function onDrag(e, position) {
        setIsDragging(true);
        setZIndex(1200);
    }

    const onDragStop = (e, position) => {
        setIsDragging(false);
        setPosition({ x: position.x, y: position.y });
    };

    const onResizeStop = (e, { size }) => {
        setSize(size);
    };

    const handleMouseEnter = () => setZIndex(1100);
    const handleMouseLeave = () => {
        if (isDragging) return;
        setZIndex(1000);
    }

    if (!isOpen) return null;

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                position: 'absolute',
                zIndex
            }}
        >
            <Draggable
                handle=".dialog-header"
                position={dialogPos}
                onDrag={onDrag}
                onStop={onDragStop}
            >
                <ResizableBox
                    width={dialogSize.width}
                    // height={dialogSize.height}
                    minConstraints={[132, 100]}
                    maxConstraints={[1200, 1000]}
                    onResizeStop={onResizeStop}
                >
                    <Card
                        variant='outlined'
                        sx={{ bgcolor: 'rgba(20, 20, 20, 0.95)' }}
                    >
                        {header && (
                            <CardHeader
                                className="dialog-header"
                                subheader={title}
                                sx={{ cursor: 'move' }}
                            />
                        )}

                        <CardContent>
                            {children}
                        </CardContent>

                        {canClose && (
                            <CardActions>
                                <Button onClick={onClickClose}>Close</Button>
                            </CardActions>
                        )}
                    </Card>
                </ResizableBox>
            </Draggable>
        </div>
    );
};

export default CustomDialog;
