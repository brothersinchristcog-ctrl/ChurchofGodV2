// Data extracted from stitchCelebrationsHtml.ts

export const TODAY = new Date(); // Current date

export interface Category {
  key: string;
  label: string;
  icon: string;
  grad: readonly [string, string, ...string[]];
  tint: string;
}

export const CATEGORIES: Category[] = [
  { key: 'birthday', label: 'Birthday', icon: 'cake', grad: ['#E7C767', '#BE9A3A'], tint: 'rgba(190,154,58,0.10)' },
  { key: 'wedding', label: 'Wedding Anniversary', icon: 'rings', grad: ['#5A6BC4', '#37469B'], tint: 'rgba(55,70,155,0.08)' },
  { key: 'baptism', label: 'Baptism Anniversary', icon: 'cross', grad: ['#4FA6A6', '#2E7A7A'], tint: 'rgba(46,122,122,0.08)' },
];

export interface Member {
  id: string;
  category: string;
  name: string;
  month: number;
  day: number;
  refYear: number;
  ministry: string;
  family: string;
  phone: string;
}

import SalesforceService from '../../services/SalesforceService';

export async function fetchCelebrations(): Promise<Member[]> {
  const sf = SalesforceService;
  const rawData = await sf.getAllCelebrations();
  
  const members: Member[] = [];
  let idCounter = 1;

  for (const contact of rawData) {
    const processDate = (dateStr: string | null | undefined, cat: string) => {
      if (!dateStr) return;
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        members.push({
          id: `c_${idCounter++}`,
          category: cat,
          name: contact.Name || 'Unknown',
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10),
          refYear: parseInt(parts[0], 10),
          ministry: 'General', // Default since Ministry isn't currently fetched in this query
          family: 'Family',
          phone: contact.Phone || contact.MobilePhone || '',
        });
      }
    };

    processDate(contact.Birthdate, 'birthday');
    processDate(contact.Anniversary_Date__c, 'wedding');
    processDate(contact.Date_of_Baptism__c, 'baptism');
  }

  return members;
}

export const VERSES: Record<string, { ref: string; text: string }[]> = {
  birthday: [
    { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
    { ref: 'Psalm 20:4', text: 'Grant thee according to thine own heart, and fulfil all thy counsel.' },
    { ref: 'Numbers 6:24–26', text: 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.' },
    { ref: 'Psalm 37:4', text: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.' },
    { ref: 'Proverbs 3:5–6', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
    { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
    { ref: 'Psalm 118:24', text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
    { ref: 'James 1:17', text: 'Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning.' },
    { ref: 'Psalm 91:11', text: 'For he shall give his angels charge over thee, to keep thee in all thy ways.' },
    { ref: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
    { ref: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
    { ref: 'Psalm 23:1–3', text: 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.' },
    { ref: 'Lamentations 3:22–23', text: 'It is of the LORD\'S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.' },
    { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
    { ref: 'Psalm 121:1–2', text: 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.' },
    { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
    { ref: 'Proverbs 16:3', text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
    { ref: 'Psalm 16:11', text: 'Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.' },
    { ref: 'Ephesians 2:10', text: 'For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.' },
    { ref: 'Psalm 139:13–14', text: 'For thou hast possessed my reins: thou hast covered me in my mother\'s womb. I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.' },
    { ref: 'Deuteronomy 31:8', text: 'And the LORD, he it is that doth go before thee; he will be with thee, he will not fail thee, neither forsake thee: fear not, neither be dismayed.' },
    { ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
    { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
    { ref: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
    { ref: '3 John 1:2', text: 'Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.' },
    { ref: 'Psalm 65:11', text: 'Thou crownest the year with thy goodness; and thy paths drop fatness.' },
    { ref: 'Colossians 3:15', text: 'And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.' },
    { ref: 'Hebrews 13:8', text: 'Jesus Christ the same yesterday, and to day, and for ever.' },
    { ref: '1 Thessalonians 5:16–18', text: 'Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
    { ref: '2 Corinthians 9:8', text: 'And God is able to make all grace abound toward you; that ye, always having all sufficiency in all things, may abound to every good work.' },
  ],
  wedding: [
    { ref: 'Genesis 2:24', text: 'Therefore shall a man leave his father and his mother, and shall cleave unto his wife: and they shall be one flesh.' },
    { ref: 'Mark 10:9', text: 'What therefore God hath joined together, let not man put asunder.' },
    { ref: 'Matthew 19:6', text: 'Wherefore they are no more twain, but one flesh. What therefore God hath joined together, let not man put asunder.' },
    { ref: 'Ephesians 5:25', text: 'Husbands, love your wives, even as Christ also loved the church.' },
    { ref: 'Colossians 3:14', text: 'And above all these things put on charity, which is the bond of perfectness.' },
    { ref: '1 Peter 4:8', text: 'Above all things have fervent charity among yourselves.' },
    { ref: 'Romans 12:10', text: 'Be kindly affectioned one to another with brotherly love.' },
    { ref: 'John 15:12', text: 'Love one another, as I have loved you.' },
    { ref: '1 John 4:19', text: 'We love him, because he first loved us.' },
    { ref: '1 John 4:7', text: 'Beloved, let us love one another: for love is of God.' },
    { ref: 'Proverbs 18:22', text: 'Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD.' },
    { ref: 'Hebrews 13:4', text: 'Marriage is honourable in all.' },
    { ref: 'Romans 13:10', text: 'Love worketh no ill to his neighbour.' },
    { ref: 'Galatians 5:22', text: 'The fruit of the Spirit is love, joy, peace.' },
    { ref: 'Ephesians 4:2', text: 'Forbearing one another in love.' },
    { ref: 'Philippians 2:2', text: 'Be likeminded, having the same love.' },
    { ref: 'Colossians 3:13', text: 'Forgiving one another, even as Christ forgave you.' },
    { ref: 'Ecclesiastes 4:9', text: 'Two are better than one.' },
    { ref: 'Ecclesiastes 4:12', text: 'A threefold cord is not quickly broken.' },
    { ref: 'Psalm 127:1', text: 'Except the LORD build the house, they labour in vain that build it.' },
    { ref: 'Song of Solomon 8:7', text: 'Many waters cannot quench love.' },
    { ref: 'Song of Solomon 2:16', text: 'My beloved is mine, and I am his.' },
    { ref: 'Proverbs 3:3', text: 'Let not mercy and truth forsake thee.' },
    { ref: 'Psalm 128:1', text: 'Blessed is every one that feareth the LORD.' },
    { ref: 'Joshua 24:15', text: 'As for me and my house, we will serve the LORD.' },
    { ref: '1 Corinthians 13:8', text: 'Charity never faileth.' },
    { ref: 'Romans 15:5', text: 'Be likeminded one toward another.' },
    { ref: 'Colossians 3:15', text: 'Let the peace of God rule in your hearts.' },
    { ref: 'Psalm 143:8', text: 'Cause me to know the way wherein I should walk.' },
    { ref: 'Psalm 85:10', text: 'Mercy and truth are met together; righteousness and peace have kissed each other.' },
  ],
  baptism: [
    { ref: 'Matthew 28:19', text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.' },
    { ref: 'Mark 16:16', text: 'He that believeth and is baptized shall be saved; but he that believeth not shall be damned.' },
    { ref: 'Acts 2:38', text: 'Repent, and be baptized every one of you in the name of Jesus Christ for the remission of sins, and ye shall receive the gift of the Holy Ghost.' },
    { ref: 'Acts 22:16', text: 'And now why tarriest thou? arise, and be baptized, and wash away thy sins, calling on the name of the Lord.' },
    { ref: 'Romans 6:4', text: 'Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead... even so we also should walk in newness of life.' },
    { ref: 'Galatians 3:27', text: 'For as many of you as have been baptized into Christ have put on Christ.' },
    { ref: 'Colossians 2:12', text: 'Buried with him in baptism, wherein also ye are risen with him through the faith of the operation of God.' },
    { ref: '2 Corinthians 5:17', text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
    { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
    { ref: 'John 1:12', text: 'But as many as received him, to them gave he power to become the sons of God.' },
    { ref: 'Romans 8:1', text: 'There is therefore now no condemnation to them which are in Christ Jesus.' },
    { ref: 'Romans 8:14', text: 'For as many as are led by the Spirit of God, they are the sons of God.' },
    { ref: 'Titus 3:5', text: 'Not by works of righteousness which we have done, but according to his mercy he saved us.' },
    { ref: '1 Peter 3:21', text: 'The like figure whereunto even baptism doth also now save us... by the resurrection of Jesus Christ.' },
    { ref: 'Matthew 3:17', text: 'This is my beloved Son, in whom I am well pleased.' },
    { ref: 'Isaiah 43:1', text: 'Fear not: for I have redeemed thee, I have called thee by thy name; thou art mine.' },
    { ref: 'Ezekiel 36:26', text: 'A new heart also will I give you, and a new spirit will I put within you.' },
    { ref: 'Philippians 1:6', text: 'He which hath begun a good work in you will perform it until the day of Jesus Christ.' },
    { ref: 'Hebrews 10:22', text: 'Let us draw near with a true heart in full assurance of faith.' },
    { ref: 'Acts 8:36', text: 'See, here is water; what doth hinder me to be baptized?' },
    { ref: 'Acts 10:47', text: 'Can any man forbid water, that these should not be baptized?' },
    { ref: 'Luke 3:22', text: 'Thou art my beloved Son; in thee I am well pleased.' },
    { ref: 'Ephesians 2:8', text: 'For by grace are ye saved through faith.' },
    { ref: 'Colossians 3:1', text: 'If ye then be risen with Christ, seek those things which are above.' },
    { ref: '1 John 5:11', text: 'And this is the record, that God hath given to us eternal life, and this life is in his Son.' },
    { ref: 'Revelation 21:5', text: 'Behold, I make all things new.' },
    { ref: '2 Timothy 1:9', text: 'Who hath saved us, and called us with an holy calling.' },
    { ref: 'Romans 10:9', text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
    { ref: 'Psalm 51:10', text: 'Create in me a clean heart, O God; and renew a right spirit within me.' },
    { ref: '1 John 1:7', text: 'The blood of Jesus Christ his Son cleanseth us from all sin.' },
  ],
};

export const THEMES: { key: string; name: string; c: readonly [string, string, ...string[]]; bgImage?: string }[] = [
  { key: 'floral', name: 'Floral Celebration', c: ['#E7C767', '#BE9A3A'] },
  { key: 'golden', name: 'Golden Blessings', c: ['#F3D98B', '#B4842A'] },
  { key: 'royal', name: 'Royal Blue', c: ['#5A6BC4', '#1E2A63'] },
  { key: 'worship', name: 'Church Worship', c: ['#8A6FBF', '#3D2C6B'] },
  { key: 'white', name: 'Elegant White', c: ['#FDFBF6', '#E4DAC2'] },
  { key: 'balloons', name: 'Balloons', c: ['#F09A9A', '#E7C767'] },
  { key: 'minimal', name: 'Minimal Modern', c: ['#DCD6C8', '#9C9483'] },
  { key: 'cross', name: 'Cross & Bible', c: ['#4FA6A6', '#1E2A63'] },
  { key: 'family', name: 'Family Celebration', c: ['#E39A6B', '#BE9A3A'] },
  { key: 'children', name: "Children's Theme", c: ['#7BC9E0', '#F3D98B'] },
];

export const AVATAR_PALETTES: (readonly [string, string])[] = [
  ['#37469B', '#5A6BC4'], ['#BE9A3A', '#E7C767'], ['#7D3F63', '#B96D8E'],
  ['#2E7A7A', '#4FA6A6'], ['#8A6FBF', '#B79BE0'], ['#C4794A', '#E3A16E'],
];

export function occurrenceThisYear(m: Member) {
  return new Date(TODAY.getFullYear(), m.month - 1, m.day);
}

export function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function nextOccurrence(m: Member) {
  let d = occurrenceThisYear(m);
  if (d < stripTime(TODAY)) d = new Date(TODAY.getFullYear() + 1, m.month - 1, m.day);
  return d;
}

export function daysUntil(m: Member) {
  const diff = nextOccurrence(m).getTime() - stripTime(TODAY).getTime();
  return Math.round(diff / 86400000);
}

export function isToday(m: Member) {
  return m.month === TODAY.getMonth() + 1 && m.day === TODAY.getDate();
}

export function isPastThisYear(m: Member) {
  return occurrenceThisYear(m) < stripTime(TODAY) && !isToday(m);
}

export function isThisWeek(m: Member) {
  const d = daysUntil(m);
  return d >= 0 && d <= 7;
}

export function isThisMonth(m: Member) {
  return m.month === TODAY.getMonth() + 1;
}

export function formatDate(m: Member) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m.month - 1]} ${m.day}`;
}

export function yearsLabel(cat: string, refYear: number) {
  if (cat === 'birthday') return `${TODAY.getFullYear() - refYear} yrs`;
  return `${TODAY.getFullYear() - refYear} yrs together`;
}

export function initials(name: string) {
  const clean = name.split('&')[0].trim();
  const parts = clean.split(' ');
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length];
}

export function catMeta(key: string) {
  return CATEGORIES.find(c => c.key === key);
}

export function uniqueValues(list: any[], field: keyof Member) {
  return [...new Set(list.map(m => m[field]))].sort();
}
