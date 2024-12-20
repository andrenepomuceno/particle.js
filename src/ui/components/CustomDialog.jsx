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

    const onDragStop = (e, position) => {
        setPosition({ x: position.x, y: position.y });
    };

    const onResizeStop = (e, { size }) => {
        setSize(size);
    };

    const handleMouseEnter = () => setZIndex(1100);
    const handleMouseLeave = () => setZIndex(1000);

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
                onStop={onDragStop}
            >
                <ResizableBox
                    width={dialogSize.width}
                    // height={dialogSize.height}
                    minConstraints={[132, 100]}
                    maxConstraints={[1200, 1000]}
                    // onResize={onResizeStop}
                    onResizeStop={onResizeStop}
                >
                    <Card
                        // variant='outlined'
                        // sx={{ width: '100%', height: '100%' }}
                        sx={{ bgcolor: 'rgba(20, 20, 20, 0.95)' }}
                    >
                        <CardHeader
                            className="dialog-header"
                            subheader={title}
                            sx={{ cursor: 'move' }}
                        />

                        {/* <CardMedia
                            sx={{ height: 32 }}
                            image="img/transparent-icon.png"
                        /> */}

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
