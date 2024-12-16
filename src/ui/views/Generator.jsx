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

const GeneratorView = ({
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
                title='Generator'
                size={{ width: 580, height: 290 }}
                position={{ x: 520, y: 460 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="Controls" {...a11yProps(0)} />
                        <Tab label="Mass" {...a11yProps(1)} />
                        <Tab label="Charge" {...a11yProps(2)} />
                        <Tab label="Nuclear Charge" {...a11yProps(3)} />
                        <Tab label="Velocity" {...a11yProps(4)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={parameters['controls']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={parameters['mass']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={parameters['charge']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={3}>
                    <GridList itemList={parameters['nuclearCharge']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={4}>
                    <GridList itemList={parameters['velocity']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default GeneratorView;