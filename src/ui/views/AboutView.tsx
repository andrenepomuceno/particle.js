import { useState } from 'react';
import { ANALYTICS_ENABLED } from '../../analytics';

const REPOSITORY_URL = 'https://github.com/andrenepomuceno/particle.js';

const TABS = ['About', 'Quick guide'] as const;
type Tab = (typeof TABS)[number];

export function AboutView() {
  const [tab, setTab] = useState<Tab>('About');
  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'About' ? <AboutTab /> : <QuickGuide />}
    </div>
  );
}

function QuickGuide() {
  return (
    <div className="about">
      <h3 className="section-title">Watch</h3>
      <ul>
        <li>Drag to orbit, wheel to zoom, right-drag to pan. <kbd>C</kbd> resets the camera, <kbd>V</kbd> looks down z.</li>
        <li><kbd>Space</kbd> pauses, <kbd>N</kbd> steps, <kbd>R</kbd> restarts the scenario; <kbd>PageDown</kbd>/<kbd>PageUp</kbd> browse scenarios.</li>
        <li><kbd>Q</kbd> cycles the color mode (charge, color, speed, mass, spin, …); <kbd>H</kbd> hides the interface, <kbd>M</kbd> closes all dialogs.</li>
      </ul>
      <h3 className="section-title">Touch the particles</h3>
      <ul>
        <li>Click a particle to inspect and edit it (<b>Particle</b>); <kbd>L</kbd> follows it.</li>
        <li><kbd>Shift</kbd>+drag selects (a ruler shows the distance); <kbd>O</kbd> looks at the selection, <kbd>X</kbd> copies it, <kbd>Z</kbd>+click pastes, <kbd>D</kbd> deletes.</li>
        <li><kbd>G</kbd> generates particles at the cursor from the <b>Generator</b> template; <kbd>B</kbd>/<kbd>T</kbd>/<kbd>Y</kbd> stop, halve or kick velocities.</li>
      </ul>
      <h3 className="section-title">Write the physics</h3>
      <ul>
        <li>In <b>Forces</b>, write <code>F(r)</code> (positive repels) or switch to potential mode and write <code>V(r)</code>; parameters update live, expressions recompile on <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.</li>
        <li>Variables such as <code>q_i</code>, <code>m_j</code>, <code>s_dot</code> or <code>c_dot</code> are listed in <b>Expressions</b>. A potential that reads <code>dx</code>, <code>dy</code>, <code>dz</code> or <code>si_r</code> gives a non-central force −∇V.</li>
        <li><i>Resultant potential</i> plots the landscape all forces make together; tune its sample pair to see how charges, spins or colors change it.</li>
        <li><b>Parameters</b> holds the time step, friction, boundary, collisions and integrator; it, Forces, Generator and Field have restore buttons.</li>
      </ul>
      <h3 className="section-title">See the field</h3>
      <ul>
        <li><kbd>J</kbd> shows the force a test particle would feel across the view; <kbd>F</kbd> re-fits the grid. Set the test particle in <b>Field</b>, and lock the color scale to compare strengths.</li>
        <li><b>Statistics</b> charts energy, speed and performance over time.</li>
      </ul>
      <h3 className="section-title">Keep and share</h3>
      <ul>
        <li><kbd>P</kbd> exports a snapshot (JSON + PNG), <kbd>I</kbd> imports a snapshot or a scenario file, <kbd>*</kbd> records a video.</li>
        <li>Scenario files describe particle groups, forces and an optional timeline of scripted changes; see <code>docs/scenarios.md</code> in the repository.</li>
      </ul>
      <p className="muted">Press <kbd>?</kbd> for the full list of shortcuts.</p>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="about">
      <p>
        <b>particle.js</b> is a classical, non-relativistic n-body particle physics simulator that runs in your browser. The forces and
        potentials between particles are expressions you write yourself; they are compiled to GLSL and
        evaluated for every pair in parallel on the GPU.
      </p>
      <h3 className="section-title">Getting started</h3>
      <ul>
        <li>Pick a scenario in <b>Information</b>, or press <kbd>PageDown</kbd> / <kbd>PageUp</kbd> to browse them.</li>
        <li>Press <kbd>?</kbd> for the keyboard and mouse shortcuts.</li>
        <li>Open <b>Forces</b> to edit the expressions and watch the live plot.</li>
      </ul>
      <div className="keys">
        <span>Version</span><span>{__APP_VERSION__}</span>
        <span>License</span><span>GPL-3.0</span>
        <span>Source</span><a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">{REPOSITORY_URL.replace('https://', '')}</a>
        <span>Classic</span><a href="v1/index.html" target="_blank" rel="noopener" title="The frozen v1 page keeps its original Google Analytics tag">particle.js v1 (frozen)</a>
      </div>
      <p className="muted">The classic v1 page is served exactly as it was published, including its own Google Analytics tag.</p>
      {ANALYTICS_ENABLED && (
        <p className="muted">
          This site counts visits with Google Analytics (anonymous page views, no account data). The
          simulation itself runs entirely in your browser; nothing you build is uploaded.
        </p>
      )}
    </div>
  );
}
