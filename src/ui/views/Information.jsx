import React, { useState } from 'react';
import { Grid2 as Grid, Tabs, Tab, Box } from '@mui/material';
import PropTypes from 'prop-types';

import CustomDialog from '../components/CustomDialog';
import TextInput from '../components/TextInput';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const Scenarios = ({ info, onFinish }) => {
    return (
        <Grid container spacing={1}>
            <Grid item>
                <TextInput name="Scenario Name" value={info.name} onFinish={onFinish.name}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Scenario Folder" value={info.folder} readOnly={true}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Particles" value={info.particles} readOnly={true}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Max Particles" value={info.maxParticles} onFinish={onFinish.maxParticles}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Elapsed Time (steps)" value={info.time} readOnly={true}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Camera Coordinates" value={info.camera} onFinish={onFinish.camera}></TextInput>
            </Grid>
        </Grid>
    );
};

const Statistics = ({ info, onFinish }) => {
    return (
        <Grid container spacing={1}>
            <Grid item>
                <TextInput name="Mass sum." value={info.mass} onFinish={onFinish.mass}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Charge sum." value={info.charge} onFinish={onFinish.charge}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Nuclear Charge sum." value={info.nuclearCharge} onFinish={onFinish.nuclearCharge}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Color Charge sum." value={info.colorCharge}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Energy avg." value={info.energy}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Velocity avg." value={info.velocity}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Collisions" value={info.collisions}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Out of Boundary" value={info.outOfBoundary}></TextInput>
            </Grid>
        </Grid>
    );
};

const Ruler = ({ info }) => {
    return (
        <Grid container spacing={1}>
            <Grid item>
                <TextInput name="Length" value={info.length}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Delta" value={info.delta}></TextInput>
            </Grid>
            <Grid item>
                <TextInput name="Start" value={info.start}></TextInput>
            </Grid>
        </Grid>
    );
};

const InformationView = ({
    open = true,
    onClose,
    info = {},
    onFinish = {},
}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Information'
                size={{ width: 280, height: 600 }}
                position={{ x: 10, y: 320 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="General" {...a11yProps(0)} />
                        <Tab label="Statistics" {...a11yProps(1)} />
                        <Tab label="Ruler" {...a11yProps(2)} />
                        <Tab label="Debug" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <Scenarios info={info} onFinish={onFinish}></Scenarios>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <Statistics info={info} onFinish={onFinish}></Statistics>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <Ruler info={info}></Ruler>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default InformationView;