const REPOSITORY_URL = 'https://github.com/andrenepomuceno/particle.js';

export function AboutView() {
  return (
    <div className="about">
      <p>
        <b>particle.js</b> is a classical n-body simulator that runs in your browser. The forces and
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
        <span>License</span><span>see the repository</span>
        <span>Source</span><a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">{REPOSITORY_URL.replace('https://', '')}</a>
      </div>
    </div>
  );
}
