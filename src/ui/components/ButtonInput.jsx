import React from 'react';
import { Button } from '@mui/material';

const ButtonInput = ({
    name,
    onFinish,
}) => {
    const onClick = (e) => {
        if (onFinish) {
            onFinish(value);
        }
    }

    return (
        <Button
            size='small'
            onClick={onClick}
        >
            {name}
        </Button>
    );
};

export default ButtonInput;