import React from 'react';
import { Button, Grid2 } from '@mui/material';

const ControlButton = ({ children, onClick }) => {
    return (
        <div>
            <Grid2 item>
                <Button onClick={onClick}>{children}</Button>
            </Grid2>
        </div>
    );
};

export default ControlButton;