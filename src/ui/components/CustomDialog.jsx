import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Card, CardContent, CardHeader, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import 'react-resizable/css/styles.css';
import './CustomDialog.css';

const clampPosition = (pos, dialogSize, margin = 40) => ({
    x: Math.max(margin - dialogSize.width, Math.min(pos.x, window.innerWidth - margin)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - margin)),
});

const CustomDialog = ({
    id,
    title = 'Dialog',
    canClose = true,
    size = { width: 200, height: 200 },
    minSize = { width: 128, height: 200 },
    position = { x: 10, y: 10 },
    open = true,
    onClose,
    children,
    header = true,
}) => {
    const localStorageKey = "CustomDialog:" + (id || title);
    const nodeRef = useRef(null);

    const [isOpen, setIsOpen] = useState(open);
    const [dialogSize, setSize] = useState(() => {
        const saved = localStorage.getItem(localStorageKey);
        return saved ? JSON.parse(saved).size || size : size;
    });
    const [dialogPos, setPosition] = useState(() => {
        const saved = localStorage.getItem(localStorageKey);
        const pos = saved ? JSON.parse(saved).position || position : position;
        return clampPosition(pos, size);
    });
    const [zIndex, setZIndex] = useState(1000);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        setIsOpen(open);
    }, [open]);

    useEffect(() => {
        localStorage.setItem(
            localStorageKey,
            JSON.stringify({ size: dialogSize, position: dialogPos })
        );
    }, [dialogSize, dialogPos]);

    useEffect(() => {
        const onResize = () => {
            setPosition(prev => clampPosition(prev, dialogSize));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [dialogSize]);

    const onClickClose = (e) => {
        setIsOpen(false);
        if (onClose) onClose(e);
    };

    function onDrag(e, position) {
        setIsDragging(true);
        setZIndex(1200);
    }

    const onDragStop = (e, data) => {
        setIsDragging(false);
        setPosition(clampPosition({ x: data.x, y: data.y }, dialogSize));
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
                nodeRef={nodeRef}
                handle=".dialog-header"
                position={dialogPos}
                onDrag={onDrag}
                onStop={onDragStop}
            >
                <div ref={nodeRef}>
                    <ResizableBox
                        width={dialogSize.width}
                        height={dialogSize.height}
                        minConstraints={[minSize.width, minSize.height]}
                        maxConstraints={[1200, 1000]}
                        onResizeStop={onResizeStop}
                    >
                        <Card
                            variant='outlined'
                            sx={{
                                bgcolor: 'rgba(20, 20, 20, 0.95)',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                boxSizing: 'border-box',
                            }}
                        >
                            {header && (
                                <CardHeader
                                    className="dialog-header"
                                    subheader={title}
                                    sx={{ cursor: 'move', flexShrink: 0 }}
                                    action={canClose && (
                                        <IconButton
                                            aria-label="close"
                                            size="small"
                                            onClick={onClickClose}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                />
                            )}

                            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
                                {children}
                            </CardContent>
                        </Card>
                    </ResizableBox>
                </div>
            </Draggable>
        </div>
    );
};

export default CustomDialog;
