import React from 'react';
import { Grid2 as Grid } from '@mui/material';
import AutomaticInput from '../components/AutomaticInput';

const GridList = ({ itemList = [], cols = 2 }) => {
    const itemListMaped = itemList.map(item =>
        (<Grid item key={item.id} size={12/cols}>
            <AutomaticInput
                name={item.title}
                itemType={item.type}
                value={item.value}
                onFinish={item.onFinish}
                selectionList={item.selectionList}
            ></AutomaticInput>
        </Grid>)
    );
    return (
        <Grid container spacing={2}>
            {itemListMaped}
        </Grid>
    );
};

export default GridList;