/** Toggle do menu mobile (badge de 3 linhas). */
export function initSiteNav(nav: HTMLElement): () => void {
  const toggle = nav.querySelector<HTMLButtonElement>('.site-nav__toggle');
  const panel = nav.querySelector<HTMLElement>('.site-nav__panel');
  const links = nav.querySelectorAll<HTMLAnchorElement>('.site-nav__links a');

  if (!toggle || !panel) return () => {};

  const setOpen = (open: boolean) => {
    nav.classList.toggle('site-nav--open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };

  const onToggle = (event: Event) => {
    event.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false);
  };

  const onLinkClick = () => setOpen(false);

  const onOutside = (event: MouseEvent) => {
    if (!nav.contains(event.target as Node)) setOpen(false);
  };

  toggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('click', onOutside);
  for (const link of links) link.addEventListener('click', onLinkClick);

  return () => {
    toggle.removeEventListener('click', onToggle);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('click', onOutside);
    for (const link of links) link.removeEventListener('click', onLinkClick);
  };
}
