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

const FieldView = ({
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
                title='Field'
                size={{ width: 510, height: 280 }}
                position={{ x: 310, y: 770 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <GridList itemList={parameters['field']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default FieldView;