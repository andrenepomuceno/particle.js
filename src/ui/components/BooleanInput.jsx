import React, { useEffect, useState } from 'react';
import { FormControlLabel, FormGroup, Switch } from '@mui/material';

const BooleanInput = ({
    name,
    value = false,
    onFinish,
}) => {
    const [checked, setChecked] = useState(value);

    const onToggle = (e) => {
        const value = e.target.checked;
        setChecked(value);
        if (onFinish) {
            onFinish(value);
        }
    }

    useEffect(() => {
        setChecked(value);
    }, [value]);

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