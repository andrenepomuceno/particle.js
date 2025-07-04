import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import GridList from '../components/GridList';

const GeneratorView = ({view}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Generator'
                size={{ width: 400, height: 290 }}
                position={{ x: 720, y: 450 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
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
                    <GridList itemList={view.state['controls']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={view.state['mass']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={view.state['charge']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={3}>
                    <GridList itemList={view.state['nuclearCharge']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={4}>
                    <GridList itemList={view.state['velocity']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default GeneratorView;