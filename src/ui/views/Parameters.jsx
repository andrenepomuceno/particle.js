import React, { useState } from 'react';
import { Grid2 as Grid, Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import TextInput from '../components/TextInput';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';

const Constants = ({ constants = [] }) => {
    const itemList = constants.map(item =>
        <Grid item>
            <TextInput
                name={item.title}
                value={item.value}
                onFinish={item.onFinish}
                readOnly={item.onFinish == undefined}
            ></TextInput>
        </Grid>
    );
    return (
        <Grid container spacing={1}>
            {itemList}
        </Grid>
    );
};

const ParametersView = ({
    open = true,
    onClose,
    parameters = [{
        folder: "",
        content: [{
            title: "", value: "", onFinish: undefined
        }]
    }],
}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Parameters'
                size={{ width: 510, height: 390 }}
                position={{ x: 10, y: 730 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="General Forces" {...a11yProps(0)} />
                        <Tab label="Statistics" {...a11yProps(1)} />
                        <Tab label="Advanced" {...a11yProps(2)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <Constants constants={parameters['general']}></Constants>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    {/* <Statistics info={info} onFinish={onFinish}></Statistics> */}
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    {/* <Ruler info={info}></Ruler> */}
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default ParametersView;