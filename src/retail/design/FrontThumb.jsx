import { FrontStyleArt } from './material/FrontStyleGallery.jsx';

// The row and the gallery read the same artwork, including rectangular arch
// blanks, flutes and applied mouldings. Size remains the retail row's token.
export default function FrontThumb({ style, size = null }) {
  return <FrontStyleArt styleId={style} className={size === 'row' ? 'pbi-mini-row' : 'pbi-mini'} />;
}
