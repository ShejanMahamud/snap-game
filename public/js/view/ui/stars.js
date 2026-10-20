/* View: star icons. */


const STAR_P='M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z';
export function starSvg(on){return '<svg viewBox="0 0 24 24" class="'+(on?'on':'')+'" aria-hidden="true"><path d="'+STAR_P+'"/></svg>'}
export function starsHtml(n){return starSvg(n>0)+starSvg(n>1)+starSvg(n>2)}
