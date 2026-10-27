import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { 
  BibleQuestion, 
  QuizAttempt, 
  QuizFilterCriteria, 
  QuizStats, 
  DifficultyLevel,
  LeaderboardEntry,
  QuizCategory,
  QuizSubcategory,
  QuizTrack,
  TestamentScope
} from '../types/quiz';
import { DEFAULT_QUIZ_CATEGORIES, SPECIAL_QUIZ_TRACKS } from '../data/quizCategories';
import AnthropicQuizService from './AnthropicQuizService';

const QUIZ_HISTORY_KEY = '@church_bible_quiz_history';
const QUIZ_STATS_KEY = '@church_bible_quiz_stats';
const CACHED_FIRESTORE_ATTEMPTS_KEY = '@church_cached_firestore_quiz_attempts';
const DAILY_COMPLETED_KEY_PREFIX = '@church_daily_completed_date_';
const RECENT_ATTEMPTS_STORAGE_KEY = '@church_recent_quiz_attempts';
export const CHURCH_QUIZZES_CACHE_KEY = 'CODG_MEMBER_PUBLISHED_QUIZZES_KEY';

// Persistent in-memory caches across screen mounts and re-renders
let inMemoryCachedAttempts: any[] = [];
let inMemoryCachedChurchQuizzes: any[] = [];

// Rich verified initial Bible Question Bank
export const VERIFIED_BIBLE_QUESTIONS: BibleQuestion[] = [
  // --- OLD TESTAMENT: GENESIS & EXODUS ---
  {
    id: 'ot-gen-001',
    question: 'How many days did God take to create the world and rest on the final day?',
    options: [
      { id: 'a', text: 'Created in 5 days, rested on the 6th' },
      { id: 'b', text: 'Created in 6 days, rested on the 7th' },
      { id: 'c', text: 'Created in 7 days, rested on the 8th' },
      { id: 'd', text: 'Created in 4 days, rested on the 5th' }
    ],
    correctOptionId: 'b',
    book: 'Genesis',
    chapter: 2,
    verse: '2-3',
    verseReference: 'Genesis 2:2-3',
    explanation: 'By the seventh day God had finished the work he had been doing; so on the seventh day he rested from all his work.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Creation'
  },
  {
    id: 'ot-gen-002',
    question: 'What did God place in the sky as a covenant with Noah never to destroy the whole earth with a flood again?',
    options: [
      { id: 'a', text: 'A golden star' },
      { id: 'b', text: 'A pillar of fire' },
      { id: 'c', text: 'A rainbow' },
      { id: 'd', text: 'A white dove' }
    ],
    correctOptionId: 'c',
    book: 'Genesis',
    chapter: 9,
    verse: '13',
    verseReference: 'Genesis 9:13',
    explanation: 'God said: "I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Noah & Covenant'
  },
  {
    id: 'ot-gen-003',
    question: 'Into what country was Joseph sold as a slave before rising to become prime minister?',
    options: [
      { id: 'a', text: 'Babylon' },
      { id: 'b', text: 'Egypt' },
      { id: 'c', text: 'Persia' },
      { id: 'd', text: 'Rome' }
    ],
    correctOptionId: 'b',
    book: 'Genesis',
    chapter: 37,
    verse: '28',
    verseReference: 'Genesis 37:28',
    explanation: 'Midianite merchants sold Joseph into Egypt to Potiphar, an officer of Pharaoh and captain of the guard.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Patriarchs'
  },
  {
    id: 'ot-exo-001',
    question: 'How did God first appear to Moses on Mount Horeb?',
    options: [
      { id: 'a', text: 'In a gentle whisper' },
      { id: 'b', text: 'In a burning bush that was not consumed' },
      { id: 'c', text: 'In a pillar of cloud' },
      { id: 'd', text: 'In a majestic dream' }
    ],
    correctOptionId: 'b',
    book: 'Exodus',
    chapter: 3,
    verse: '2',
    verseReference: 'Exodus 3:2',
    explanation: 'The angel of the Lord appeared to Moses in flames of fire from within a bush. Moses saw that though the bush was on fire it did not burn up.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Moses'
  },
  {
    id: 'ot-exo-002',
    question: 'What was the tenth and final plague brought upon Egypt before Pharaoh let the Israelites go?',
    options: [
      { id: 'a', text: 'Plague of locusts' },
      { id: 'b', text: 'Water turned into blood' },
      { id: 'c', text: 'Death of the firstborn' },
      { id: 'd', text: 'Plague of darkness' }
    ],
    correctOptionId: 'c',
    book: 'Exodus',
    chapter: 12,
    verse: '29',
    verseReference: 'Exodus 12:29',
    explanation: 'At midnight the Lord struck down all the firstborn in Egypt, from the firstborn of Pharaoh to the firstborn of the prisoner.',
    difficulty: 'medium',
    testament: 'ot',
    topic: 'Exodus & Passover'
  },
  {
    id: 'ot-exo-003',
    question: 'On which mountain did Moses receive the Ten Commandments from God?',
    options: [
      { id: 'a', text: 'Mount Carmel' },
      { id: 'b', text: 'Mount Sinai' },
      { id: 'c', text: 'Mount Nebo' },
      { id: 'd', text: 'Mount Zion' }
    ],
    correctOptionId: 'b',
    book: 'Exodus',
    chapter: 19,
    verse: '20',
    verseReference: 'Exodus 19:20',
    explanation: 'The Lord descended to the top of Mount Sinai and called Moses to the top of the mountain.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Law & Commandments'
  },

  // --- OLD TESTAMENT: HISTORICAL & KINGS ---
  {
    id: 'ot-1sa-001',
    question: 'What weapon did young David use to defeat the Philistine giant Goliath?',
    options: [
      { id: 'a', text: 'A bronze spear' },
      { id: 'b', text: 'A sling and five smooth stones' },
      { id: 'c', text: 'A bow and poisoned arrows' },
      { id: 'd', text: 'King Saul’s royal armor' }
    ],
    correctOptionId: 'b',
    book: '1 Samuel',
    chapter: 17,
    verse: '40',
    verseReference: '1 Samuel 17:40',
    explanation: 'David took his staff in his hand, chose five smooth stones from the stream, put them in his pouch, and with his sling approached the Philistine.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'David'
  },
  {
    id: 'ot-1ki-001',
    question: 'When God appeared to King Solomon in a dream and told him to ask for anything, what did Solomon request?',
    options: [
      { id: 'a', text: 'Great wealth and gold' },
      { id: 'b', text: 'Long life and victory over enemies' },
      { id: 'c', text: 'Wisdom and a discerning heart to govern God’s people' },
      { id: 'd', text: 'The largest temple in the world' }
    ],
    correctOptionId: 'c',
    book: '1 Kings',
    chapter: 3,
    verse: '9',
    verseReference: '1 Kings 3:9',
    explanation: 'Solomon asked: "Give your servant a discerning heart to govern your people and to distinguish between right and wrong."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Wisdom'
  },
  {
    id: 'ot-1ki-002',
    question: 'On Mount Carmel, prophet Elijah challenged 450 prophets of which false god?',
    options: [
      { id: 'a', text: 'Baal' },
      { id: 'b', text: 'Dagon' },
      { id: 'c', text: 'Molech' },
      { id: 'd', text: 'Artemis' }
    ],
    correctOptionId: 'a',
    book: '1 Kings',
    chapter: 18,
    verse: '19',
    verseReference: '1 Kings 18:19',
    explanation: 'Elijah commanded King Ahab to summon the 450 prophets of Baal and 400 prophets of Asherah to Mount Carmel.',
    difficulty: 'medium',
    testament: 'ot',
    topic: 'Elijah'
  },

  // --- OLD TESTAMENT: PSALMS & PROVERBS ---
  {
    id: 'ot-psa-001',
    question: 'Finish the opening sentence of Psalm 23: "The Lord is my shepherd; ______."',
    options: [
      { id: 'a', text: 'He leads me in righteousness' },
      { id: 'b', text: 'I shall not want (I lack nothing)' },
      { id: 'c', text: 'His rod and staff comfort me' },
      { id: 'd', text: 'My cup overflows' }
    ],
    correctOptionId: 'b',
    book: 'Psalms',
    chapter: 23,
    verse: '1',
    verseReference: 'Psalm 23:1',
    explanation: 'Psalm 23:1 declares: "The Lord is my shepherd; I shall not want."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Praise & Psalms'
  },
  {
    id: 'ot-pro-001',
    question: 'According to Proverbs 1:7, what is the beginning of knowledge?',
    options: [
      { id: 'a', text: 'Reading books' },
      { id: 'b', text: 'The fear of the Lord' },
      { id: 'c', text: 'Worldly experience' },
      { id: 'd', text: 'Listening to elders' }
    ],
    correctOptionId: 'b',
    book: 'Proverbs',
    chapter: 1,
    verse: '7',
    verseReference: 'Proverbs 1:7',
    explanation: 'Proverbs 1:7 states: "The fear of the Lord is the beginning of knowledge, but fools despise wisdom and instruction."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Wisdom'
  },
  {
    id: 'ot-pro-002',
    question: 'Proverbs 3:5-6 says: "Trust in the Lord with all your heart, and do not lean on ______."',
    options: [
      { id: 'a', text: 'Your own strength' },
      { id: 'b', text: 'Your own understanding' },
      { id: 'c', text: 'Chariots and horses' },
      { id: 'd', text: 'Uncertain riches' }
    ],
    correctOptionId: 'b',
    book: 'Proverbs',
    chapter: 3,
    verse: '5',
    verseReference: 'Proverbs 3:5',
    explanation: 'Proverbs 3:5 instructs: "Trust in the Lord with all your heart and lean not on your own understanding."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Faith & Trust'
  },

  // --- OLD TESTAMENT: PROPHETS ---
  {
    id: 'ot-dan-001',
    question: 'Why was Daniel thrown into the lions’ den by King Darius?',
    options: [
      { id: 'a', text: 'He refused to pay royal taxes' },
      { id: 'b', text: 'He prayed to the true God three times a day despite the king’s decree' },
      { id: 'c', text: 'He destroyed Babylonian idols' },
      { id: 'd', text: 'He plotted to overthrow the throne' }
    ],
    correctOptionId: 'b',
    book: 'Daniel',
    chapter: 6,
    verse: '10-16',
    verseReference: 'Daniel 6:10-16',
    explanation: 'Even when the decree was signed, Daniel went home to his upstairs room, opened his windows toward Jerusalem, and prayed to God three times a day.',
    difficulty: 'medium',
    testament: 'ot',
    topic: 'Faithfulness'
  },
  {
    id: 'ot-dan-002',
    question: 'What were the names of Daniel’s three friends who were thrown into the blazing fiery furnace?',
    options: [
      { id: 'a', text: 'Peter, James, and John' },
      { id: 'b', text: 'Shadrach, Meshach, and Abednego' },
      { id: 'c', text: 'Shem, Ham, and Japheth' },
      { id: 'd', text: 'Eliphaz, Bildad, and Zophar' }
    ],
    correctOptionId: 'b',
    book: 'Daniel',
    chapter: 3,
    verse: '12-20',
    verseReference: 'Daniel 3:12-20',
    explanation: 'Shadrach, Meshach, and Abednego refused to bow down to King Nebuchadnezzar’s golden image and were preserved unharmed in the fire.',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Faithfulness'
  },
  {
    id: 'ot-jon-001',
    question: 'To which city did God tell Jonah to go preach repentance before Jonah fled to Tarshish?',
    options: [
      { id: 'a', text: 'Damascus' },
      { id: 'b', text: 'Nineveh' },
      { id: 'c', text: 'Jericho' },
      { id: 'd', text: 'Samaria' }
    ],
    correctOptionId: 'b',
    book: 'Jonah',
    chapter: 1,
    verse: '2',
    verseReference: 'Jonah 1:2',
    explanation: 'The word of the Lord came to Jonah: "Go to the great city of Nineveh and preach against it, because its wickedness has come up before me."',
    difficulty: 'easy',
    testament: 'ot',
    topic: 'Obedience'
  },
  {
    id: 'ot-isa-001',
    question: 'Which prophet prophesied: "Therefore the Lord himself will give you a sign: The virgin will conceive and give birth to a son, and will call him Immanuel"?',
    options: [
      { id: 'a', text: 'Jeremiah' },
      { id: 'b', text: 'Isaiah' },
      { id: 'c', text: 'Ezekiel' },
      { id: 'd', text: 'Micah' }
    ],
    correctOptionId: 'b',
    book: 'Isaiah',
    chapter: 7,
    verse: '14',
    verseReference: 'Isaiah 7:14',
    explanation: 'Isaiah foretold the virgin birth of our Lord and Savior Jesus Christ in Isaiah 7:14.',
    difficulty: 'medium',
    testament: 'ot',
    topic: 'Messianic Prophecy'
  },

  // --- NEW TESTAMENT: GOSPELS & BIRTH OF JESUS ---
  {
    id: 'nt-mat-001',
    question: 'In which town was Jesus Christ born, fulfilling the prophecy of Micah?',
    options: [
      { id: 'a', text: 'Nazareth' },
      { id: 'b', text: 'Bethlehem of Judea' },
      { id: 'c', text: 'Jerusalem' },
      { id: 'd', text: 'Capernaum' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 2,
    verse: '1',
    verseReference: 'Matthew 2:1',
    explanation: 'Jesus was born in Bethlehem in Judea during the reign of King Herod, fulfilling Micah 5:2.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Birth of Jesus'
  },
  {
    id: 'nt-mat-002',
    question: 'What three gifts did the Magi (wise men) present to young Jesus?',
    options: [
      { id: 'a', text: 'Silver, wheat, and oil' },
      { id: 'b', text: 'Gold, frankincense, and myrrh' },
      { id: 'c', text: 'Pearls, rubies, and purple cloth' },
      { id: 'd', text: 'Bread, wine, and honey' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 2,
    verse: '11',
    verseReference: 'Matthew 2:11',
    explanation: 'The wise men opened their treasures and presented him with gifts of gold, frankincense, and myrrh.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Birth of Jesus'
  },
  {
    id: 'nt-mat-003',
    question: 'In the Sermon on the Mount, what did Jesus tell his disciples they are to the world?',
    options: [
      { id: 'a', text: 'The rulers and judges' },
      { id: 'b', text: 'The salt of the earth and the light of the world' },
      { id: 'c', text: 'The wind and the fire' },
      { id: 'd', text: 'The gold and silver' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 5,
    verse: '13-14',
    verseReference: 'Matthew 5:13-14',
    explanation: 'Jesus declared: "You are the salt of the earth... You are the light of the world. A town built on a hill cannot be hidden."',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Sermon on the Mount'
  },
  {
    id: 'nt-mat-004',
    question: 'How did Jesus teach his disciples to pray when giving them the Lord’s Prayer?',
    options: [
      { id: 'a', text: '"Our Father in heaven, hallowed be your name..."' },
      { id: 'b', text: '"Almighty Creator, give us wealth today..."' },
      { id: 'c', text: '"God of Abraham, grant us victory over Rome..."' },
      { id: 'd', text: '"Holy Angels, watch over our sleep..."' }
    ],
    correctOptionId: 'a',
    book: 'Matthew',
    chapter: 6,
    verse: '9',
    verseReference: 'Matthew 6:9',
    explanation: 'Jesus taught: "This, then, is how you should pray: Our Father in heaven, hallowed be your name, your kingdom come, your will be done..."',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Prayer'
  },
  {
    id: 'nt-mat-005',
    question: 'In Matthew 28:19-20, what is the commission Jesus gave to all disciples before ascending into heaven?',
    options: [
      { id: 'a', text: 'Build grand synagogues in every province' },
      { id: 'b', text: 'Go and make disciples of all nations, baptizing them in the name of the Father, Son, and Holy Spirit' },
      { id: 'c', text: 'Stay permanently within the gates of Jerusalem' },
      { id: 'd', text: 'Write histories of the kings of Israel' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 28,
    verse: '19-20',
    verseReference: 'Matthew 28:19-20',
    explanation: 'The Great Commission commands us to go and make disciples of all nations, baptizing and teaching them to obey everything Christ commanded.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Great Commission'
  },

  // --- NEW TESTAMENT: MIRACLES OF JESUS ---
  {
    id: 'nt-joh-001',
    question: 'What was Jesus’ first recorded public miracle, performed at a wedding in Cana of Galilee?',
    options: [
      { id: 'a', text: 'Healing a blind man' },
      { id: 'b', text: 'Turning water into wine' },
      { id: 'c', text: 'Feeding 5,000 men' },
      { id: 'd', text: 'Calming the storm' }
    ],
    correctOptionId: 'b',
    book: 'John',
    chapter: 2,
    verse: '1-11',
    verseReference: 'John 2:11',
    explanation: 'What Jesus did here in Cana of Galilee was the first of the signs through which he revealed his glory, and his disciples believed in him.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Miracles'
  },
  {
    id: 'nt-mat-006',
    question: 'With what provisions did Jesus miraculously feed a crowd of five thousand men besides women and children?',
    options: [
      { id: 'a', text: 'Seven loaves and two fish' },
      { id: 'b', text: 'Five barley loaves and two small fish' },
      { id: 'c', text: 'Twelve loaves of unleavened bread' },
      { id: 'd', text: 'Ten baskets of figs and grapes' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 14,
    verse: '17-21',
    verseReference: 'Matthew 14:17-21',
    explanation: 'Taking the five loaves and two fish and looking up to heaven, Jesus gave thanks and broke the loaves. All ate and twelve baskets were left over.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Miracles'
  },
  {
    id: 'nt-mat-007',
    question: 'When the disciples were in a boat terrified by a storm on the Sea of Galilee, who stepped out of the boat and walked on water toward Jesus?',
    options: [
      { id: 'a', text: 'John' },
      { id: 'b', text: 'Peter' },
      { id: 'c', text: 'James' },
      { id: 'd', text: 'Thomas' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 14,
    verse: '29',
    verseReference: 'Matthew 14:29',
    explanation: 'Peter got down out of the boat, walked on the water and came toward Jesus.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Miracles'
  },
  {
    id: 'nt-joh-002',
    question: 'In Bethany, whom did Jesus raise from the dead after he had been in the tomb for four days?',
    options: [
      { id: 'a', text: 'Jairus’s daughter' },
      { id: 'b', text: 'Lazarus' },
      { id: 'c', text: 'The widow of Nain’s son' },
      { id: 'd', text: 'Nicodemus' }
    ],
    correctOptionId: 'b',
    book: 'John',
    chapter: 11,
    verse: '43-44',
    verseReference: 'John 11:43-44',
    explanation: 'Jesus called in a loud voice: "Lazarus, come out!" The dead man came out, his hands and feet wrapped with strips of linen.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Miracles'
  },

  // --- NEW TESTAMENT: PARABLES ---
  {
    id: 'nt-luk-001',
    question: 'In the Parable of the Good Samaritan, who stopped to bandage the beaten traveler after a priest and a Levite passed by?',
    options: [
      { id: 'a', text: 'A Roman soldier' },
      { id: 'b', text: 'A Samaritan' },
      { id: 'c', text: 'A Pharisee' },
      { id: 'd', text: 'A fisherman' }
    ],
    correctOptionId: 'b',
    book: 'Luke',
    chapter: 10,
    verse: '33-34',
    verseReference: 'Luke 10:33-34',
    explanation: 'A Samaritan, as he traveled, came where the man was; and when he saw him, he took pity on him, bandaged his wounds, and took care of him.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Parables'
  },
  {
    id: 'nt-luk-002',
    question: 'In the Parable of the Prodigal Son, what did the loving father do when he saw his repentant son returning from a far country?',
    options: [
      { id: 'a', text: 'Locked the gates and told him to work as a hired servant' },
      { id: 'b', text: 'Ran to him, threw his arms around him, and kissed him' },
      { id: 'c', text: 'Demanded he repay all the squandered estate first' },
      { id: 'd', text: 'Sent the older brother to evaluate his sincerity' }
    ],
    correctOptionId: 'b',
    book: 'Luke',
    chapter: 15,
    verse: '20',
    verseReference: 'Luke 15:20',
    explanation: 'While he was still a long way off, his father saw him and was filled with compassion; he ran to his son, threw his arms around him and kissed him.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Parables'
  },
  {
    id: 'nt-mat-008',
    question: 'In the Parable of the Sower, what represents the seed that fell on good soil?',
    options: [
      { id: 'a', text: 'People who hear the word but quickly fall away during persecution' },
      { id: 'b', text: 'People who hear the word, understand it, and produce a fruitful harvest' },
      { id: 'c', text: 'People whose faith is choked by wealth and worries' },
      { id: 'd', text: 'People who completely reject the word from day one' }
    ],
    correctOptionId: 'b',
    book: 'Matthew',
    chapter: 13,
    verse: '23',
    verseReference: 'Matthew 13:23',
    explanation: 'The seed falling on good soil refers to someone who hears the word and understands it, producing a crop yielding a hundred, sixty, or thirty times what was sown.',
    difficulty: 'medium',
    testament: 'nt',
    topic: 'Parables'
  },

  // --- NEW TESTAMENT: JOHN & EPISTLES ---
  {
    id: 'nt-joh-003',
    question: 'Fill in the blanks: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have ______."',
    options: [
      { id: 'a', text: 'good fortune on earth' },
      { id: 'b', text: 'eternal life' },
      { id: 'c', text: 'honor among men' },
      { id: 'd', text: 'peace in this century' }
    ],
    correctOptionId: 'b',
    book: 'John',
    chapter: 3,
    verse: '16',
    verseReference: 'John 3:16',
    explanation: 'John 3:16 is the heart of the Gospel: God gave His Son so that whoever believes in Him shall not perish but have eternal life.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Salvation'
  },
  {
    id: 'nt-joh-004',
    question: 'In John 14:6, Jesus declared: "I am the ______, the ______, and the ______. No one comes to the Father except through me."',
    options: [
      { id: 'a', text: 'gate, shepherd, pasture' },
      { id: 'b', text: 'way, truth, life' },
      { id: 'c', text: 'light, bread, resurrection' },
      { id: 'd', text: 'alpha, rock, anchor' }
    ],
    correctOptionId: 'b',
    book: 'John',
    chapter: 14,
    verse: '6',
    verseReference: 'John 14:6',
    explanation: 'Jesus answered: "I am the way and the truth and the life. No one comes to the Father except through me."',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Identity of Christ'
  },
  {
    id: 'nt-act-001',
    question: 'On which Jewish festival day did the Holy Spirit descend upon the apostles like tongues of fire?',
    options: [
      { id: 'a', text: 'Passover' },
      { id: 'b', text: 'Day of Pentecost' },
      { id: 'c', text: 'Feast of Tabernacles' },
      { id: 'd', text: 'Purim' }
    ],
    correctOptionId: 'b',
    book: 'Acts',
    chapter: 2,
    verse: '1-4',
    verseReference: 'Acts 2:1-4',
    explanation: 'When the day of Pentecost came, they were all together in one place... They saw what seemed to be tongues of fire that separated and rested on each of them.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Holy Spirit'
  },
  {
    id: 'nt-act-002',
    question: 'On the road to which city was Saul blinded by a bright heavenly light and addressed directly by Jesus?',
    options: [
      { id: 'a', text: 'Antioch' },
      { id: 'b', text: 'Damascus' },
      { id: 'c', text: 'Tarsus' },
      { id: 'd', text: 'Rome' }
    ],
    correctOptionId: 'b',
    book: 'Acts',
    chapter: 9,
    verse: '3-5',
    verseReference: 'Acts 9:3-5',
    explanation: 'As Saul neared Damascus on his journey, suddenly a light from heaven flashed around him. He fell to the ground and heard a voice: "Saul, Saul, why do you persecute me?"',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Paul'
  },
  {
    id: 'nt-rom-001',
    question: 'According to Romans 8:28, what do we know about God’s working in the lives of those who love Him?',
    options: [
      { id: 'a', text: 'They will never face sorrow or affliction' },
      { id: 'b', text: 'In all things God works for the good of those who love him, who have been called according to his purpose' },
      { id: 'c', text: 'They will quickly become wealthy in earthly treasures' },
      { id: 'd', text: 'They will be free from making any difficult decisions' }
    ],
    correctOptionId: 'b',
    book: 'Romans',
    chapter: 8,
    verse: '28',
    verseReference: 'Romans 8:28',
    explanation: 'Romans 8:28 assures believers that in all things God works for the good of those who love Him, who have been called according to His purpose.',
    difficulty: 'medium',
    testament: 'nt',
    topic: 'Faith & Promise'
  },
  {
    id: 'nt-1co-001',
    question: 'In 1 Corinthians 13:13, what three virtues remain, and which of them is the greatest?',
    options: [
      { id: 'a', text: 'Faith, hope, and love; but the greatest of these is love' },
      { id: 'b', text: 'Wisdom, power, and courage; the greatest is courage' },
      { id: 'c', text: 'Prayer, fasting, and giving; the greatest is fasting' },
      { id: 'd', text: 'Knowledge, prophecy, and tongues; the greatest is tongues' }
    ],
    correctOptionId: 'a',
    book: '1 Corinthians',
    chapter: 13,
    verse: '13',
    verseReference: '1 Corinthians 13:13',
    explanation: 'Paul writes: "And now these three remain: faith, hope and love. But the greatest of these is love."',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Love'
  },
  {
    id: 'nt-gal-001',
    question: 'Which of the following lists contains fruits of the Holy Spirit as outlined in Galatians 5:22-23?',
    options: [
      { id: 'a', text: 'Gold, silver, bronze, iron, and stone' },
      { id: 'b', text: 'Love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness, self-control' },
      { id: 'c', text: 'Prophecy, tongues, miracles, administration, healing' },
      { id: 'd', text: 'Fasting, sacrifice, tithes, pilgrimages, rituals' }
    ],
    correctOptionId: 'b',
    book: 'Galatians',
    chapter: 5,
    verse: '22-23',
    verseReference: 'Galatians 5:22-23',
    explanation: 'The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control. Against such things there is no law.',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Holy Spirit & Character'
  },
  {
    id: 'nt-eph-001',
    question: 'In Ephesians 6:10-18, what is described as the "sword of the Spirit"?',
    options: [
      { id: 'a', text: 'The belt of truth' },
      { id: 'b', text: 'The Word of God' },
      { id: 'c', text: 'The shield of faith' },
      { id: 'd', text: 'The helmet of salvation' }
    ],
    correctOptionId: 'b',
    book: 'Ephesians',
    chapter: 6,
    verse: '17',
    verseReference: 'Ephesians 6:17',
    explanation: 'Take the helmet of salvation and the sword of the Spirit, which is the word of God.',
    difficulty: 'medium',
    testament: 'nt',
    topic: 'Spiritual Warfare'
  },
  {
    id: 'nt-phi-001',
    question: 'Complete Philippians 4:13: "I can do all this through ______ who gives me strength."',
    options: [
      { id: 'a', text: 'my own determination' },
      { id: 'b', text: 'the angels' },
      { id: 'c', text: 'him (Christ)' },
      { id: 'd', text: 'my good deeds' }
    ],
    correctOptionId: 'c',
    book: 'Philippians',
    chapter: 4,
    verse: '13',
    verseReference: 'Philippians 4:13',
    explanation: 'Paul confidently declared from prison: "I can do all this through him who gives me strength."',
    difficulty: 'easy',
    testament: 'nt',
    topic: 'Faith & Strength'
  },
  {
    id: 'nt-rev-001',
    question: 'In the Book of Revelation 1:8, what does the Lord God declare Himself to be?',
    options: [
      { id: 'a', text: 'The Alpha and the Omega, who is, and who was, and who is to come' },
      { id: 'b', text: 'The silent observer of earth' },
      { id: 'c', text: 'The ruler of Rome' },
      { id: 'd', text: 'The keeper of the stars only' }
    ],
    correctOptionId: 'a',
    book: 'Revelation',
    chapter: 1,
    verse: '8',
    verseReference: 'Revelation 1:8',
    explanation: '"I am the Alpha and the Omega," says the Lord God, "who is, and who was, and who is to come, the Almighty."',
    difficulty: 'medium',
    testament: 'nt',
    topic: 'End Times & Prophecy'
  }
];

/**
 * Timeout helper for robust network calls
 */
function withTimeout<T>(promise: Promise<T>, ms = 2000, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then(val => {
      clearTimeout(timer);
      return val;
    }).catch(() => fallback),
    timeoutPromise
  ]);
}

/**
 * Intelligent taxonomy enricher for questions:
 * Supports overlapping multi-category mapping across all 15 categories.
 */
function enrichQuestionTaxonomy(q: BibleQuestion): BibleQuestion {
  if (q.categoryIds && q.categoryIds.length > 0) {
    return q;
  }

  const cats = new Set<string>();
  cats.add('complete_bible');
  if (q.testament === 'ot') cats.add('ot_studies');
  if (q.testament === 'nt') cats.add('nt_studies');

  const text = `${q.question} ${q.topic || ''} ${q.book} ${q.explanation}`.toLowerCase();

  // 1. Bible Characters & Biographies
  if (text.match(/david|moses|abraham|noah|joseph|solomon|elijah|elisha|peter|paul|mary|ruth|esther|samson|gideon|judas|saul|hezekiah|josiah|sarah|rebekah|deborah|pharaoh|goliath|jezebel/)) {
    cats.add('bible_characters');
  }

  // 2. Biblical Events, Miracles & Parables
  if (text.match(/miracle|parable|plague|flood|red sea|healed|raised|resurrection|walked on water|loaves|creation|carmel|fiery furnace|lions|blind/)) {
    cats.add('events_miracles_parables');
  }

  // 3. Theology & Core Christian Doctrines
  if (text.match(/god|trinity|christ|salvation|grace|faith|sin|covenant|atonement|cross|heaven|hell|judgment|righteous|justification|commandment/)) {
    cats.add('theology_doctrines');
  }

  // 4. Holy Spirit & Spiritual Life
  if (text.match(/holy spirit|spirit of god|fruit of the spirit|spiritual gift|pentecost|tongues|prayer|worship|fasting|holiness|sanctification|revival/)) {
    cats.add('holy_spirit_life');
  }

  // 5. Prophecy & Biblical Eschatology
  if (text.match(/prophecy|prophet|daniel|revelation|second coming|beast|seals|millennium|zion|messiah|vision|trumpet|new jerusalem/)) {
    cats.add('prophecy_eschatology');
  }

  // 6. Family, Love & Relationships
  if (text.match(/love|marriage|husband|wife|children|father|mother|family|neighbor|forgive|friendship|widow|orphan|brother/)) {
    cats.add('family_relationships');
  }

  // 7. Christian Character & Practical Living
  if (text.match(/integrity|humility|patience|honesty|speech|tongue|money|giving|stewardship|work|diligence|trials|servant|generosity|anger|truth/)) {
    cats.add('christian_character');
  }

  // 8. Psalms, Proverbs & Biblical Wisdom
  if (['Psalms', 'Proverbs', 'Ecclesiastes', 'Job', 'Song of Solomon'].includes(q.book) || text.match(/wisdom|proverb|psalm|shepherd/)) {
    cats.add('wisdom_literature');
  }

  // 9. Church, Worship & Ministry
  if (text.match(/church|apostle|baptism|communion|supper|elder|deacon|preach|evangelism|fellowship|acts|disciple|missionary/)) {
    cats.add('church_ministry');
  }

  // 10. People, Nations & Cultures
  if (text.match(/tribe|judah|egypt|babylon|rome|temple|tabernacle|feast|passover|shekel|denarius|priest|levite|caesar/)) {
    cats.add('people_nations_cultures');
  }

  // 11. Bible Verses & Scripture Challenges
  if (text.match(/verse|finish|said|quoted|scripture|who said|reference/)) {
    cats.add('scripture_challenges');
  }

  return {
    ...q,
    categoryIds: Array.from(cats),
    sourceTranslation: q.sourceTranslation || 'NIV'
  };
}

class BibleQuizService {
  private categoriesCache: QuizCategory[] = [...DEFAULT_QUIZ_CATEGORIES];
  private categoriesLoaded: boolean = false;

  /**
   * Get all 15 Quiz Categories.
   * Returns default immediately, syncs from Firestore 'quiz_categories' in background.
   */
  async getCategories(): Promise<QuizCategory[]> {
    if (!this.categoriesLoaded) {
      try {
        const snap = await firestore().collection('quiz_categories').orderBy('order', 'asc').get();
        if (!snap.empty) {
          const remoteCats = snap.docs.map(doc => doc.data() as QuizCategory);
          if (remoteCats.length >= 10) {
            this.categoriesCache = remoteCats;
          }
        } else {
          // Collection is empty, optionally seed default categories in background
          this.seedCategoriesToFirestore().catch(() => {});
        }
      } catch (err) {
        // Fallback to local
      }
      this.categoriesLoaded = true;
    }
    return this.categoriesCache;
  }

  /**
   * Synchronous getter for instant 0ms UI render
   */
  getCategoriesSync(): QuizCategory[] {
    return this.categoriesCache;
  }

  /**
   * Get all 12 Special Quiz Tracks
   */
  getQuizTracks(): QuizTrack[] {
    return SPECIAL_QUIZ_TRACKS;
  }

  /**
   * Look up a special track by ID
   */
  getTrackById(trackId: string): QuizTrack | undefined {
    return SPECIAL_QUIZ_TRACKS.find(t => t.id === trackId);
  }

  /**
   * Look up a category by ID
   */
  getCategoryById(catId: string): QuizCategory | undefined {
    return this.categoriesCache.find(c => c.id === catId);
  }

  /**
   * Seed categories to Firestore if collection is empty
   */
  async seedCategoriesToFirestore(): Promise<void> {
    try {
      const batch = firestore().batch();
      DEFAULT_QUIZ_CATEGORIES.forEach(cat => {
        const ref = firestore().collection('quiz_categories').doc(cat.id);
        batch.set(ref, cat, { merge: true });
      });
      await batch.commit();
      console.log('Seeded quiz_categories to Firestore successfully');
    } catch (e) {
      console.warn('Could not seed quiz_categories to Firestore:', e);
    }
  }

  /**
   * Pre-warm / pre-fetch questions in the background while the member configures or views the screen
   */
  prewarmQuiz(criteria: QuizFilterCriteria): void {
    AnthropicQuizService.prewarmQuiz(criteria);
  }

  /**
   * Fetch questions for an automatically generated quiz based on member criteria
   */
  async getAutomaticQuiz(criteria: QuizFilterCriteria): Promise<BibleQuestion[]> {
    // 🧠 1. PRIMARY: Generate fresh, non-repeating questions via Anthropic Claude AI
    try {
      const aiQuestions = await AnthropicQuizService.generateQuiz(criteria);
      if (aiQuestions && aiQuestions.length >= (criteria.questionCount || 5)) {
        console.log(`✨ [BibleQuizService] Successfully generated ${aiQuestions.length} unique questions with Anthropic Claude AI.`);
        return aiQuestions.slice(0, criteria.questionCount);
      }
    } catch (aiErr: any) {
      console.warn('⚠️ [BibleQuizService] Anthropic AI generation failed or offline, falling back to local pool:', aiErr?.message || aiErr);
    }

    let pool: BibleQuestion[] = VERIFIED_BIBLE_QUESTIONS.map(enrichQuestionTaxonomy);

    // Attempt to pull additional approved questions from Firestore (collection: bible_question_bank)
    try {
      let query: any = firestore().collection('bible_question_bank');
      if (criteria.testament && criteria.testament !== 'all') {
        query = query.where('testament', '==', criteria.testament);
      }
      if (criteria.difficulty && criteria.difficulty !== 'mixed') {
        query = query.where('difficulty', '==', criteria.difficulty);
      }
      const snapshot = await query.limit(50).get();
      if (!snapshot.empty) {
        const firestoreQuestions: BibleQuestion[] = snapshot.docs.map((doc: any) => 
          enrichQuestionTaxonomy({
            id: doc.id,
            ...doc.data()
          })
        );
        // Merge without duplicates
        const existingIds = new Set(pool.map(q => q.id));
        firestoreQuestions.forEach(q => {
          if (!existingIds.has(q.id)) {
            pool.push(q);
          }
        });
      }
    } catch (error) {
      console.log('Online questions fetch skipped or offline, using verified bank:', error);
    }

    // 1. Filter by Special Quiz Track (if selected)
    if (criteria.trackId) {
      const track = this.getTrackById(criteria.trackId);
      if (track && track.recommendedCategoryIds && track.recommendedCategoryIds.length > 0) {
        const trackFiltered = pool.filter(q => 
          q.categoryIds?.some(cid => track.recommendedCategoryIds!.includes(cid))
        );
        if (trackFiltered.length >= 3) {
          pool = trackFiltered;
        }
      }
    }

    // 2. Filter by Category (if selected and not 'all')
    if (criteria.categoryId && criteria.categoryId !== 'all') {
      const categoryFiltered = pool.filter(q => 
        q.categoryIds?.includes(criteria.categoryId!)
      );
      if (categoryFiltered.length >= 2) {
        pool = categoryFiltered;
      }
    }

    // 3. Filter by Subcategory (if selected and not 'all')
    if (criteria.subcategoryId && criteria.subcategoryId !== 'all') {
      const subFiltered = pool.filter(q => 
        q.subcategoryId === criteria.subcategoryId ||
        q.topic?.toLowerCase().includes(criteria.subcategoryId!.replace(/_/g, ' ').toLowerCase())
      );
      if (subFiltered.length >= 2) {
        pool = subFiltered;
      }
    }

    // 4. Filter by Testament Scope
    if (criteria.testament && criteria.testament !== 'all') {
      const testFiltered = pool.filter(q => q.testament === criteria.testament);
      if (testFiltered.length > 0) {
        pool = testFiltered;
      }
    }

    // 5. Filter by Book
    if (criteria.book && criteria.book !== 'All') {
      const bookFiltered = pool.filter(q => q.book.toLowerCase() === criteria.book?.toLowerCase());
      if (bookFiltered.length > 0) {
        pool = bookFiltered;
      }
    }

    // 6. Filter by Topic
    if (criteria.topic && criteria.topic !== 'All') {
      const topicFiltered = pool.filter(q => q.topic?.toLowerCase() === criteria.topic?.toLowerCase());
      if (topicFiltered.length >= 2) {
        pool = topicFiltered;
      }
    }

    // 7. Filter by Difficulty
    if (criteria.difficulty && criteria.difficulty !== 'mixed') {
      const diffFiltered = pool.filter(q => q.difficulty === criteria.difficulty);
      if (diffFiltered.length >= 2) {
        pool = diffFiltered;
      }
    }

    // Fallback if pool is empty
    if (pool.length === 0) {
      pool = VERIFIED_BIBLE_QUESTIONS.map(enrichQuestionTaxonomy);
    }

    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Ensure we supply the requested question count by topping up with general questions if needed
    let finalQuestions = shuffled.slice(0, criteria.questionCount);
    if (finalQuestions.length < criteria.questionCount && pool.length > 0) {
      const backupPool = [...VERIFIED_BIBLE_QUESTIONS].map(enrichQuestionTaxonomy);
      for (const q of backupPool) {
        if (!finalQuestions.some(item => item.id === q.id)) {
          finalQuestions.push(q);
        }
        if (finalQuestions.length >= criteria.questionCount) break;
      }
    }

    // Shuffle options for each question so answers are randomized
    const preparedQuestions = finalQuestions.map(q => {
      const shuffledOptions = [...q.options];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      return {
        ...q,
        options: shuffledOptions
      };
    });

    return preparedQuestions;
  }

  /**
   * 5-question Daily Challenge based on calendar date (AI Generated & Cached)
   */
  async getDailyQuiz(): Promise<BibleQuestion[]> {
    // 🌟 1. PRIMARY: Fetch or generate today's unique shared Daily Scripture Challenge with Claude AI
    try {
      const aiDailyQuestions = await AnthropicQuizService.getDailyQuiz();
      if (aiDailyQuestions && aiDailyQuestions.length >= 5) {
        console.log('✨ [BibleQuizService] Successfully loaded AI Daily Scripture Challenge.');
        return aiDailyQuestions.slice(0, 5);
      }
    } catch (aiErr: any) {
      console.warn('⚠️ [BibleQuizService] Anthropic Daily Challenge generation failed, falling back to date seed pool:', aiErr?.message || aiErr);
    }

    const today = new Date();
    // Deterministic pseudo-random seed based on YYYYMMDD
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    const count = 5;
    const pool = [...VERIFIED_BIBLE_QUESTIONS];
    const dailyQuestions: BibleQuestion[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
      const index = Math.abs(Math.sin(seed + i * 17) * pool.length) % pool.length | 0;
      let finalIndex = index;
      while (usedIndices.has(finalIndex)) {
        finalIndex = (finalIndex + 1) % pool.length;
      }
      usedIndices.add(finalIndex);
      dailyQuestions.push(pool[finalIndex]);
    }

    return dailyQuestions;
  }

  /**
   * Helper to recursively clean all undefined values for Firestore.
   * Also ensures nested arrays are flattened or JSON-stringified, because
   * Cloud Firestore strictly forbids arrays inside arrays or maps inside arrays containing arrays.
   */
  private sanitizeForFirestore(obj: any, insideArray: boolean = false): any {
    if (obj === undefined) {
      return null;
    }
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      if (insideArray) {
        // Nested array detected! Convert to JSON string so Firestore does not reject the document.
        try {
          return JSON.stringify(obj);
        } catch (_) {
          return [];
        }
      }
      return obj.map(item => this.sanitizeForFirestore(item, true));
    }
    const clean: { [key: string]: any } = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = this.sanitizeForFirestore(val, insideArray);
      }
    }
    return clean;
  }

  // ==========================================================================
  // FIRESTORE IS THE ONLY SOURCE OF TRUTH FOR QUIZ ATTEMPTS
  // A single real-time listener mirrors the `quiz_attempts` collection in memory.
  // - Every device reads the exact same documents -> identical points everywhere.
  // - Deleting a document in Firebase instantly updates every phone in real time.
  // - No AsyncStorage copies / "completed" flags that can go stale.
  // ==========================================================================
  private attempts: any[] = inMemoryCachedAttempts;
  private attemptsLoaded: boolean = inMemoryCachedAttempts.length > 0;
  private attemptsUnsubscribe: (() => void) | null = null;
  private attemptListeners = new Set<(attempts: any[], loaded: boolean) => void>();
  private deviceId: string = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Shared church competitions store
  private churchQuizzes: any[] = inMemoryCachedChurchQuizzes;
  private churchQuizzesLoaded: boolean = inMemoryCachedChurchQuizzes.length > 0;
  private churchQuizzesUnsubscribe: (() => void) | null = null;
  private churchQuizzesListeners = new Set<(quizzes: any[]) => void>();

  constructor() {
    this.restoreCachedData();
    this.initDeviceId();
    this.ensureListening();
    this.ensureChurchQuizzesListening();
    this.setupAppStateListener();
  }

  private restoreCachedData() {
    // 1. Attempts Cache Restore (instant 0ms startup)
    if (inMemoryCachedAttempts.length > 0) {
      this.attempts = inMemoryCachedAttempts;
      this.attemptsLoaded = true;
    } else {
      AsyncStorage.getItem(CACHED_FIRESTORE_ATTEMPTS_KEY)
        .then(stored => {
          if (stored && this.attempts.length === 0) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                inMemoryCachedAttempts = parsed;
                this.attempts = parsed;
                this.attemptsLoaded = true;
                this.notifyAttemptListeners();
              }
            } catch (_) {}
          }
        })
        .catch(() => {});
    }

    // 2. Church Quizzes Cache Restore (instant 0ms member view competitions)
    if (inMemoryCachedChurchQuizzes.length > 0) {
      this.churchQuizzes = inMemoryCachedChurchQuizzes;
      this.churchQuizzesLoaded = true;
    } else {
      AsyncStorage.getItem(CHURCH_QUIZZES_CACHE_KEY)
        .then(stored => {
          if (stored && this.churchQuizzes.length === 0) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                inMemoryCachedChurchQuizzes = parsed;
                this.churchQuizzes = parsed;
                this.churchQuizzesLoaded = true;
                this.notifyChurchQuizzesListeners();
              }
            } catch (_) {}
          }
        })
        .catch(() => {});
    }
  }

  private setupAppStateListener() {
    try {
      AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
          // Whenever the app resumes to foreground, sync smoothly in background
          this.fetchLatestAttempts().catch(() => {});
        }
      });
    } catch (e) {
      // Ignore if AppState unavailable
    }
  }

  private async initDeviceId() {
    try {
      let id = await AsyncStorage.getItem('@church_quiz_device_id');
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        await AsyncStorage.setItem('@church_quiz_device_id', id);
      }
      this.deviceId = id;
    } catch (e) {
      // Keep in-memory deviceId fallback
    }
  }

  /**
   * Resolve an individual distinct UID for this user/device
   */
  getEffectiveUid(userUid?: string | null): string {
    const authUid = auth().currentUser?.uid;
    if (userUid && userUid !== 'guest' && userUid !== 'unknown') return userUid;
    if (authUid) return authUid;
    return this.deviceId;
  }

  getTodayDateKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // --- Church Quizzes (Competitions) Shared Methods ---
  getSharedChurchQuizzes(): any[] {
    return this.churchQuizzes;
  }

  isChurchQuizzesLoaded(): boolean {
    return this.churchQuizzesLoaded;
  }

  setSharedChurchQuizzes(quizzes: any[]): void {
    const list = Array.isArray(quizzes) ? quizzes : [];
    this.churchQuizzes = list;
    inMemoryCachedChurchQuizzes = list;
    this.churchQuizzesLoaded = true;
    this.notifyChurchQuizzesListeners();
    AsyncStorage.setItem(CHURCH_QUIZZES_CACHE_KEY, JSON.stringify(list)).catch(() => {});
  }

  subscribeChurchQuizzes(listener: (quizzes: any[]) => void): () => void {
    this.ensureChurchQuizzesListening();
    this.churchQuizzesListeners.add(listener);
    listener(this.churchQuizzes);
    return () => {
      this.churchQuizzesListeners.delete(listener);
    };
  }

  private notifyChurchQuizzesListeners() {
    const current = this.churchQuizzes;
    this.churchQuizzesListeners.forEach(listener => {
      try {
        listener(current);
      } catch (_) {}
    });
  }

  private ensureChurchQuizzesListening() {
    if (this.churchQuizzesUnsubscribe) return;
    try {
      this.churchQuizzesUnsubscribe = firestore()
        .collection('church_quizzes')
        .onSnapshot(
          snapshot => {
            if (snapshot && !snapshot.empty) {
              const list = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((q: any) => (q.status === 'published' || q.status === 'scheduled') && q.status !== 'deleted' && !q.isDeleted);
              list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              this.setSharedChurchQuizzes(list);
            } else {
              this.setSharedChurchQuizzes([]);
            }
          },
          error => {
            console.log('Notice: church_quizzes onSnapshot notice:', error);
          }
        );
    } catch (e) {
      console.warn('Notice: Unable to start church_quizzes listener:', e);
    }
  }

  private parseAttemptDocument(data: any, docId: string): any {
    if (!data) return { id: docId };
    let parsedAnswers = data.answers || [];
    if (data.answersJson) {
      try {
        parsedAnswers = JSON.parse(data.answersJson);
      } catch (_) {}
    } else if (typeof data.answers === 'string') {
      try {
        parsedAnswers = JSON.parse(data.answers);
      } catch (_) {}
    }
    return {
      ...data,
      id: docId,
      answers: parsedAnswers
    };
  }

  /**
   * Start (once) the real-time listener on `quiz_attempts`.
   * Real-time mirror: Any add, update, or DELETION in Firebase Firestore
   * is instantly reflected in memory and propagates to the UI immediately.
   */
  private ensureListening() {
    if (this.attemptsUnsubscribe) return;
    try {
      this.attemptsUnsubscribe = firestore()
        .collection('quiz_attempts')
        .onSnapshot(
          snapshot => {
            const remoteAttempts = snapshot && snapshot.docs
              ? snapshot.docs.map(doc => this.parseAttemptDocument(doc.data(), doc.id))
              : [];
            this.attempts = remoteAttempts;
            inMemoryCachedAttempts = remoteAttempts;
            this.attemptsLoaded = true;
            this.notifyAttemptListeners();
            AsyncStorage.setItem(CACHED_FIRESTORE_ATTEMPTS_KEY, JSON.stringify(remoteAttempts)).catch(() => {});
          },
          error => {
            console.warn('Notice: quiz_attempts listener error:', error);
            if (this.attemptsUnsubscribe) {
              try { this.attemptsUnsubscribe(); } catch (_) {}
            }
            this.attemptsUnsubscribe = null;
            setTimeout(() => this.ensureListening(), 2000);
          }
        );
    } catch (e) {
      console.warn('Notice: Unable to start quiz_attempts listener:', e);
      this.attemptsUnsubscribe = null;
      setTimeout(() => this.ensureListening(), 2000);
    }
  }

  private notifyAttemptListeners() {
    const current = this.attempts;
    const loaded = this.attemptsLoaded;
    this.attemptListeners.forEach(listener => {
      try {
        listener(current, loaded);
      } catch (e) {
        // Ignore listener errors
      }
    });
  }

  /**
   * Subscribe to live quiz attempts from Firestore.
   * The listener is called immediately with the current mirror, then on every change.
   */
  subscribeAttempts(listener: (attempts: any[], loaded: boolean) => void): () => void {
    this.ensureListening();
    this.attemptListeners.add(listener);
    listener(this.attempts, this.attemptsLoaded);
    return () => {
      this.attemptListeners.delete(listener);
    };
  }

  /**
   * Wait until the first Firestore snapshot has arrived (or timeout).
   */
  private waitForAttempts(timeoutMs: number = 3000): Promise<void> {
    this.ensureListening();
    if (this.attemptsLoaded) return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.attemptListeners.delete(onUpdate);
        resolve();
      };
      const onUpdate = (_: any[], loaded: boolean) => {
        if (loaded) finish();
      };
      const timer = setTimeout(finish, timeoutMs);
      this.attemptListeners.add(onUpdate);
    });
  }

  /**
   * Live listener on the member's attempts in `quiz_attempts` (where uid == member).
   * Calls back true when a DAILY quiz exists with today's local date.
   * Resets automatically to false immediately if the document is deleted or when the date changes.
   */
  subscribeDailyCompletion(
    uid: string,
    onChange: (completedToday: boolean) => void,
    onInfo?: (info: string) => void
  ): () => void {
    const hasToday = (snap: any) =>
      !!snap && !!snap.docs && snap.docs.some((d: any) => {
        const data = d.data();
        return data && data.quizType === 'daily' && this.isSameLocalDay(data.completedAt);
      });

    try {
      return firestore()
        .collection('quiz_attempts')
        .where('uid', '==', uid)
        .onSnapshot(
          snap => {
            const done = hasToday(snap);
            onChange(done);
            onInfo?.(`today=${this.getTodayDateKey()} docs=${snap?.docs?.length ?? 0} done=${done}`);
          },
          err => {
            console.warn('daily completion listener error:', err);
            onInfo?.(`err=${(err as any)?.code || String(err)}`);
          }
        );
    } catch (e) {
      onInfo?.(`initErr=${String(e)}`);
      return () => {};
    }
  }

  isAttemptsLoaded(): boolean {
    return this.attemptsLoaded;
  }

  /**
   * Return the in-memory array of live Firestore quiz attempts
   */
  getLoadedAttempts(): any[] {
    return this.attempts;
  }

  /**
   * Fetch the latest attempts directly from Cloud Firestore `quiz_attempts`.
   */
  async fetchLatestAttempts(targetUserId?: string | null): Promise<any[]> {
    this.ensureListening();
    try {
      const getPromise = firestore().collection('quiz_attempts').get();
      const snapshot = await Promise.race([
        getPromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('fetchLatestAttempts timeout')), 5000))
      ]);

      const remoteAttempts: any[] = [];
      if (snapshot && snapshot.docs) {
        snapshot.docs.forEach((doc: any) => {
          remoteAttempts.push(this.parseAttemptDocument(doc.data(), doc.id));
        });
      }

      this.attempts = remoteAttempts;
      this.attemptsLoaded = true;
      this.notifyAttemptListeners();
      return this.attempts;
    } catch (e) {
      console.warn('Notice: Firestore fetchLatestAttempts error:', e);
    }
    return this.attempts;
  }

  private isSameLocalDay(value: any, ref: Date = new Date()): boolean {
    if (!value) return false;
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === ref.getFullYear() &&
      d.getMonth() === ref.getMonth() &&
      d.getDate() === ref.getDate()
    );
  }

  /**
   * Robust, individual matcher across Firebase Auth UID, Salesforce ID, Phone Number, Device ID, and Member Name.
   * Ensures the current user's quizzes always match them accurately, while strictly preventing
   * cross-matching with other church members.
   */
  isAttemptMatchingUser(
    attempt: any, 
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null
  ): boolean {
    if (!attempt) return false;
    const attUid = attempt.uid;
    const authUid = auth().currentUser?.uid;

    const isGenericUid = (id?: string | null) => !id || id === 'guest' || id === 'unknown' || id === 'individual_member';

    // 1. Direct UID match with passed userUid (could be Firebase UID or Salesforce ID)
    if (!isGenericUid(userUid) && !isGenericUid(attUid) && attUid === userUid) {
      return true;
    }

    // 2. Direct UID match with current Firebase Auth UID
    if (!isGenericUid(authUid) && !isGenericUid(attUid) && attUid === authUid) {
      return true;
    }

    // 3. Match by verified Phone Number (10+ digits suffix match)
    if (memberPhone && attempt.memberPhone) {
      const cleanA = String(memberPhone).replace(/[^0-9]/g, '');
      const cleanB = String(attempt.memberPhone).replace(/[^0-9]/g, '');
      if (cleanA.length >= 10 && cleanB.length >= 10 && (cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA))) {
        return true;
      }
    }

    // 4. Direct match with persistent Device ID (for unauthenticated attempts on this phone)
    if (this.deviceId && attUid === this.deviceId) {
      return true;
    }

    // 5. Strict Real Member Name match (ONLY if name is NOT a generic placeholder)
    const isGenericName = (n?: string | null) => {
      if (!n) return true;
      const lower = n.trim().toLowerCase();
      return lower === '' || lower === 'church member' || lower === 'member' || lower === 'you' || lower === 'guest' || lower === 'unknown';
    };

    if (!isGenericName(memberName) && !isGenericName(attempt.memberName)) {
      if (memberName!.trim().toLowerCase() === attempt.memberName!.trim().toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Synchronous check derived directly from the live Firestore mirror
   */
  isDailyCompletedTodaySync(
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null
  ): boolean {
    return this.isDailyCompletedIn(this.attempts, userUid, memberName, memberPhone);
  }

  isDailyCompletedIn(
    attempts: any[], 
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null
  ): boolean {
    const now = new Date();
    return (attempts || []).some(att =>
      att &&
      att.quizType === 'daily' &&
      this.isAttemptMatchingUser(att, userUid, memberName, memberPhone) &&
      this.isSameLocalDay(att.completedAt, now)
    );
  }

  /**
   * Start the live listener early and sync from Firestore server
   */
  async preloadLeaderboard(): Promise<void> {
    await this.fetchLatestAttempts();
  }

  /**
   * Synchronously compute the leaderboard from the live mirror
   */
  getCachedLeaderboard(
    scope: 'global' | 'church' | 'daily' | 'weekly' | 'monthly' = 'global',
    currentUserId?: string,
    currentUserName?: string,
    userChurch?: string,
    currentUserPhoto?: string
  ): { entries: LeaderboardEntry[]; currentUserEntry: LeaderboardEntry | null } | null {
    this.ensureListening();
    if (!this.attemptsLoaded && this.attempts.length === 0) return null;
    return this.processLeaderboardAttempts(
      this.attempts,
      scope,
      currentUserId,
      currentUserName,
      userChurch,
      currentUserPhoto
    );
  }

  /**
   * Save a completed quiz attempt directly to Cloud Firestore.
   * Eliminates nested arrays by storing a flat answers summary alongside
   * complete answersJson, ensuring Firestore never rejects the write.
   */
  async saveQuizAttempt(attempt: QuizAttempt, userUid?: string): Promise<void> {
    const effectiveUid = this.getEffectiveUid(userUid || attempt.uid);
    const attemptWithUid: QuizAttempt = {
      ...attempt,
      uid: effectiveUid
    };

    this.ensureListening();

    // 1. Optimistic in-memory update for instant 0ms UI feedback
    this.attempts = [attemptWithUid, ...this.attempts.filter(a => a.id !== attemptWithUid.id)];
    inMemoryCachedAttempts = this.attempts;
    this.notifyAttemptListeners();
    AsyncStorage.setItem(CACHED_FIRESTORE_ATTEMPTS_KEY, JSON.stringify(this.attempts)).catch(() => {});

    // 2. Persist to Firestore:
    //    a) Global `quiz_attempts` (for Church Leaderboard & general statistics)
    //    b) Member's `users/{targetUserId}/quiz_attempts` subcollection (per-member quiz history)
    // 2. Persist to Cloud Firestore:
    //    All quiz details are kept exclusively in `quiz_attempts` with user name, uid, phone, etc.
    //    Nothing is stored in the users collection, ensuring clean deletion and real-time synchronization.
    try {
      // Flatten answers so there are ZERO nested arrays inside answers array (which Firestore strictly rejects)
      const rawAnswers = attemptWithUid.answers || [];
      const flatAnswers = rawAnswers.map(ans => ({
        questionId: String(ans.questionId || ''),
        questionText: String(ans.questionText || ''),
        selectedOptionId: ans.selectedOptionId ? String(ans.selectedOptionId) : null,
        correctOptionId: String(ans.correctOptionId || ''),
        isCorrect: Boolean(ans.isCorrect),
        verseReference: String(ans.verseReference || ''),
        explanation: String(ans.explanation || ''),
        book: String(ans.book || ''),
        chapter: Number(ans.chapter || 0)
      }));

      const answersJson = JSON.stringify(rawAnswers);

      const payload = this.sanitizeForFirestore({
        ...attemptWithUid,
        answers: flatAnswers,
        answersJson,
        syncedAt: new Date().toISOString()
      });

      await firestore()
        .collection('quiz_attempts')
        .doc(attemptWithUid.id)
        .set(payload);

      console.log('🏁 [Quiz] Saved exclusively to quiz_attempts:', attemptWithUid.id);
    } catch (e) {
      console.error('❌ [Quiz] Firestore save error:', e);
    }
  }

  /**
   * Quiz History for a member, read from Cloud Firestore
   */
  async getQuizHistory(
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null, 
    forceRefresh: boolean = false
  ): Promise<QuizAttempt[]> {
    if (forceRefresh || !this.attemptsLoaded) {
      await this.fetchLatestAttempts(userUid);
    } else {
      await this.waitForAttempts();
    }
    return this.getUserAttempts(this.attempts, userUid, memberName, memberPhone);
  }

  getUserAttempts(
    attempts: any[], 
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null
  ): QuizAttempt[] {
    const userAttempts = (attempts || []).filter(att =>
      this.isAttemptMatchingUser(att, userUid, memberName, memberPhone)
    );
    userAttempts.sort((a, b) => {
      const timeA = new Date(a.completedAt || 0).getTime();
      const timeB = new Date(b.completedAt || 0).getTime();
      return timeB - timeA;
    });
    return userAttempts;
  }

  /**
   * Quiz Stats calculated from the member's Firestore attempts
   */
  async getQuizStats(
    userUid?: string | null, 
    memberName?: string | null, 
    memberPhone?: string | null
  ): Promise<QuizStats> {
    const history = await this.getQuizHistory(userUid, memberName, memberPhone);
    return this.computeStats(history);
  }

  computeStats(history: QuizAttempt[]): QuizStats {
    const defaultStats: QuizStats = {
      totalQuizzesTaken: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      totalPoints: 0,
      averageAccuracy: 0,
      bestScore: 0,
      streakDays: 0,
      lastPlayedDate: null
    };

    try {
      if (!history || history.length === 0) {
        return defaultStats;
      }

      const toLocalKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let totalQuestions = 0;
      let totalCorrect = 0;
      let bestScore = 0;
      const playedDates = new Set<string>();

      history.forEach(att => {
        totalQuestions += att.totalQuestions || 0;
        totalCorrect += att.correctCount || 0;
        bestScore = Math.max(bestScore, att.percentage || 0);
        if (att.completedAt) {
          const d = new Date(att.completedAt);
          if (!isNaN(d.getTime())) playedDates.add(toLocalKey(d));
        }
      });

      // Streak: consecutive days ending today (or yesterday)
      let streak = 0;
      const checkDate = new Date();
      if (!playedDates.has(toLocalKey(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (playedDates.has(toLocalKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const sortedDates = Array.from(playedDates).sort().reverse();

      return {
        totalQuizzesTaken: history.length,
        totalQuestionsAnswered: totalQuestions,
        totalCorrect,
        totalPoints: totalCorrect * 2,
        averageAccuracy: Math.round((totalCorrect / Math.max(1, totalQuestions)) * 100),
        bestScore,
        streakDays: streak,
        lastPlayedDate: sortedDates[0] || null
      };
    } catch (e) {
      console.error('Error computing quiz stats:', e);
      return defaultStats;
    }
  }

  /**
   * Check if the member has completed today's daily quiz (from Firestore)
   */
  async hasCompletedDailyQuizToday(userUid?: string | null, memberName?: string | null): Promise<boolean> {
    await this.fetchLatestAttempts();
    return this.isDailyCompletedTodaySync(userUid, memberName);
  }

  /**
   * Pure deterministic leaderboard calculation from attempts
   * Same Firestore documents in -> identical rankings & points on every device.
   */

  /**
   * Check if date falls in current calendar week (Monday 00:00:00 to Sunday 23:59:59)
   */
  isDateInCurrentWeek(dateInput?: string | Date | null, refDate = new Date()): boolean {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    const time = d.getTime();
    if (isNaN(time)) return false;

    // refDate day: 0 = Sun, 1 = Mon, ..., 6 = Sat
    const refDay = refDate.getDay();
    const diffToMonday = refDay === 0 ? -6 : 1 - refDay;

    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return time >= monday.getTime() && time <= sunday.getTime();
  }

  /**
   * Check if date falls in current calendar month (Day 1 00:00:00 to Day 30/31 23:59:59)
   */
  isDateInCurrentMonth(dateInput?: string | Date | null, refDate = new Date()): boolean {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === refDate.getFullYear() &&
      d.getMonth() === refDate.getMonth()
    );
  }

  /**
   * Pure deterministic leaderboard calculation from attempts
   * Same Firestore documents in -> identical rankings & points on every device.
   */
  processLeaderboardAttempts(
    attempts: any[],
    scope: 'global' | 'church' | 'daily' | 'weekly' | 'monthly' = 'global',
    currentUserId?: string,
    currentUserName?: string,
    userChurch?: string,
    currentUserPhoto?: string
  ): { entries: LeaderboardEntry[]; currentUserEntry: LeaderboardEntry } {
    const effectiveUid = currentUserId || auth().currentUser?.uid || 'current_user';
    const effectiveName = currentUserName || auth().currentUser?.displayName || 'You';
    const effectivePhoto = currentUserPhoto || auth().currentUser?.photoURL || undefined;

    // 1. De-duplicate by document id, include all valid completed attempts
    const seen = new Set<string>();
    const qualifyingAttempts = (attempts || []).filter(att => {
      if (!att) return false;
      if (att.id) {
        if (seen.has(att.id)) return false;
        seen.add(att.id);
      }
      const pct = Number(att.percentage ?? 0);
      return pct >= 0 && pct <= 100 && (att.uid || att.memberName);
    });

    // 2. Filter by Scope
    const now = new Date();

    const scopedAttempts = qualifyingAttempts.filter(att => {
      if (!att.completedAt) return scope === 'global' || scope === 'church';

      if (scope === 'daily') {
        // Today's contest
        return this.isSameLocalDay(att.completedAt, now);
      } else if (scope === 'weekly') {
        // Monday 00:00:00 to Sunday 23:59:59
        return this.isDateInCurrentWeek(att.completedAt, now);
      } else if (scope === 'monthly') {
        // Day 1 00:00:00 to Month End (30/31) 23:59:59
        return this.isDateInCurrentMonth(att.completedAt, now);
      } else if (scope === 'church') {
        if (!userChurch || !att.churchName) return true;
        const attChurch = String(att.churchName || '').trim().toLowerCase();
        const myChurch = String(userChurch).trim().toLowerCase();
        if (!attChurch || !myChurch) return true;
        return attChurch === myChurch || attChurch.includes(myChurch) || myChurch.includes(attChurch);
      }
      return true; // 'global'
    });

    // 3. Aggregate by Member (UID or memberName)
    const memberMap: Record<string, {
      uid: string;
      name: string;
      avatarUrl?: string;
      church?: string;
      points: number;
      completedCount: number;
      totalScore: number;
      totalQuestions: number;
      averageAccuracy: number;
      averageScore: string;
      isCurrentUser: boolean;
    }> = {};

    scopedAttempts.forEach(att => {
      const uid = att.uid || att.memberName || 'unknown';
      const isCurrent = Boolean(
        (effectiveUid && att.uid && att.uid === effectiveUid) ||
        (effectiveName && att.memberName && att.memberName === effectiveName)
      );

      if (!memberMap[uid]) {
        const safeMemberName = (att.memberName && att.memberName.trim().length > 0 && att.memberName.trim() !== 'You')
          ? att.memberName.trim()
          : (isCurrent ? (effectiveName || 'Church Member') : 'Church Member');

        memberMap[uid] = {
          uid,
          name: safeMemberName,
          avatarUrl: att.memberPhotoUrl || (isCurrent ? effectivePhoto : undefined),
          church: att.churchName || (isCurrent ? userChurch : undefined),
          points: 0,
          completedCount: 0,
          totalScore: 0,
          totalQuestions: 0,
          averageAccuracy: 0,
          averageScore: '0%',
          isCurrentUser: isCurrent
        };
      }

      // 2 points per each question correctly answered
      const score = Number(att.score ?? att.correctCount) || 0;
      const totalQ = Number(att.totalQuestions) || Math.max(score, 5);
      const earnedPoints = Math.round(score * 2);

      memberMap[uid].points += earnedPoints;
      memberMap[uid].totalScore += score;
      memberMap[uid].totalQuestions += totalQ;
      memberMap[uid].completedCount += 1;

      if (!memberMap[uid].avatarUrl && att.memberPhotoUrl) {
        memberMap[uid].avatarUrl = att.memberPhotoUrl;
      }
      if (att.memberName && att.memberName.trim().length > 0 && att.memberName.trim() !== 'You' && (memberMap[uid].name === 'Church Member' || !memberMap[uid].name)) {
        memberMap[uid].name = att.memberName.trim();
      }
      if (isCurrent && effectiveName && effectiveName.trim().length > 0 && effectiveName !== 'You' && (memberMap[uid].name === 'Church Member' || !memberMap[uid].name)) {
        memberMap[uid].name = effectiveName.trim();
      }
    });

    // Compute average score & accuracy for each member
    Object.values(memberMap).forEach(m => {
      const avg = m.totalQuestions > 0 ? Math.round((m.totalScore / m.totalQuestions) * 100) : 0;
      m.averageAccuracy = avg;
      m.averageScore = `${avg}%`;
    });

    // 4. Sort and Separate:
    // Contestants with averageAccuracy >= 50% are QUALIFIERS (eligible for podium Ranks 1-3).
    // Contestants with averageAccuracy < 50% are NON-QUALIFIERS (displayed in table, starting at Rank 4+).
    const isAverageScoped = scope === 'daily' || scope === 'weekly' || scope === 'monthly';

    const sortFn = (a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (isAverageScoped) {
        if ((b.averageAccuracy ?? 0) !== (a.averageAccuracy ?? 0)) {
          return (b.averageAccuracy ?? 0) - (a.averageAccuracy ?? 0);
        }
        if (b.points !== a.points) return b.points - a.points;
      } else {
        if (b.points !== a.points) return b.points - a.points;
        if ((b.averageAccuracy ?? 0) !== (a.averageAccuracy ?? 0)) {
          return (b.averageAccuracy ?? 0) - (a.averageAccuracy ?? 0);
        }
      }
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return String(a.name).localeCompare(String(b.name));
    };

    const allMembers = Object.values(memberMap);
    const qualifiers: LeaderboardEntry[] = allMembers.filter(m => (m.averageAccuracy ?? 0) >= 50).sort(sortFn);
    const nonQualifiers: LeaderboardEntry[] = allMembers.filter(m => (m.averageAccuracy ?? 0) < 50).sort(sortFn);

    // 5. Assign Ranks:
    // Qualifiers claim Ranks 1, 2, 3...
    // Non-qualifiers (< 50%) cannot claim top 3 podium spots; their ranks start at Math.max(4, qualifiers.length + 1)
    const rankedQualifiers = qualifiers.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isCurrentUser: Boolean(effectiveUid && item.uid === effectiveUid)
    }));

    const baseNonQualifierRank = Math.max(4, qualifiers.length + 1);
    const rankedNonQualifiers = nonQualifiers.map((item, idx) => ({
      ...item,
      rank: baseNonQualifierRank + idx,
      isCurrentUser: Boolean(effectiveUid && item.uid === effectiveUid)
    }));

    const entries: LeaderboardEntry[] = [...rankedQualifiers, ...rankedNonQualifiers];

    // 6. Determine current user's entry (for bottom sticky bar)
    let currentUserEntry = entries.find(e => e.isCurrentUser || (effectiveUid && e.uid === effectiveUid)) || null;
    if (!currentUserEntry) {
      currentUserEntry = {
        uid: effectiveUid,
        name: effectiveName,
        points: 0,
        completedCount: 0,
        averageAccuracy: 0,
        averageScore: '0%',
        avatarUrl: effectivePhoto,
        isCurrentUser: true,
        rank: undefined
      };
    }

    return {
      entries,
      currentUserEntry
    };
  }

  /**
   * Real-time Leaderboard subscription (driven by the shared Firestore listener)
   */
  subscribeLeaderboard(
    scope: 'global' | 'church' | 'daily' | 'weekly' | 'monthly' = 'global',
    currentUserId?: string,
    currentUserName?: string,
    userChurch?: string,
    currentUserPhoto?: string,
    onUpdate: (data: { entries: LeaderboardEntry[]; currentUserEntry: LeaderboardEntry | null }) => void = () => {}
  ): () => void {
    return this.subscribeAttempts((attempts, loaded) => {
      if (!loaded) return;
      onUpdate(
        this.processLeaderboardAttempts(
          attempts,
          scope,
          currentUserId,
          currentUserName,
          userChurch,
          currentUserPhoto
        )
      );
    });
  }

  /**
   * Fetch Leaderboard filtered by 50% - 100% scores and scope.
   * forceRefresh pulls straight from the Firestore server (pull-to-refresh).
   */
  async getLeaderboard(
    scope: 'global' | 'church' | 'daily' | 'weekly' | 'monthly' = 'global',
    currentUserId?: string,
    currentUserName?: string,
    userChurch?: string,
    currentUserPhoto?: string,
    forceRefresh: boolean = false
  ): Promise<{ entries: LeaderboardEntry[]; currentUserEntry: LeaderboardEntry | null }> {
    if (forceRefresh || !this.attemptsLoaded) {
      await this.fetchLatestAttempts();
    } else {
      await this.waitForAttempts();
    }
    return this.processLeaderboardAttempts(
      this.attempts,
      scope,
      currentUserId,
      currentUserName,
      userChurch,
      currentUserPhoto
    );
  }

  /**
   * Complete 66 Bible books categorized by Testament
   */
  getAvailableBooks(scope: TestamentScope = 'all'): string[] {
    if (scope === 'ot') {
      return ['All', ...BIBLE_BOOKS_OT];
    }
    if (scope === 'nt') {
      return ['All', ...BIBLE_BOOKS_NT];
    }
    return ['All', ...BIBLE_BOOKS_ALL];
  }

  /**
   * Available Bible topics
   */
  getAvailableTopics(): string[] {
    const topics = new Set(VERIFIED_BIBLE_QUESTIONS.map(q => q.topic).filter(Boolean) as string[]);
    return ['All', ...Array.from(topics).sort()];
  }
}

/**
 * Canonical 39 Old Testament books
 */
export const BIBLE_BOOKS_OT: string[] = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', 
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];

/**
 * Canonical 27 New Testament books
 */
export const BIBLE_BOOKS_NT: string[] = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', 
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 
  'Jude', 'Revelation'
];

/**
 * All 66 Books of the Holy Bible in Canonical Order
 */
export const BIBLE_BOOKS_ALL: string[] = [...BIBLE_BOOKS_OT, ...BIBLE_BOOKS_NT];

export default new BibleQuizService();
