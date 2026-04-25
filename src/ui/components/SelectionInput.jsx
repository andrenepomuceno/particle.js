import React, { useId, useMemo } from 'react';
import { InputLabel, MenuItem, Select, FormControl } from '@mui/material';

const SelectionInput = ({
    name = '',
    value = '',
    onFinish = undefined,
    selectionList = undefined,
}) => {
    const labelId = useId();

    const onChange = (e) => {
        const value = e.target.value;
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
            <InputLabel id={labelId}>{name}</InputLabel>
            <Select
                labelId={labelId}
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