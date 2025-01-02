import React from 'react';
import { Button } from '@mui/material';

const ButtonInput = ({
    name,
    onClick,
}) => {
    return (
        <Button
            size='small'
            variant="outlined"
            onClick={onClick}
            fullWidth
        >
            {name}
        </Button>
    );
};

export default ButtonInput;