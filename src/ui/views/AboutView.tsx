import { useState } from 'react';
import { ANALYTICS_ENABLED } from '../../analytics';
import { Rich } from '../components/Rich';
import { Tabs } from '../components/Tabs';
import { useMessages } from '../context';

const REPOSITORY_URL = 'https://github.com/andrenepomuceno/particle.js';

const TABS = ['about', 'guide'] as const;
type Tab = (typeof TABS)[number];

export function AboutView() {
  const { about: t } = useMessages();
  const [tab, setTab] = useState<Tab>('about');
  return (
    <div className="stack">
      <Tabs tabs={TABS} labels={t.tabs} value={tab} onChange={setTab} />
      {tab === 'about' ? <AboutTab /> : <QuickGuide />}
    </div>
  );
}

function QuickGuide() {
  const { about: t } = useMessages();
  return (
    <div className="about">
      {t.guide.map((section) => (
        <section key={section.title}>
          <h3 className="section-title">{section.title}</h3>
          <ul>
            {section.items.map((item) => <li key={item}><Rich text={item} /></li>)}
          </ul>
        </section>
      ))}
      <p className="muted"><Rich text={t.guideFooter} /></p>
    </div>
  );
}

function AboutTab() {
  const { about: t } = useMessages();
  return (
    <div className="about">
      <p><Rich text={t.intro} /></p>
      <h3 className="section-title">{t.gettingStarted}</h3>
      <ul>
        {t.steps.map((step) => <li key={step}><Rich text={step} /></li>)}
      </ul>
      <div className="keys">
        <span>{t.version}</span><span>{__APP_VERSION__}</span>
        <span>{t.license}</span><span>GPL-3.0</span>
        <span>{t.source}</span><a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">{REPOSITORY_URL.replace('https://', '')}</a>
        <span>{t.classic}</span><a href="v1/index.html" target="_blank" rel="noopener" title={t.classicTitle}>{t.classicLink}</a>
      </div>
      <p className="muted">{t.classicNote}</p>
      {ANALYTICS_ENABLED && <p className="muted">{t.analytics}</p>}
    </div>
  );
}
