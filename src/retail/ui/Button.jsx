/**
 * THE TWO BUTTONS, AND THERE ARE ONLY TWO (F2).
 *
 * Primary: bg Onyx, text Porcelain, border Onyx, hover Graphite, focus 2px
 * Champagne, 50px, radius 0. Secondary: transparent, text Onyx, 1px Deep Gold
 * border, hover Champagne ground. The rules live in base.css; this file only
 * decides which of the two a caller gets, and renders an <a> when the thing is
 * really a link so the browser keeps its own behaviours.
 */
export default function Button({
  kind = 'primary', href, onClick, disabled = false, children, style, title, type = 'button', ...rest
}) {
  const className = `pbi-btn pbi-btn-${kind === 'secondary' ? 'secondary' : 'primary'}`;
  if (href && !disabled) {
    return (
      <a className={className} href={href} style={style} title={title} {...rest}>{children}</a>
    );
  }
  return (
    <button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title}
      {...rest}
    >
      {children}
    </button>
  );
}
