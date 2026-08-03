// Data extracted from stitchCelebrationsHtml.ts

export const getToday = () => new Date(); // Current date, evaluated dynamically

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
  photoUrl?: string;
}

import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SalesforceService from '../../services/SalesforceService';

export async function fetchCelebrations(forceRefresh = false): Promise<Member[]> {
  const CACHE_KEY = 'cog_admin_celebs_cache_v2';
  
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        // Cache for 2 hours (7200000 ms)
        if (Date.now() - timestamp < 7200000) {
          return data;
        }
      }
    } catch (e) {}
  }

  const sf = SalesforceService;
  const rawData = await sf.getAllCelebrations();
  
  let userPhotos: Record<string, string> = {};
  const PHOTOS_CACHE_KEY = 'cog_admin_user_photos_cache';
  let photosLoaded = false;

  try {
    const cachedPhotosStr = await AsyncStorage.getItem(PHOTOS_CACHE_KEY);
    if (cachedPhotosStr) {
      const cachedPhotos = JSON.parse(cachedPhotosStr);
      // Cache photos for 24 hours
      if (Date.now() - cachedPhotos.timestamp < 86400000) {
        userPhotos = cachedPhotos.data;
        photosLoaded = true;
      }
    }
  } catch (e) {}

  if (!photosLoaded) {
    try {
      const usersSnap = await firestore().collection('users').get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.photoURL) {
          if (data.phone) {
            const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);
            userPhotos[cleanPhone] = data.photoURL;
          }
          if (data.sfContactId) {
            userPhotos[data.sfContactId] = data.photoURL;
          }
        }
      });
      console.log(`Fetched ${Object.keys(userPhotos).length} user photos from Firestore.`);
      await AsyncStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: userPhotos }));
    } catch (e) {
      console.log('Error fetching user photos:', e);
    }
  }

  const members: Member[] = [];
  let idCounter = 1;
  let matchedCount = 0;

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
          phone: contact.MobilePhone || contact.Phone || '',
        });

        // Try to attach photo
        const cleanPhone = members[members.length - 1].phone.replace(/[^0-9]/g, '').slice(-10);
        if (cleanPhone && userPhotos[cleanPhone]) {
          members[members.length - 1].photoUrl = userPhotos[cleanPhone];
          matchedCount++;
        } else if (contact.Id && userPhotos[contact.Id]) {
          members[members.length - 1].photoUrl = userPhotos[contact.Id];
          matchedCount++;
        }
      }
    };

    processDate(contact.Birthdate, 'birthday');
    processDate(contact.Anniversary_Date__c, 'wedding');
    processDate(contact.Date_of_Baptism__c, 'baptism');
  }

  console.log(`Matched ${matchedCount} photos to members.`);
  
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: members }));
  } catch (e) {}

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

export const VERSES_TELUGU: Record<string, { ref: string; text: string }[]> = {
  birthday: [
    { ref: 'సంఖ్యాకాండము 6:24', text: 'యెహోవా నిన్ను ఆశీర్వదించి నిన్ను కాపాడును.' },
    { ref: 'సంఖ్యాకాండము 6:25', text: 'యెహోవా తన ముఖకాంతిని నీ మీద ప్రకాశింపజేసి నీ మీద కృప చూపును.' },
    { ref: 'కీర్తన 118:24', text: 'ఈ దినము యెహోవా ఏర్పరచినది; దీనియందు మనము సంతోషించి ఆనందింతుము.' },
    { ref: 'సామెతలు 3:5', text: 'నీ పూర్ణహృదయముతో యెహోవాను నమ్ముకొనుము.' },
    { ref: 'సామెతలు 3:6', text: 'నీ మార్గములన్నిటిలో ఆయనను స్మరించుము; అప్పుడు ఆయన నీ త్రోవలను సరిచేయును.' },
    { ref: 'కీర్తన 37:4', text: 'యెహోవాలో ఆనందించుము; ఆయన నీ హృదయ వాంఛలను నెరవేర్చును.' },
    { ref: 'కీర్తన 37:5', text: 'నీ కార్యములన్నియు యెహోవాకు అప్పగించుము.' },
    { ref: 'కీర్తన 20:4', text: 'ఆయన నీ హృదయ కోరికలను నెరవేర్చును.' },
    { ref: 'కీర్తన 23:1', text: 'యెహోవా నా కాపరి; నాకు కొదువలేదు.' },
    { ref: 'కీర్తన 34:8', text: 'యెహోవా మేలైనవాడు; ఆయనను ఆశ్రయించువాడు ధన్యుడు.' },
    { ref: 'నెహెమ్యా 8:10', text: 'యెహోవానందమే మీ బలము.' },
    { ref: 'యెషయా 41:10', text: 'భయపడకుము, నేను నీకు తోడై యున్నాను.' },
    { ref: 'యెషయా 41:10', text: 'నేను నిన్ను బలపరచెదను; నీకు సహాయము చేసెదను.' },
    { ref: 'ఫిలిప్పీయులకు 4:13', text: 'క్రీస్తు నన్ను బలపరచుచున్నందున నేను సమస్తమును చేయగలను.' },
    { ref: 'ఫిలిప్పీయులకు 4:19', text: 'నా దేవుడు మీ ప్రతి అవసరమును తీర్చును.' },
    { ref: 'యాకోబు 1:17', text: 'ప్రతి మంచి వరమును, ప్రతి పరిపూర్ణమైన దానమును పైనుండి వచ్చును.' },
    { ref: 'రోమీయులకు 15:13', text: 'ఆశ కలిగించు దేవుడు మిమ్మును సమస్త సంతోషముతోను సమాధానముతోను నింపును.' },
    { ref: 'యెహోషువ 1:9', text: 'ధైర్యముగా నుండుము; భయపడకుము.' },
    { ref: 'కీర్తన 145:13', text: 'యెహోవా తన వాగ్దానములన్నిటిలో నమ్మదగినవాడు.' },
    { ref: 'కీర్తన 103:5', text: 'ఆయన నీ యౌవనమును గ్రద్దవలె నూతనపరచును.' },
    { ref: '3 యోహాను 1:2', text: 'నీకు సమస్తమును క్షేమముగా ఉండునట్లు నేను ప్రార్థించుచున్నాను.' },
    { ref: 'నహూము 1:7', text: 'యెహోవా శరణాగతులకు ఆశ్రయము.' },
    { ref: '1 పేతురు 5:7', text: 'మీ చింతలన్నిటిని ఆయన మీద వేయుడి; ఆయన మీ సంగతి చింతించుచున్నాడు.' },
    { ref: 'కీర్తన 16:11', text: 'నీ సన్నిధిలో సంపూర్ణ సంతోషము కలదు.' },
    { ref: 'కీర్తన 121:8', text: 'యెహోవా నీ వెళ్లుటను రాకడను కాపాడును.' },
    { ref: 'కీర్తన 90:17', text: 'మన దేవుని దయ మన మీద ఉండును గాక.' },
    { ref: 'కీర్తన 27:1', text: 'యెహోవా నా వెలుగును నా రక్షణయు.' },
    { ref: 'విలాపవాక్యములు 3:22–23', text: 'యెహోవా కృపలు అంతము లేనివి; ఆయన కనికరములు ప్రతి ఉదయము నూతనములు.' },
    { ref: 'విలాపవాక్యములు 3:22', text: 'యెహోవా ప్రేమ ఎన్నటికీ నిలిచియుండును.' },
    { ref: 'ఎఫెసీయులకు 3:20', text: 'మనము అడుగుదానికంటెను ఊహించుదానికంటెను అత్యధికముగా చేయగలవాడు దేవుడు.' },
  ],
  wedding: [
    { ref: 'ఆదికాండము 2:24', text: 'కాబట్టి పురుషుడు తన తండ్రిని తన తల్లిని విడిచిపెట్టి తన భార్యను హత్తుకొనును; వారు ఒక శరీరముగా ఉండుదురు.' },
    { ref: 'ప్రసంగి 4:9', text: 'ఇద్దరు ఒక్కనికంటె మేలు; వారు తమ పరిశ్రమకు మంచి ఫలము పొందుదురు.' },
    { ref: 'ప్రసంగి 4:12', text: 'ముగ్గురితో పేనిన త్రాడు త్వరగా తెగిపోదు.' },
    { ref: 'మార్కు 10:9', text: 'దేవుడు జతపరచిన వారిని మనుష్యుడు వేరు చేయకూడదు.' },
    { ref: 'మత్తయి 19:6', text: 'వారు ఇక ఇద్దరు కాదు, ఒక శరీరము; కాబట్టి దేవుడు జతపరచిన వారిని మనుష్యుడు వేరు చేయకూడదు.' },
    { ref: 'ఎఫెసీయులకు 5:2', text: 'క్రీస్తు మిమ్మును ప్రేమించినట్లు ప్రేమలో నడుచుకొనుడి.' },
    { ref: 'ఎఫెసీయులకు 5:25', text: 'భర్తలారా, క్రీస్తు సంఘమును ప్రేమించినట్లు మీ భార్యలను ప్రేమించుడి.' },
    { ref: 'ఎఫెసీయులకు 5:33', text: 'మీలో ప్రతి వాడు తన భార్యను తనను ప్రేమించినట్లు ప్రేమించవలెను; భార్య తన భర్తను గౌరవించవలెను.' },
    { ref: 'కొలస్సయులకు 3:14', text: 'వీటన్నిటికంటె ప్రేమను ధరించుకొనుడి; అది పరిపూర్ణతకు బంధము.' },
    { ref: 'కొలస్సయులకు 3:15', text: 'క్రీస్తు సమాధానము మీ హృదయములలో ఏలుచుండనియ్యుడి.' },
    { ref: '1 కొరింథీయులకు 13:4', text: 'ప్రేమ దీర్ఘశాంతము కలిగి దయగలదై యుండును.' },
    { ref: '1 కొరింథీయులకు 13:7', text: 'ప్రేమ అన్నిటిని భరించును, అన్నిటిని నమ్మును, అన్నిటిని నిరీక్షించును, అన్నిటిని సహించును.' },
    { ref: '1 కొరింథీయులకు 13:8', text: 'ప్రేమ ఎన్నటికిని తరుగదు.' },
    { ref: '1 పేతురు 4:8', text: 'ప్రేమ అనేక పాపములను కప్పివేయును.' },
    { ref: '1 యోహాను 4:7', text: 'ప్రియులారా, మనము ఒకరినొకరు ప్రేమించుకొందము; ప్రేమ దేవునివలన కలుగును.' },
    { ref: '1 యోహాను 4:12', text: 'మనము ఒకరినొకరు ప్రేమించుకొనినయెడల దేవుడు మనలో నివసించును.' },
    { ref: 'రోమీయులకు 12:10', text: 'సహోదర ప్రేమలో ఒకరియెడల ఒకరు అనురాగము కలిగి ఉండుడి.' },
    { ref: 'రోమీయులకు 15:5', text: 'దేవుడు మీకు ఒకే మనస్సును అనుగ్రహించును గాక.' },
    { ref: 'ఫిలిప్పీయులకు 2:2', text: 'ఒకే ప్రేమగలవారై, ఒకే మనస్సుతో ఉండుడి.' },
    { ref: 'ఫిలిప్పీయులకు 4:7', text: 'దేవుని సమాధానము మీ హృదయములను కాపాడును.' },
    { ref: 'గలతీయులకు 5:22–23', text: 'ఆత్మ ఫలము ప్రేమ, సంతోషము, సమాధానము, దీర్ఘశాంతము, దయ, మంచితనము, విశ్వాసము, సాత్వికము, ఆశానిగ్రహము.' },
    { ref: 'సామెతలు 3:3', text: 'కృపాసత్యములు నిన్ను విడువకుండునట్లు వాటిని నీ హృదయముమీద వ్రాసికొనుము.' },
    { ref: 'సామెతలు 17:17', text: 'స్నేహితుడు అన్ని కాలములందును ప్రేమించును.' },
    { ref: 'సామెతలు 18:22', text: 'భార్యను పొందినవాడు మేలైనదానిని పొందెను; యెహోవా అనుగ్రహము పొందెను.' },
    { ref: 'సామెతలు 31:10', text: 'గుణవతియైన భార్య అమూల్యమైనది.' },
    { ref: 'కీర్తనలు 127:1', text: 'యెహోవా ఇల్లు కట్టకపోతే కట్టువారి శ్రమ వ్యర్థము.' },
    { ref: 'కీర్తనలు 128:1', text: 'యెహోవాయందు భయభక్తులు కలిగి ఆయన మార్గములందు నడుచువారందరు ధన్యులు.' },
    { ref: 'కీర్తనలు 133:1', text: 'సహోదరులు ఐక్యముగా నివసించుట ఎంత మేలైనది!' },
    { ref: 'సంఖ్యాకాండము 6:24–26', text: 'యెహోవా నిన్ను ఆశీర్వదించి నిన్ను కాపాడును గాక... తన సమాధానమును నీకు అనుగ్రహించును గాక.' },
    { ref: 'యోహాను 15:12', text: 'నేను మిమ్మును ప్రేమించినట్లు మీరు ఒకరినొకరు ప్రేమించుకొనుడి.' },
  ],
  baptism: [
    { ref: 'మత్తయి 28:19', text: 'కాబట్టి మీరు వెళ్లి సమస్త జనులను శిష్యులనుగా చేయుడి; వారికి తండ్రి, కుమారుడు, పరిశుద్ధాత్మ నామమున బాప్తిస్మమిచ్చుడి.' },
    { ref: 'మార్కు 16:16', text: 'విశ్వసించి బాప్తిస్మము పొందినవాడు రక్షింపబడును; విశ్వసింపనివాడు శిక్షింపబడును.' },
    { ref: 'అపొస్తలుల కార్యములు 2:38', text: 'మీరు మనస్సు మార్చుకొని, మీ పాపముల క్షమాపణ కొరకు యేసుక్రీస్తు నామమున బాప్తిస్మము పొందుడి; అప్పుడు పరిశుద్ధాత్మ వరమును పొందుదురు.' },
    { ref: 'అపొస్తలుల కార్యములు 2:41', text: 'ఆయన మాటను ఆనందముగా అంగీకరించినవారు బాప్తిస్మము పొందిరి.' },
    { ref: 'అపొస్తలుల కార్యములు 8:36', text: 'ఇదిగో నీరు ఉంది; నేను బాప్తిస్మము పొందుటకు ఏమి ఆటంకము?' },
    { ref: 'అపొస్తలుల కార్యములు 8:38', text: 'వారు నీళ్లలోకి దిగిరి; ఫిలిప్పు అతనికి బాప్తిస్మము ఇచ్చెను.' },
    { ref: 'అపొస్తలుల కార్యములు 10:47', text: 'పరిశుద్ధాత్మను పొందిన వీరికి బాప్తిస్మము ఇవ్వకుండా ఎవడు అడ్డగించగలడు?' },
    { ref: 'అపొస్తలుల కార్యములు 22:16', text: 'లేచి బాప్తిస్మము పొంది, ఆయన నామమును ప్రార్థించుచు నీ పాపములను కడుగుకొనుము.' },
    { ref: 'రోమీయులకు 6:3', text: 'క్రీస్తుయేసునందు బాప్తిస్మము పొందిన మనమందరము ఆయన మరణములో బాప్తిస్మము పొందినవారమని మీకు తెలియదా?' },
    { ref: 'రోమీయులకు 6:4', text: 'క్రీస్తు లేపబడినట్లే మనమును నూతన జీవితములో నడుచుకొనుటకై బాప్తిస్మము ద్వారా ఆయనతో కూడ సమాధి చేయబడితిమి.' },
    { ref: 'రోమీయులకు 6:11', text: 'మీరు పాపమునకు చనిపోయినవారై, క్రీస్తుయేసునందు దేవునికి బ్రతికియున్నవారమని ఎంచుకొనుడి.' },
    { ref: '2 కొరింథీయులకు 5:17', text: 'ఎవడైనను క్రీస్తునందు ఉన్నయెడల అతడు నూతన సృష్టి; పాతవి గతించెను, ఇదిగో సమస్తము క్రొత్తవాయెను.' },
    { ref: 'గలతీయులకు 3:26', text: 'మీరు అందరూ క్రీస్తుయేసునందు విశ్వాసమువలన దేవుని కుమారులై యున్నారు.' },
    { ref: 'గలతీయులకు 3:27', text: 'క్రీస్తునందు బాప్తిస్మము పొందిన మీరందరూ క్రీస్తును ధరించుకొనియున్నారు.' },
    { ref: 'ఎఫెసీయులకు 4:5', text: 'ఒక ప్రభువు, ఒక విశ్వాసము, ఒక బాప్తిస్మము.' },
    { ref: 'కొలస్సయులకు 2:12', text: 'బాప్తిస్మములో ఆయనతో కూడ సమాధి చేయబడి, దేవుని శక్తిని విశ్వసించినందున ఆయనతో కూడ లేపబడితిరి.' },
    { ref: 'తీతుకు 3:5', text: 'ఆయన తన కృపచేత పునర్జన్మస్నానమువలనను పరిశుద్ధాత్మ నూతనీకరణమువలనను మనలను రక్షించెను.' },
    { ref: '1 పేతురు 3:21', text: 'బాప్తిస్మము ఇప్పుడు మిమ్మును రక్షించుచున్నది.' },
    { ref: 'యోహాను 3:5', text: 'నీరు మరియు ఆత్మవలన జన్మించని వాడు దేవుని రాజ్యములో ప్రవేశింపలేడు.' },
    { ref: 'యోహాను 3:16', text: 'దేవుడు లోకమును ఎంతో ప్రేమించెను గనుక తన అద్వితీయ కుమారుని అనుగ్రహించెను.' },
    { ref: 'యోహాను 1:12', text: 'ఆయనను అంగీకరించిన వారికి దేవుని పిల్లలగుటకు అధికారము ఇచ్చెను.' },
    { ref: '1 యోహాను 1:7', text: 'ఆయన కుమారుడైన యేసు రక్తము మనలను సమస్త పాపములనుండి శుద్ధి చేయును.' },
    { ref: 'హెబ్రీయులకు 10:22', text: 'శుద్ధమైన హృదయముతో విశ్వాసపూర్ణత కలిగి దేవుని సమీపించుదము.' },
    { ref: 'ఫిలిప్పీయులకు 1:6', text: 'మీలో మంచి కార్యమును ప్రారంభించినవాడు దానిని సంపూర్ణము చేయును.' },
    { ref: 'ఫిలిప్పీయులకు 3:14', text: 'దేవుని ఉన్నతమైన పిలుపు బహుమానము కొరకు లక్ష్యమువైపు పరుగెత్తుచున్నాను.' },
    { ref: 'యాకోబు 1:22', text: 'వాక్యము వినుвариగానే కాక దాని ప్రకారము చేయువారుగా ఉండుడి.' },
    { ref: 'కీర్తనలు 119:105', text: 'నీ వాక్యము నా పాదములకు దీపమును, నా మార్గమునకు వెలుగును.' },
    { ref: 'యెహెజ్కేలు 36:26', text: 'మీకు క్రొత్త హృదయమును ఇచ్చి, క్రొత్త ఆత్మను మీలో ఉంచెదను.' },
    { ref: 'యెషయా 43:1', text: 'నేను నిన్ను విమోచించితిని; పేరుపెట్టి నిన్ను పిలిచితిని; నీవు నావాడవు.' },
    { ref: '2 తిమోతికి 1:9', text: 'ఆయన మనలను రక్షించి పరిశుద్ధమైన పిలుపుతో పిలిచెను.' },
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
  const TODAY = getToday();
  return new Date(TODAY.getFullYear(), m.month - 1, m.day);
}

export function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function nextOccurrence(m: Member) {
  const TODAY = getToday();
  let d = occurrenceThisYear(m);
  if (d < stripTime(TODAY)) d = new Date(TODAY.getFullYear() + 1, m.month - 1, m.day);
  return d;
}

export function daysUntil(m: Member) {
  const diff = nextOccurrence(m).getTime() - stripTime(getToday()).getTime();
  return Math.round(diff / 86400000);
}

export function isToday(m: Member) {
  const TODAY = getToday();
  return m.month === TODAY.getMonth() + 1 && m.day === TODAY.getDate();
}

export function isPastThisYear(m: Member) {
  return occurrenceThisYear(m) < stripTime(getToday()) && !isToday(m);
}

export function isThisWeek(m: Member) {
  const d = daysUntil(m);
  return d >= 0 && d <= 7;
}

export function isThisMonth(m: Member) {
  const TODAY = getToday();
  return m.month === TODAY.getMonth() + 1;
}

export function formatDate(m: Member) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m.month - 1]} ${m.day}`;
}

export function yearsLabel(cat: string, refYear: number) {
  const TODAY = getToday();
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
