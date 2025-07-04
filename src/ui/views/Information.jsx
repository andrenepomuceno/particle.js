import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';

import CustomDialog from '../components/CustomDialog';
import { CustomTabPanel, a11yProps } from '../components/CustomTabPanel';
import GridList from '../components/GridList';

const InformationView = ({view}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Information'
                size={{ width: 420, height: 370 }}
                position={{ x: 160, y: 70 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} onChange={handleChange} variant='scrollable'>
                        <Tab label="General" {...a11yProps(0)} />
                        <Tab label="Statistics" {...a11yProps(1)} />
                        <Tab label="Ruler" {...a11yProps(2)} />
                        {ENV?.production!==true && (
                            <Tab label="Debug" {...a11yProps(3)} />
                        )}
                    </Tabs>
                </Box>
                <CustomTabPanel value={tab} index={0}>
                    <GridList itemList={view.state['general']}></GridList>
                </CustomTabPanel>
                <CustomTabPanel value={tab} index={1}>
                    <GridList itemList={view.state['statistics']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={2}>
                    <GridList itemList={view.state['ruler']}></GridList>
                </CustomTabPanel >
                <CustomTabPanel value={tab} index={3}>
                    <GridList itemList={view.state['debug']}></GridList>
                </CustomTabPanel >
            </CustomDialog>
        </div>
    );
};

export default InformationView;