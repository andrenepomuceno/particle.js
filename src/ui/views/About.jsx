import React, { useState } from 'react';
import CustomDialog from '../components/CustomDialog';
import GridList from '../components/GridList';
import { Box, Typography } from '@mui/material';

const About = () => {
    return (
        <div>
            <Typography variant="h3" gutterBottom>
                Welcome to particle.js!
            </Typography>
            <Typography variant="body1" gutterBottom>
                <b>particle.js</b> is a interactive n-body particle physics simulator, where fundamental particles can evolve and interact according to simplified physics laws.
                <br/>
                Here are the basic controls to get you started:
            </Typography>
            <Typography variant="h5" gutterBottom>
                Mouse Controls
            </Typography>
            <Typography variant="body1" gutterBottom>
                
                    <li>Hold <b>MIDDLE BUTTON</b> or rotate the <b>SCROLL WHEEL</b> to zoom in/out.</li>
                    <li>Hold <b>RIGHT BUTTON</b> or <b>CTRL + LEFT BUTTON</b> to move the camera position (pan).</li>
                    <li>Click <b>LEFT BUTTON</b> to select a individual particle or hold to rotate the camera when 3D mode is enabled.</li>
                    <li>Hold <b>SHIFT + LEFT BUTTON</b> to select a group of particles. Also acts as a ruler (see INFORMATION/Ruler).</li>
                    <li>After selecting a group of particles, press <b>Z</b> to move them to the pointer position.</li>
                    <li>Press <b>X</b> to make a clone of the selection and them press <b>Z</b> to place.</li>
                
            </Typography>
            <Typography variant="h5" gutterBottom>
                Keyboard Shortcuts
            </Typography>
            <Typography variant="body1" gutterBottom>
                Important: keyboard shortcuts do not work when the mouse pointer is over the menus. So, move your mouse outside before pressing a command key.
                
                    <li><b>SPACE</b> pauses and resumes the simulation.</li>
                    <li><b>PAGEDOWN</b> to go to the next simulation.</li>
                    <li><b>PAGEUP</b> to go to the previous simulation.</li>
                    <li><b>R</b> to reset simulation to the initial state.</li>
                    <li><b>N</b> to run one simulation step when paused.</li>
                    <li><b>HOME</b> to return to the first simulation.</li>
                    <li><b>C</b> to to reset the camera position.</li>
                    {/* <li><b>Z</b> to move or place particles.</li> */}
                
                As the simulation is interactive, there's a lot more to have fun! See the "Control Panel" window and "Controls" menu for more.
                <br/>
                Check out the project on <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" style={{ color: "#4CAF50" }}>GitHub</a> for more details and enjoy!
            </Typography>
        </div>
    );
}

const AboutView = ({
    open = true,
    onClose
}) => {
    return (
        <div>
            <CustomDialog
                title='About'
                size={{ width: 800, height: 800 }}
                position={{ x: 520, y: 20 }}
                canClose={true}
                open={open}
                onClose={onClose}
            >
                <About />
            </CustomDialog>
        </div>
    );
};

export default AboutView;