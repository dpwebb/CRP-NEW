'use strict';
// Coordinates are PDF points in the original bureau pages. Only blank input areas are used.
const VERSION = '2026-10-09-original-form-v1';
const CANADA_PROVINCES = { AB:'Alberta', BC:'British Columbia', MB:'Manitoba', NB:'New Brunswick', NL:'Newfoundland and Labrador', NS:'Nova Scotia', NT:'Northwest Territories', NU:'Nunavut', ON:'Ontario', PE:'Prince Edward Island', QC:'Quebec', SK:'Saskatchewan', YT:'Yukon' };
function province(value) {
  const text=String(value||'').normalize('NFC').trim().toUpperCase();
  if(CANADA_PROVINCES[text])return text;
  if(text==='QUÉBEC')return 'QC';
  return Object.keys(CANADA_PROVINCES).find(key=>CANADA_PROVINCES[key].toUpperCase()===text)||null;
}
const box = (page, x, y, width, height, cells) => ({ page, x, y, width, height, ...(cells ? { cells } : {}) });
const commonCa = personal => {
  const dx = personal ? 5.65 : 0, dy = personal ? 6.6 : 0;
  return {
    given_name: box(0, 36.24 + dx, 290.4 + dy, 269.4, 21.6, 15),
    middle_name: box(0, 306.5 + dx, 290.4 + dy, 269.3, 21.6, 15),
    family_name: box(0, 36.24 + dx, 246.65 + dy, 459.1, 21.6, 25),
    suffix: box(0, 495.82 + dx, 246.65 + dy, 80, 21.6, 2),
    street_number: box(0, 36.24 + dx, 202.94 + dy, 152.54, 21.6, 10),
    street_name: box(0, 189.26 + dx, 202.94 + dy, 386.6, 21.6, 25),
    address_line2: box(0, 36.24 + dx, 159.26 + dy, 129.74, 21.6, 6),
    city: box(0, 166.58 + dx, 159.26 + dy, 409.27, 21.6, 20),
    region: box(0, 36.24 + dx, 115.58 + dy, 435.94, 21.6, 25),
    postal_code: box(0, 472.66 + dx, 115.58 + dy, 103.2, 21.6, 6),
    date_of_birth: box(0, 36.24 + dx, 55.46 + dy, 152.54, 21.6, 8),
    identity_reference: box(0, 189.26 + dx, 55.46 + dy, 175.01, 21.6, 9),
    phone: box(0, 364.87 + dx, 55.46 + dy, 210.98, 21.6, 10),
    contact_email: box(1, 36.24 + dx, 683.26, 539.62, 21.6, 35)
  };
};

const MAPS = {
  'ca-equifax-account': {
    version: VERSION, mode: 'ORIGINAL_OVERLAY', pages: 5, capacity: 3, name_parts: true,
    profile: commonCa(false), previous_address: box(1, 189.3, 587.0, 386.6, 21.6, 25),
    letter_date: box(4, 317.3, 559.5, 172.6, 28.8, 8),
    slots: [
      { name: box(1, 36.2, 359.6, 269.4, 21.6, 20), account: box(1, 306.2, 359.6, 269.7, 21.6, 16), reason: box(2, 63.5, 594.8, 485.4, 112.1, 30), other: [2, 53.7, 712.2] },
      { name: box(2, 36.2, 524.4, 269.4, 21.6, 20), account: box(2, 306.2, 524.4, 269.7, 21.6, 16), reason: box(2, 63.5, 171.1, 485.4, 112.1, 30), other: [2, 53.7, 288.6] },
      { name: box(3, 36.2, 683.2, 269.4, 21.6, 20), account: box(3, 306.2, 683.2, 269.7, 21.6, 16), reason: box(3, 63.5, 330.1, 485.4, 112.1, 30), other: [3, 53.7, 447.4] }
    ]
  },
  'ca-equifax-personal': {
    version: VERSION, mode: 'ORIGINAL_OVERLAY', pages: 3, capacity: 0, name_parts: true,
    profile: commonCa(true), previous_address: box(1, 194.9, 465.9, 386.6, 21.6, 25),
    letter_date: box(2, 317.3, 423.8, 172.6, 28.8, 8),
    comments: box(2, 42, 620, 528, 75),
    personal_choices: { name: [0, 48, 472], address: [0, 48, 452.4], date_of_birth: [0, 48, 432.8], phone: [0, 328.4, 452.4], identity_reference: [0, 328.4, 472] }
  },
  'ca-equifax-public-record': {
    version: VERSION, mode: 'ORIGINAL_OVERLAY', pages: 3, capacity: 5, name_parts: true,
    profile: {
      given_name: box(0, 31.5, 143.3, 230.5, 13.2, 16), middle_name: box(0, 262.1, 143.3, 325, 13.2, 14),
      family_name: box(0, 31.5, 116.7, 555.5, 16.2, 25), suffix: box(0, 31.5, 82.6, 71.5, 18.5, 2),
      date_of_birth: { ...box(0, 103.0, 82.6, 159, 18.5), date_parts:true }, identity_reference: box(0, 262.1, 82.6, 324.9, 18.5, 9),
      street_number: box(1, 29.5, 682.5, 144.3, 16.5, 9), street_name: box(1, 173.8, 682.5, 414.4, 16.5, 25),
      city: box(1, 29.5, 659, 361.3, 11.8, 20), postal_code: box(1, 390.8, 659, 197.4, 11.8, 6),
      region: box(1, 29.5, 629.1, 558.75, 18.9, 25), contact_email: box(1, 29.5, 492.4, 558.75, 23.6, 30),
      phone: box(2, 37.5, 194, 539, 12.5, 30)
    },
    previous_address: box(1, 173.8, 586.6, 414.4, 16.5, 25), letter_date: { ...box(0, 391.7, 172, 195.3, 19.0), date_parts:true },
    comments: box(2, 39, 366, 532, 63.5),
    update_choice: [0, 41.1, 344.6], record_choices: { collection: [0, 53, 273.2], bankruptcy: [0, 53, 289.8], judgment: [0, 53, 256.5], consolidated: [0, 299.8, 289.8], recovery: [0, 299.8, 273.2] },
    slots: [[1,394.5,327.3],[1,257.5,190.8],[1,125.7,59],[2,656.9,590.2],[2,525.1,458.3]].map(([p,n,a]) => ({name: box(p,36.25,n,538.5,44.6,21), account: box(p,36.25,a,538.5,53.2,21)}))
  },
  'us-equifax': {
    version: VERSION, mode: 'ORIGINAL_OVERLAY', pages: 5, capacity: 12, name_parts: true,
    profile: {
      given_name: box(0,36,616.4,170,19), family_name: box(0,216.9,616.4,211,19), middle_name: box(0,437.4,616.4,49,19), suffix: box(0,500.4,616.4,73,19),
      street_name: box(0,36,578.7,250,19), city: box(0,293.4,578.7,135,19), region: box(0,443,582,40,18),
      postal_code: { ...box(0,498.4,582,79,18,5), positions:[498.4,515,531.6,548.5,564.8].map(x=>[x,582,12.6,18]) },
      identity_reference: { ...box(0,84.2,519.4,150.7,18,9), positions:[84.2,100.5,117.2,137,153.2,172.6,189.2,206.1,222.3].map(x=>[x,519.4,12.6,18]) },
      date_of_birth: { ...box(0,376.4,519.4,134.4,18,8), positions:[376.4,392.9,412.8,429,448.4,465,481.9,498.1].map(x=>[x,519.4,12.6,18]) }
    }, previous_address: box(0,36,542,392,19),
    proof_choices: { SOCIAL_SECURITY: [0,47.5,468.5], SSN_PAY_STUB: [0,47.5,454.9], W2: [0,47.5,441], '1099': [0,47.5,441], DRIVING_LICENCE: [0,306.4,468.5], GOVERNMENT_ID: [0,306.4,468.5], LEASE: [0,306.4,454.9], DEED: [0,306.4,454.9], ADDRESS_PAY_STUB: [0,306.4,441], UTILITY_BILL: [0,306.4,427.5], PHONE_BILL: [0,306.4,427.5] },
    slots: Array.from({length:12},(_,i)=>{
      const p=1+Math.floor(i/3), row=i%3, y=(p===1?630.82:693.36)-row*192.56;
      return {name:box(p,97.5,y+2,221,18),account:box(p,329.4,y+2,246,18),reason:box(p,37,y-84.32,537,19),details:box(p,37,y-131.14,537,29)};
    })
  },
  'ca-transunion': { version: VERSION, mode: 'NATIVE_ACROFORM', pages: 2, capacity: 6, name_parts: true,
    // The original has one text widget above four printed name labels, not four fields.
    name_columns: [
      { key:'family_name', label:'family name', x:51, width:54 },
      { key:'given_name', label:'given name', x:110, width:63 },
      { key:'middle_name', label:'middle name', x:178, width:74 },
      { key:'suffix', label:'suffix', x:257, width:55 }
    ] },
  'us-experian': { version: VERSION, mode: 'NATIVE_ACROFORM', pages: 2, capacity: 3, name_parts: true }
};
module.exports = { VERSION, MAPS, CANADA_PROVINCES, province };
