import React from 'react';
import { Grid2 as Grid, Stack } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import ControlButton from '../components/ControlButton';
import { CustomTabPanel } from '../components/CustomTabPanel';

const MenuView = ({
    onClickInfo,
    onClickParameters,
    onClickControls,
    onClickAdvanced,
    onClickField,
    onClickParticle,
    onClickSelection,
    onClickGenerator,
}) => {
    return (
        <div>
            <CustomDialog
                title='Control Panel'
                canClose={false}
                size={{ width: 134, height: 372 }}
                position={{ x: 10, y: 70 }}
            >   
                {/* <Grid container spacing={1}> */}
                <Stack container spacing={1}>
                    <ControlButton onClick={onClickInfo}>Information</ControlButton>
                    <ControlButton onClick={onClickControls}>Controls</ControlButton>
                    <ControlButton onClick={onClickParticle}>Particle</ControlButton>
                    <ControlButton onClick={onClickSelection}>Selection</ControlButton>
                    <ControlButton onClick={onClickGenerator}>Generator</ControlButton>
                    <ControlButton onClick={onClickField}>Field</ControlButton>
                    <ControlButton onClick={onClickAdvanced}>Advanced</ControlButton>
                    <ControlButton onClick={onClickParameters}>Parameters</ControlButton>
                </Stack>
                {/* </Grid> */}
            </CustomDialog>
        </div>
    );
};

export default MenuView;