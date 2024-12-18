import React from 'react';
import { Button, Grid2 as Grid } from '@mui/material';

const ControlButton = ({ children, onClick }) => {
    return (
        <div>
            {/* <Grid item> */}
                <Button
                    onClick={onClick}
                    variant="outlined"
                    size="small"
                    fullWidth
                >
                    {children}
                </Button>
            {/* </Grid> */}
        </div>
    );
};

export default ControlButton;