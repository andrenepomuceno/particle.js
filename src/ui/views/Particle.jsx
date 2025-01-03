import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const ParticleView = ({view}) => {
    return (
        <div>
            <CustomDialog
                title='Particle'
                size={{ width: 360, height: 390 }}
                position={{ x: 1490, y: 16 }}
                canClose={true}
                open={view.isOpen}
                onClose={(e) => view.onClickClose(e)}
            >
                <GridList itemList={view.state.parameters['particle']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default ParticleView;