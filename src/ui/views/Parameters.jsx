import React, { useState } from 'react';
import { Grid2 as Grid, Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import TextInput from '../components/TextInput';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import AutomaticInput from '../components/AutomaticInput';

const GridList = ({ itemList = [] }) => {
    const itemListMaped = itemList.map(item =>
        (<Grid item key={item.id}>
            <AutomaticInput
                name={item.title}
                value={item.value}
                onFinish={item.onFinish}
            ></AutomaticInput>
        </Grid>)
    );
    return (
        <Grid container spacing={1}>
            {itemListMaped}
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
                        <Tab label="Forces" {...a11yProps(0)} />
                        <Tab label="Other" {...a11yProps(1)} />
                        <Tab label="Boundaries" {...a11yProps(2)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={parameters['general']}></GridList>
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