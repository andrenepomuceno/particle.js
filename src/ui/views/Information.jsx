import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Grid2 as Grid, TextField } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import TextInput from '../components/TextInput';

const InformationView = ({ open = true, onClose }, ref) => {
    // const onChangeName = (e) => {
    //     setName(e.target.value);
    // }

    // useEffect(() => {
    //     setTitle(props.title);
    // }, [props.title]);

    return (
        <div>
            <CustomDialog
                title='Information'
                size={{ width: 480, height: 260 }}
                position={{ x: 10, y: 320 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Grid container spacing={1}>
                    <Grid item>
                        <TextInput name="Scenario Name" value={'scenario'}></TextInput>
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
            </CustomDialog>
        </div>
    );
};

export default InformationView;