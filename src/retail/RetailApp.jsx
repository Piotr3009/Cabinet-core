import Header from './ui/Header.jsx';
import Footer from './ui/Footer.jsx';
import LandingPage from './site/LandingPage.jsx';
import CollectionsPage from './site/CollectionsPage.jsx';
import ContactPage from './site/ContactPage.jsx';
import CopyPage from './site/CopyPage.jsx';
import DesignRoom from './design/DesignRoom.jsx';
import { useHashRoute } from './site/router.js';

// ─── PRIME BESPOKE INTERIORS ───────────────────────────────────────────────
//
// Eight routes, one header, one footer, and a design room that takes the whole
// window under a 60-px header (F2: *"Inside the design room the header shrinks
// to 60px (same content)"*).
//
// The footer is on every page EXCEPT the design room: a page whose whole point
// is a full-height 3-D stage cannot also scroll to a footer, and a client who
// is designing is not looking for the legal line.

export default function RetailApp() {
  const { path, query } = useHashRoute();
  const inRoom = path === '/design';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header path={path} compact={inRoom} />

      {inRoom ? <DesignRoom collection={query.collection} /> : null}
      {path === '/' ? <LandingPage /> : null}
      {path === '/collections' ? <CollectionsPage /> : null}
      {path === '/contact' ? <ContactPage /> : null}
      {['/materials', '/design-process', '/about', '/journal'].includes(path)
        ? <CopyPage path={path} /> : null}

      {inRoom ? null : <Footer />}
    </div>
  );
}
