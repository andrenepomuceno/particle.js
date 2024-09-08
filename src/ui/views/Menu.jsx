import React, { useRef, useState } from 'react';
import { Grid2 as Grid, Button } from '@mui/material';

import Dialog from '../components/Dialog';

const MenuView = ({ informationRef, children }) => {
    function handleInformationClick() {
        informationRef.current.open();
    }

    return (
        <div>
            <Dialog
                title='Main Menu'
                canClose={false}
                size={{ width: 640, height: 120 }}
                position={{ x: 10, y: 80 }}
            >
                <Grid container spacing={1}>
                    <Button onClick={handleInformationClick}>Information</Button>
                    <Button>Controls</Button>
                    <Button>Particle</Button>
                    <Button>Selection</Button>
                    <Button>Generator</Button>
                    <Button>Field</Button>
                    <Button>Advanced</Button>
                    <Button>Parameters</Button>
                </Grid>
            </Dialog>
        </div>
    );
};

export default MenuView;