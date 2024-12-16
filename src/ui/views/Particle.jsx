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

const ParticleView = ({
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
                title='Particle'
                size={{ width: 510, height: 390 }}
                position={{ x: 1260, y: 70 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <GridList itemList={parameters['particle']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default ParticleView;