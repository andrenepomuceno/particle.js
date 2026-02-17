import React from 'react';
import { Box } from '@mui/material';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const ParticleView = ({view}) => {
    return (
        <div>
            <CustomDialog
                title='Particle'
                size={{ width: 360, height: 600 }}
                position={{ x: 1490, y: 16 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <Box sx={{ px: 2 }}>
                    <GridList itemList={view.state['particle']}></GridList>
                </Box>
            </CustomDialog>
        </div>
    );
};

export default ParticleView;