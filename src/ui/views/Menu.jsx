import React from 'react';
import { Grid2 as Grid, Button } from '@mui/material';

import CustomDialog from '../components/CustomDialog';

const MenuView = ({ onClickInfo }) => {
    return (
        <div>
            <CustomDialog
                title='Control Panel'
                canClose={false}
                size={{ width: 250, height: 220 }}
                position={{ x: 10, y: 80 }}
            >
                <Grid container spacing={1}>
                    <Button onClick={onClickInfo}>Information</Button>
                    <Button>Controls</Button>
                    <Button>Particle</Button>
                    <Button>Selection</Button>
                    <Button>Generator</Button>
                    <Button>Field</Button>
                    <Button>Advanced</Button>
                    <Button>Parameters</Button>
                </Grid>
            </CustomDialog>
        </div>
    );
};

export default MenuView;