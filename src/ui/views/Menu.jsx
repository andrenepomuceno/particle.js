import React from 'react';
import { Grid2 } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import ControlButton from '../components/ControlButton';

const MenuView = ({ onClickInfo }) => {
    return (
        <div>
            <CustomDialog
                title='Control Panel'
                canClose={false}
                size={{ width: 250, height: 220 }}
                position={{ x: 10, y: 80 }}
            >
                <Grid2 container spacing={1}>
                    <ControlButton onClick={onClickInfo}>Information</ControlButton>
                    <ControlButton>Controls</ControlButton>
                    <ControlButton>Particle</ControlButton>
                    <ControlButton>Selection</ControlButton>
                    <ControlButton>Generator</ControlButton>
                    <ControlButton>Field</ControlButton>
                    <ControlButton>Advanced</ControlButton>
                    <ControlButton>Parameters</ControlButton>
                </Grid2>
            </CustomDialog>
        </div>
    );
};

export default MenuView;