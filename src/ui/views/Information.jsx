import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Grid2 as Grid } from '@mui/material';

import Dialog from '../components/Dialog';
import TextInput from '../components/TextInput';

const InformationView = forwardRef(({ children }, ref) => {
    return (
        <div>
            <Dialog
                title='Information'
                ref={ref}
                size={{ width: 640, height: 480 }}
                position={{ x: 10, y: 220 }}
            >
                <Grid container spacing={1}>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Name" value={"scenario"}></TextInput>
                    </Grid>
                    <TextInput name="Scenario Folder" value={"folder"}></TextInput>
                    <TextInput name="Particles" value={"123456"}></TextInput>
                    <TextInput name="Max Particles" value={"123456"}></TextInput>
                    <TextInput name="Elapsed Time (steps)" value={"123456"}></TextInput>
                    <TextInput name="Camera Coordinates" value={"123456"}></TextInput>
                </Grid>
            </Dialog>
        </div>
    );
});

export default InformationView;