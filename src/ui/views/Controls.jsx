import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import GridList from '../components/GridList';

const ControlsView = ({view}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Controls'
                size={{ width: 360, height: 350 }}
                position={{ x: 1130, y: 16 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        {/* <Tab label="Controls" {...a11yProps(0)} /> */}
                        <Tab label="Simulation" {...a11yProps(0)} />
                        <Tab label="Camera" {...a11yProps(1)} />
                        <Tab label="View" {...a11yProps(2)} />
                    </Tabs>
                </Box>
                {/* <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={view.state['controls']}></GridList>
                </CustomTabPanel> */}
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={view.state['simulation']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={view.state['camera']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={view.state['view']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default ControlsView;