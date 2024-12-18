import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';

const AdvancedView = ({
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
                title='Advanced'
                size={{ width: 300, height: 280 }}
                position={{ x: 520, y: 840 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <GridList itemList={parameters['advanced']} cols={1}></GridList>
            </CustomDialog>
        </div>
    );
};

export default AdvancedView;