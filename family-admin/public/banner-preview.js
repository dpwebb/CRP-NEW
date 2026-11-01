(function () {
  'use strict';
  const approved = [{"id":"banner-01","width":2172,"height":724,"bytes":1924979,"sha256":"81dd16f34dcacdb3a8a3cdcad89d67044cf84283a65fe2eac18d3f2dbe92e523","path":"/approved-banners-2026-10-23/banner-01.png","label":"Banner 01"},{"id":"banner-02","width":2172,"height":724,"bytes":1843576,"sha256":"821392a1e334787c86b8c7e7f3da6b71184728c8a7f48d1b8645934d25732c7c","path":"/approved-banners-2026-10-23/banner-02.png","label":"Banner 02"},{"id":"banner-03","width":1374,"height":1145,"bytes":1789775,"sha256":"4da48417f0bc60d13d188863d4ed029e7473cd30c7e484ca0d31e487c9d29314","path":"/approved-banners-2026-10-23/banner-03.png","label":"Banner 03"},{"id":"banner-04","width":1374,"height":1145,"bytes":1969454,"sha256":"b1ce5454ed0a1ade01e477e24fa5abbd707fa1ab29b1e0b3033afd05279779f1","path":"/approved-banners-2026-10-23/banner-04.png","label":"Banner 04"},{"id":"banner-05","width":724,"height":2172,"bytes":1827836,"sha256":"687182d7f537eea7601047b5f8acc7e37a1c6d81539d0915b233acf322da991d","path":"/approved-banners-2026-10-23/banner-05.png","label":"Banner 05"},{"id":"banner-06","width":724,"height":2172,"bytes":1979519,"sha256":"149791ceb3c37d778b53138904b972c57285a0081273607ebceae3a95dfb52d5","path":"/approved-banners-2026-10-23/banner-06.png","label":"Banner 06"},{"id":"banner-07","width":2164,"height":727,"bytes":1803339,"sha256":"74527e44a199a27c3e1290fa005e56df214ed21ff2492dade0b22717f085cdb0","path":"/approved-banners-2026-10-23/banner-07.png","label":"Banner 07"},{"id":"banner-08","width":2172,"height":724,"bytes":1689721,"sha256":"bc479bed7e19ba993f7365ed98553311154ab9c4207723e2f18b241ac28bd831","path":"/approved-banners-2026-10-23/banner-08.png","label":"Banner 08"},{"id":"banner-09","width":1254,"height":1254,"bytes":1850828,"sha256":"10764ee781db50fd5c59c7cc1774e724fef75e46209ad1392bb6d30e76c753a6","path":"/approved-banners-2026-10-23/banner-09.png","label":"Banner 09"},{"id":"banner-10","width":1254,"height":1254,"bytes":1802713,"sha256":"927c1e2df558565571f1d0112a29cadc0bf57a8fcfd48c41c03d5988c287010d","path":"/approved-banners-2026-10-23/banner-10.png","label":"Banner 10"}];
  function validate(brief) {
    if (!brief || !['CA','US','GB','AU'].includes(brief.country) || !Array.isArray(brief.banners)) return null;
    let destination;
    try { destination = new URL(brief.referralUrl); } catch { return null; }
    if (!['https://affiliates.creditregulatorpro.com','https://affiliates-staging.creditregulatorpro.com'].includes(destination.origin) || !/^\/r\/[A-Za-z0-9-]+$/.test(destination.pathname) || destination.search || destination.hash || destination.username || destination.password) return null;
    const banners = brief.banners.flatMap(item => {
      const asset = approved.find(a => a.id === item?.id);
      if (!asset || item.sha256 !== asset.sha256 || item.width !== asset.width || item.height !== asset.height || item.referralUrl !== destination.href || item.url !== destination.origin + asset.path || typeof item.websiteHtml !== 'string' || item.websiteHtml.length > 32768) return [];
      return [{...asset, websiteHtml:item.websiteHtml}];
    });
    return banners.length ? {country:brief.country, currency:{CA:'CAD',US:'USD',GB:'GBP',AU:'AUD'}[brief.country], referralUrl:destination.href, banners,
      disclosure:typeof brief.publishing?.disclosure==='string'?brief.publishing.disclosure:'Advertising disclosure: the publisher may earn a commission from qualifying purchases.'} : null;
  }
  const node = (tag,text) => { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e; };
  function render(value) {
    const brief=validate(value);if(!brief)return null;
    const root=node('section');root.className='campaign-banner-preview';root.setAttribute('aria-label','Approved campaign banner content');
    root.append(node('h3','Approved campaign banners'),node('p',brief.country+' · '+brief.currency),node('p',brief.disclosure));
    const destination=node('a','Campaign destination');destination.href=brief.referralUrl;destination.target='_blank';destination.rel='noopener noreferrer';root.append(destination,node('p','Previewing artwork does not publish a placement or record a referral click. Existing approvals and holds still apply.'));
    const grid=node('div');grid.className='campaign-banner-grid';root.append(grid);
    for(const banner of brief.banners){
      const card=node('article');card.append(node('h4',banner.label+' · '+banner.width+' × '+banner.height));
      const image=node('img');image.src=banner.path;image.alt=banner.label+' — Credit Regulator Pro';image.width=banner.width;image.height=banner.height;image.loading='lazy';image.decoding='async';card.append(image);
      const download=node('a','Download original PNG');download.href=banner.path;download.download=banner.id+'.png';card.append(download);
      const label=node('label','Campaign HTML with disclosure'),copy=node('textarea');copy.readOnly=true;copy.rows=5;copy.value=banner.websiteHtml;label.append(copy);card.append(label);grid.append(card);
    }
    return root;
  }
  window.CRPAffiliateBannerPreview=Object.freeze({validate,render});
})();
