import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const ParticleView = ({
    open = true,
    onClose,
    parameters = [{
        folder: "",
        content: [{
            title: "", value: "", onFinish: undefined
        }]
    }],
}) => {
    const [tab, setTab] = useState(0);
    const handleChange = (event, value) => {
        setTab(value);
    };

    return (
        <div>
            <CustomDialog
                title='Particle'
                size={{ width: 500, height: 390 }}
                position={{ x: 1180, y: 70 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <GridList itemList={parameters['particle']}></GridList>
            </CustomDialog>
        </div>
    );
};

export default ParticleView;