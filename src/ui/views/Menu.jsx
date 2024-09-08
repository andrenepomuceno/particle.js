import React from 'react';
import { Grid2 as Grid, Button } from '@mui/material';

import Dialog from '../components/Dialog';

const MenuView = ({ onInfoOpen }) => {
    return (
        <div>
            <Dialog
                title='Main Menu'
                canClose={false}
                size={{ width: 250, height: 220 }}
                position={{ x: 10, y: 80 }}
            >
                <Grid container spacing={1}>
                    <Button onClick={onInfoOpen}>Information</Button>
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