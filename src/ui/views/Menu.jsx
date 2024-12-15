import React from 'react';
import { Grid2 } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import ControlButton from '../components/ControlButton';

const MenuView = ({
    onClickInfo,
    onClickParameters,
    onClickControls,
}) => {
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
                    <ControlButton onClick={onClickControls}>Controls</ControlButton>
                    <ControlButton onClick={onClickInfo}>Particle</ControlButton>
                    <ControlButton onClick={onClickInfo}>Selection</ControlButton>
                    <ControlButton onClick={onClickInfo}>Generator</ControlButton>
                    <ControlButton onClick={onClickInfo}>Field</ControlButton>
                    <ControlButton onClick={onClickInfo}>Advanced</ControlButton>
                    <ControlButton onClick={onClickParameters}>Parameters</ControlButton>
                </Grid2>
            </CustomDialog>
        </div>
    );
};

export default MenuView;