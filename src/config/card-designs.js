/* =====================================================================
   CARD_DESIGNS — تصاميم بطاقات المناسبات
   ---------------------------------------------------------------------
   عنصر لكل بطاقة. `occasion` يطابق مفاتيح src/config/occasions.js.
   النصوص جاهزة الأسطر: كل \n سطر مستقل داخل البطاقة (لا لفّ تلقائي في SVG).
   القوالب: 'panel' لوحة كاملة | 'band' شريط علوي.
   الخطوط: 'kufi' كوفي هندسي | 'ruqaa' رقعة | 'naskh' نسخ.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CARD_DESIGNS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var list = [
    {
      id: 'national-day-01', occasion: 'national_day', template: 'panel', motif: 'palm', headFont: 'kufi',
      ar: {
        label: 'اليوم الوطني السعودي', head: 'كل عام والوطن بخير', sub: 'اليوم الوطني السعودي', date: '٢٣ سبتمبر',
        wish: 'نرفع أسمى آيات التهنئة لمقام خادم الحرمين الشريفين،\nوسمو ولي عهده الأمين، وللشعب السعودي الكريم.'
      },
      en: {
        label: 'Saudi National Day', head: 'Happy National Day', sub: 'Saudi National Day', date: '23 September',
        wish: 'Our sincere congratulations to the Custodian of the Two Holy\nMosques, the Crown Prince, and the people of Saudi Arabia.'
      },
      pal: { bg: '#06592F', deep: '#02341A', ink: '#FFFFFF', accent: '#D9BC7A', motif: 'rgba(255,255,255,.13)' }
    },
    {
      id: 'national-day-02', occasion: 'national_day', template: 'band', motif: 'sadu', headFont: 'kufi',
      ar: {
        label: 'اليوم الوطني السعودي', head: 'اليوم الوطني السعودي', sub: null, date: '٢٣ سبتمبر',
        wish: 'كل عام والوطن بخير،\nودامت راية التوحيد عالية خفّاقة.'
      },
      en: {
        label: 'Saudi National Day', head: 'Saudi National Day', sub: null, date: '23 September',
        wish: 'Wishing our nation continued pride,\nunity and prosperity.'
      },
      pal: { bg: '#F4F6F3', deep: '#EBEFE9', ink: '#0B3B22', accent: '#06592F', motif: 'rgba(255,255,255,.20)', band: '#06592F', bandInk: '#FFFFFF' }
    },

    {
      id: 'founding-day-01', occasion: 'founding_day', template: 'panel', motif: 'najdi', headFont: 'kufi',
      ar: {
        label: 'يوم التأسيس', head: 'يوم التأسيس', sub: 'امتدادٌ لثلاثة قرون', date: '٢٢ فبراير',
        wish: 'من جذورٍ راسخة في قلب الجزيرة،\nنستلهم عزيمةً لا تلين وبناءً لا يتوقف.'
      },
      en: {
        label: 'Founding Day', head: 'Founding Day', sub: 'Three centuries of heritage', date: '22 February',
        wish: 'From deep roots in the heart of the Peninsula,\nwe draw resolve that does not waver.'
      },
      pal: { bg: '#5C3520', deep: '#331B0F', ink: '#F6EADA', accent: '#D2A566', motif: 'rgba(246,234,218,.14)' }
    },
    {
      id: 'founding-day-02', occasion: 'founding_day', template: 'band', motif: 'najdiWindow', headFont: 'kufi',
      ar: {
        label: 'يوم التأسيس', head: 'امتدادٌ لثلاثة قرون', sub: null, date: '٢٢ فبراير',
        wish: 'ذكرى تأسيس الدولة السعودية الأولى؛\nبدايةٌ صنعت وطنًا، وإرثٌ نمضي به قُدُمًا.'
      },
      en: {
        label: 'Founding Day', head: 'Three centuries on', sub: null, date: '22 February',
        wish: 'Marking the founding of the First Saudi State —\na beginning that built a nation.'
      },
      pal: { bg: '#F5EADA', deep: '#EEDFC9', ink: '#4A2716', accent: '#8A5230', motif: 'rgba(245,234,218,.22)', band: '#7A462B', bandInk: '#F6EADA' }
    },

    {
      id: 'ramadan-01', occasion: 'ramadan', template: 'panel', motif: 'crescent', headFont: 'ruqaa',
      ar: {
        label: 'شهر رمضان المبارك', head: 'رمضان مبارك', sub: 'تقبّل الله منّا ومنكم الصيام والقيام', date: null,
        wish: 'أعاده الله علينا وعليكم\nباليُمن والبركات.'
      },
      en: {
        label: 'Ramadan', head: 'Ramadan Mubarak', sub: 'May your fasting and prayers be accepted', date: null,
        wish: 'Wishing you and your family\na blessed and peaceful month.'
      },
      pal: { bg: '#0C1A3C', deep: '#04091C', ink: '#FFFFFF', accent: '#E3BE6B', motif: 'rgba(227,190,107,.20)' }
    },
    {
      id: 'ramadan-02', occasion: 'ramadan', template: 'band', motif: 'girih', headFont: 'ruqaa',
      ar: {
        label: 'شهر رمضان المبارك', head: 'رمضان كريم', sub: null, date: null,
        wish: 'نسأل الله أن يجعله شهر خيرٍ وبركة\nعليكم وعلى أعمالكم.'
      },
      en: {
        label: 'Ramadan', head: 'Ramadan Kareem', sub: null, date: null,
        wish: 'May this month bring goodness and blessing\nto you and your work.'
      },
      pal: { bg: '#FBF5E8', deep: '#F3EAD7', ink: '#12324F', accent: '#B98A33', motif: 'rgba(251,245,232,.18)', band: '#0F2E4C', bandInk: '#F7ECD5' }
    },

    {
      id: 'eid-fitr-01', occasion: 'eid_fitr', template: 'panel', motif: 'arch', headFont: 'ruqaa',
      ar: {
        label: 'عيد الفطر المبارك', head: 'عيد فطر مبارك', sub: 'تقبّل الله منّا ومنكم صالح الأعمال', date: null,
        wish: 'أعاده الله عليكم بالصحة والسعادة،\nوعلى أعمالكم بالنماء والتوفيق.'
      },
      en: {
        label: 'Eid al-Fitr', head: 'Eid al-Fitr Mubarak', sub: 'May your good deeds be accepted', date: null,
        wish: 'Wishing you health and happiness,\nand continued success in your work.'
      },
      pal: { bg: '#FCF7EE', deep: '#F4EADA', ink: '#0F5340', accent: '#C79B44', motif: 'rgba(15,83,64,.10)' }
    },
    {
      id: 'eid-fitr-02', occasion: 'eid_fitr', template: 'band', motif: 'mashrabiya', headFont: 'ruqaa',
      ar: {
        label: 'عيد الفطر المبارك', head: 'عيدكم مبارك', sub: null, date: null,
        wish: 'كل عامٍ وأنتم بخير،\nوتقبّل الله منّا ومنكم صالح الأعمال.'
      },
      en: {
        label: 'Eid al-Fitr', head: 'Eid Mubarak', sub: null, date: null,
        wish: 'Warmest wishes to you and your team\non this blessed occasion.'
      },
      pal: { bg: '#F6F2E9', deep: '#EDE6D8', ink: '#0B4534', accent: '#0E5240', motif: 'rgba(232,200,124,.30)', band: '#0E5240', bandInk: '#F7EFDD' }
    },

    {
      id: 'eid-adha-01', occasion: 'eid_adha', template: 'panel', motif: 'arches', headFont: 'ruqaa',
      ar: {
        label: 'عيد الأضحى المبارك', head: 'عيد أضحى مبارك', sub: 'تقبّل الله منّا ومنكم صالح الأعمال', date: null,
        wish: 'وحجًّا مبرورًا، وسعيًا مشكورًا،\nوذنبًا مغفورًا.'
      },
      en: {
        label: 'Eid al-Adha', head: 'Eid al-Adha Mubarak', sub: 'May your good deeds be accepted', date: null,
        wish: 'Wishing pilgrims an accepted Hajj,\nand you a blessed Eid.'
      },
      pal: { bg: '#12402C', deep: '#08251A', ink: '#F8F3E6', accent: '#D6B26A', motif: 'rgba(214,178,106,.18)' }
    },
    {
      id: 'eid-adha-02', occasion: 'eid_adha', template: 'band', motif: 'girihSand', headFont: 'ruqaa',
      ar: {
        label: 'عيد الأضحى المبارك', head: 'عيدكم مبارك', sub: null, date: null,
        wish: 'أعاده الله عليكم وعلى أعمالكم\nبالخير واليُمن والبركات.'
      },
      en: {
        label: 'Eid al-Adha', head: 'Eid Mubarak', sub: null, date: null,
        wish: 'Wishing you and your business\ngoodness and prosperity.'
      },
      pal: { bg: '#F3EADA', deep: '#EADDC7', ink: '#173D2B', accent: '#A87F35', motif: 'rgba(243,234,218,.20)', band: '#173D2B', bandInk: '#F3EADA' }
    }
  ];

  var byId = {};
  list.forEach(function (d) { byId[d.id] = d; });

  return {
    list: list,
    get: function (id) { return byId[id] || null; },
    forOccasion: function (key) { return list.filter(function (d) { return d.occasion === key; }); },
    /* المناسبات التي لها تصاميم جاهزة */
    occasions: list.reduce(function (acc, d) { if (acc.indexOf(d.occasion) < 0) acc.push(d.occasion); return acc; }, []),
    label: function (id, lang) {
      var d = byId[id]; if (!d) return id;
      var c = d[lang === 'en' ? 'en' : 'ar'];
      var n = d.id.slice(-2) === '01' ? 1 : 2;
      return c.label + ' — ' + (lang === 'en' ? 'design ' + n : 'تصميم ' + n);
    }
  };
}));
