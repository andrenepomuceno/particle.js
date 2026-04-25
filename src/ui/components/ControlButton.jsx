import React from 'react';
import { Button } from '@mui/material';

const ControlButton = ({ children, onClick }) => {
    return (
        <div>
            <Button
                onClick={onClick}
                variant="outlined"
                size="small"
                fullWidth
            >
                {children}
            </Button>
        </div>
    );
};

export default ControlButton;