import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Grid2 as Grid } from '@mui/material';

import Dialog from '../components/Dialog';
import TextInput from '../components/TextInput';

const InformationView = ({open = true, onClose}, ref) => {
    return (
        <div>
            <Dialog
                title='Information'
                size={{ width: 480, height: 260 }}
                position={{ x: 10, y: 320 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Grid container spacing={1}>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Folder" value={"folder"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Particles" value={"123456"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Max Particles" value={"123456"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Elapsed Time (steps)" value={"123456"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Camera Coordinates" value={"123456"}></TextInput>
                    </Grid>
                </Grid>
            </Dialog>
        </div>
    );
};

export default InformationView;