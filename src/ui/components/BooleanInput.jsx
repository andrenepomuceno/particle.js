import React from 'react';
import { useState, useEffect } from 'react';
import { FormControlLabel, FormGroup, Switch } from '@mui/material';

const BooleanInput = ({
    name,
    value = false,
    onFinish,
}) => {
    const [checked, setChecked] = useState(value);

    const onToggle = (e) => {
        const value = e.target.checked;
        setChecked(!checked);
        onFinish_(value);
    }

    const onFinish_ = (value) => {
        if (onFinish) {
            onFinish(value);
        }
    }

    useEffect(() => {
        setChecked(checked);
    }, [checked]);

    return (
        <FormGroup>
            <FormControlLabel
                label={name}
                control={
                    <Switch
                        checked={checked}
                        onChange={onToggle}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                }
            />
        </FormGroup>
    );
};

export default BooleanInput;