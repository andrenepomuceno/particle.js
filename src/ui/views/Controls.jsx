import React, { useState } from 'react';
import { Grid2 as Grid, Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import AutomaticInput from '../components/AutomaticInput';

const GridList = ({ itemList = [] }) => {
    const itemListMaped = itemList.map(item =>
        (<Grid item key={item.id}>
            <AutomaticInput
                name={item.title}
                value={item.value}
                onFinish={item.onFinish}
                selectionList={item.selectionList}
            ></AutomaticInput>
        </Grid>)
    );
    return (
        <Grid container spacing={1}>
            {itemListMaped}
        </Grid>
    );
};

const ControlsView = ({
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
                title='Controls'
                size={{ width: 510, height: 390 }}
                position={{ x: 10, y: 730 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="Controls" {...a11yProps(0)} />
                        <Tab label="Simulation" {...a11yProps(1)} />
                        <Tab label="Camera" {...a11yProps(2)} />
                        <Tab label="View" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={parameters['controls']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={parameters['simulation']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={parameters['camera']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={3}>
                    <GridList itemList={parameters['view']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default ControlsView;