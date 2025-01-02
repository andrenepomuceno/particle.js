import React from 'react';
import { useState, useEffect } from 'react';
import { InputLabel, MenuItem, Select, FormControl } from '@mui/material';

const SelectionInput = ({
    name = '',
    value = '',
    onFinish = undefined,
    selectionList = undefined,
}) => {
    const [state, setState] = useState(value);
    const [selectionMap] = useState([]);

    const onChange = (e) => {
        const value = e.target.value;
        setState(value);
        onFinish_(value);
    }

    const onFinish_ = (value) => {
        if (onFinish) {
            onFinish(value);
        }
    }

    useEffect(() => {
        setState(state);
    }, [state]);

    if (selectionMap.length == 0) {
        for (let key in selectionList) {
            selectionMap.push(
                <MenuItem
                    value={selectionList[key]}
                    key={crypto.randomUUID()}>{key}
                </MenuItem>
            )
        }
    }

    return (
        <FormControl fullWidth size="small">
            <InputLabel id='selection-label'>{name}</InputLabel>
            <Select
                labelId='selection-label'
                value={value}
                onChange={onChange}
                label={name}
            >
                {selectionMap}
            </Select>
        </FormControl>
    );
};

export default SelectionInput;