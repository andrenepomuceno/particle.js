import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import GridList from '../components/GridList';

const ParametersView = ({view}) => {
    //console.log(parameters);

    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Parameters'
                size={{ width: 420, height: 390 }}
                position={{ x: 1490, y: 360 }}
                canClose={true}
                open={view.isOpen}
                onClose={view.onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="Forces" {...a11yProps(0)} />
                        <Tab label="Other" {...a11yProps(1)} />
                        <Tab label="Boundaries" {...a11yProps(2)} />
                        <Tab label="Experimental" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={view.state.parameters['forces']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={view.state.parameters['other']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={view.state.parameters['boundaries']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={3}>
                    <GridList itemList={view.state.parameters['experimental']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default ParametersView;