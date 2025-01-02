import React, { useState } from 'react';
import { Grid2 as Grid, Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import GridList from '../components/GridList';

const SelectionView = ({view}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Selection'
                size={{ width: 300, height: 590 }}
                position={{ x: 720, y: 16 }}
                canClose={true}
                open={view.isOpen}
                onClose={view.onClose}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="Controls" {...a11yProps(0)} />
                        <Tab label="Properties" {...a11yProps(1)} />
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={view.state.parameters['selection']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={view.state.parameters['properties']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default SelectionView;