import React from 'react';
import { Button } from '@mui/material';

const ButtonInput = ({
    name,
    onClick,
}) => {
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