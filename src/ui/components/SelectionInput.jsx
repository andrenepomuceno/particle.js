import React, { useMemo } from 'react';
import { InputLabel, MenuItem, Select, FormControl } from '@mui/material';

const SelectionInput = ({
    name = '',
    value = '',
    onFinish = undefined,
    selectionList = undefined,
}) => {
    const onChange = (e) => {
        const value = e.target.value;
        onFinish_(value);
    }

    const onFinish_ = (value) => {
        if (onFinish) {
            onFinish(value);
        }
    }

    const selectionMap = useMemo(() => {
        if (!selectionList) return [];
        return Object.keys(selectionList).map((key) => (
            <MenuItem value={selectionList[key]} key={key}>
                {key}
            </MenuItem>
        ));
    }, [selectionList]);

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