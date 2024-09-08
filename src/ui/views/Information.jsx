import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Grid2 as Grid, TextField } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import TextInput from '../components/TextInput';

const InformationView = ({
    open = true,
    onClose,
    info = {
        name: 'name',
        folder: 'folder',
    },
}) => {
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
                        <TextInput name="Scenario Name" value={info.name}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Scenario Folder" value={info.folder}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Particles" value={info.particles}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Max Particles" value={info.maxParticles}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Elapsed Time (steps)" value={info.time}></TextInput>
                    </Grid>
                    <Grid item>
                        <TextInput name="Camera Coordinates" value={info.camera}></TextInput>
                    </Grid>
                </Grid>
            </CustomDialog>
        </div>
    );
};

export default InformationView;