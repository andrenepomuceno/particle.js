import React from 'react';
import { Box, Grid2 as Grid, Stack, Typography } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import ControlButton from '../components/ControlButton';

const MenuView = ({
    onClickInfo,
    onClickParameters,
    onClickControls,
    onClickAdvanced,
    onClickField,
    onClickParticle,
    onClickSelection,
    onClickGenerator,
    onClickAbout,
}) => {
    return (
        <div>
            <CustomDialog
                title='Control Panel'
                canClose={false}
                size={{ width: 134, height: 372 }}
                position={{ x: 10, y: 70 }}
                header={false}
            >
                <Stack container spacing={1}>
                    <Box className='dialog-header' sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'move' }}>
                        <Box
                            component="img"
                            sx={{ height: 28, width: 28 }}
                            src="img/transparent-icon.png"
                        />
                        <Typography sx={{ margin: 1 }}>
                            particle.js
                        </Typography>
                    </Box>
                    <ControlButton onClick={onClickAbout}>About/Help</ControlButton>
                    <ControlButton onClick={onClickInfo}>Information</ControlButton>
                    <ControlButton onClick={onClickControls}>Controls</ControlButton>
                    <ControlButton onClick={onClickParticle}>Particle</ControlButton>
                    <ControlButton onClick={onClickSelection}>Selection</ControlButton>
                    <ControlButton onClick={onClickGenerator}>Generator</ControlButton>
                    <ControlButton onClick={onClickField}>Field</ControlButton>
                    <ControlButton onClick={onClickAdvanced}>Advanced</ControlButton>
                    <ControlButton onClick={onClickParameters}>Parameters</ControlButton>
                </Stack>
            </CustomDialog>
        </div>
    );
};

export default MenuView;