import { QuizCategory, QuizTrack } from '../types/quiz';

/**
 * 15 ADVANCED BIBLE QUIZ CATEGORIES
 * Built for Church of God app: covering all 66 books, doctrines, characters,
 * spiritual life, prophecy, relationships, practical living, and specialized tracks.
 */
export const DEFAULT_QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'complete_bible',
    title: 'Complete Bible Knowledge',
    subtitle: 'Overview, Structure, Geography & Chronology',
    icon: 'BookOpen',
    color: '#4f46e5', // Deep Indigo
    testamentScope: 'all',
    order: 1,
    subcategories: [
      {
        id: 'bible_overview',
        name: 'Bible Overview & Structure',
        description: '66 books, authorship, divisions, and overarching themes',
        topics: ['Canon Formation', 'Testament Divisions', 'Authors & Eras', 'Key Themes']
      },
      {
        id: 'book_mastery',
        name: 'Book-by-Book Mastery',
        description: 'Deep mastery of individual books and major passages',
        topics: ['Genesis to Revelation', 'Chapter Keys', 'Major Outlines', 'Signature Verses']
      },
      {
        id: 'bible_chronology',
        name: 'Bible Chronology & Timelines',
        description: 'Sequential events, historical eras, and biblical timelines',
        topics: ['Creation to Exile', 'Exile to Christ', 'Apostolic Age', 'Generations']
      },
      {
        id: 'bible_geography',
        name: 'Bible Geography & Places',
        description: 'Cities, mountains, rivers, journeys, and kingdoms',
        topics: ['Holy Land Geography', 'Paul\'s Missionary Routes', 'Exodus Journey', 'Biblical Mountains']
      }
    ]
  },
  {
    id: 'ot_studies',
    title: 'Old Testament Studies',
    subtitle: 'Torah, History, Poetry & All 39 Books',
    icon: 'Scroll',
    color: '#f59e0b', // Warm Golden Amber
    testamentScope: 'ot',
    order: 2,
    subcategories: [
      {
        id: 'pentateuch',
        name: 'Pentateuch / Torah',
        description: 'Genesis, Exodus, Leviticus, Numbers, Deuteronomy',
        topics: ['Genesis Origins', 'Exodus Deliverance', 'Levitical Law', 'Wilderness Wandering']
      },
      {
        id: 'ot_historical',
        name: 'Historical Books',
        description: 'Joshua through Esther: conquest, judges, kings, and restoration',
        topics: ['Conquest of Canaan', 'Judges of Israel', 'United Monarchy', 'Divided Kingdoms', 'Return from Exile']
      },
      {
        id: 'ot_poetry_wisdom',
        name: 'Poetry & Wisdom',
        description: 'Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon',
        topics: ['Davidic Psalms', 'Solomonic Proverbs', 'Job\'s Trial', 'Ecclesiastes Reflections']
      },
      {
        id: 'major_prophets',
        name: 'Major Prophets',
        description: 'Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel',
        topics: ['Isaiah\'s Messianic Visions', 'Jeremiah\'s Weeping', 'Ezekiel\'s Glory of God', 'Daniel in Babylon']
      },
      {
        id: 'minor_prophets',
        name: 'Minor Prophets',
        description: 'Hosea through Malachi: the 12 prophetic voices',
        topics: ['Hosea\'s Faithfulness', 'Jonah at Nineveh', 'Micah\'s Justice', 'Malachi\'s Final Call']
      },
      {
        id: 'creation_humanity',
        name: 'Creation & Early Humanity',
        description: 'Adam and Eve, the Fall, Noah, the Ark, and Babel',
        topics: ['Creation Days', 'Garden of Eden', 'Noah\'s Ark & Flood', 'Tower of Babel']
      },
      {
        id: 'patriarchs_covenants',
        name: 'Patriarchs & Covenants',
        description: 'Abraham, Isaac, Jacob, Joseph, and the divine covenants',
        topics: ['Abrahamic Covenant', 'Isaac & Rebekah', 'Jacob & Israel', 'Joseph in Egypt']
      },
      {
        id: 'exodus_wilderness',
        name: 'Exodus & Wilderness',
        description: 'Moses, the 10 Plagues, Passover, Red Sea, and Sinai',
        topics: ['The Ten Plagues', 'The Passover Lamb', 'Crossing the Red Sea', 'Manna and Water from Rock']
      },
      {
        id: 'judges_kings',
        name: 'Israel\'s Judges & Kings',
        description: 'Gideon, Samson, Saul, David, Solomon, Hezekiah, Josiah',
        topics: ['David & Goliath', 'Solomon\'s Temple', 'Elijah & Mount Carmel', 'Elisha\'s Miracles']
      },
      {
        id: 'ot_laws_festivals',
        name: 'Old Testament Laws & Festivals',
        description: 'Ten Commandments, feasts, priesthood, and tabernacle rituals',
        topics: ['Ten Commandments', 'Feast of Tabernacles', 'Day of Atonement', 'High Priest Garments']
      },
      {
        id: 'ot_prophecies',
        name: 'Prophets & Fulfilled Prophecies',
        description: 'Prophetic messages, historical fulfillment, and Messianic promises',
        topics: ['Prophecies of Christ', 'Prophecies of Babylon & Assyria', 'Restoration of Jerusalem']
      }
    ]
  },
  {
    id: 'nt_studies',
    title: 'New Testament Studies',
    subtitle: 'Gospels, Epistles, Acts & All 27 Books',
    icon: 'BookMarked',
    color: '#9333ea', // Royal Purple / Violet
    testamentScope: 'nt',
    order: 3,
    subcategories: [
      {
        id: 'gospels',
        name: 'The Four Gospels',
        description: 'Matthew, Mark, Luke, John: Jesus\' ministry from 4 perspectives',
        topics: ['Matthew\'s Messiah', 'Mark\'s Servant', 'Luke\'s Son of Man', 'John\'s Son of God']
      },
      {
        id: 'early_life_jesus',
        name: 'Birth & Early Life of Jesus',
        description: 'Annunciation, Bethlehem birth, baptism, and 40 days wilderness temptation',
        topics: ['Nativity & Shepherds', 'Simeon & Anna', 'Jesus at Age 12', 'Baptism in the Jordan', 'Temptation in the Desert']
      },
      {
        id: 'teachings_parables',
        name: 'Teachings & Parables of Jesus',
        description: 'Sermon on the Mount, Kingdom parables, Beatitudes',
        topics: ['The Beatitudes', 'Good Samaritan', 'Prodigal Son', 'The Sower & Soils', 'The Pearl of Great Price']
      },
      {
        id: 'miracles_jesus',
        name: 'Miracles of Jesus',
        description: 'Healings, nature miracles, feeding multitudes, raising the dead',
        topics: ['Water to Wine', 'Walking on Water', 'Feeding the 5000', 'Lazarus Raised', 'Blind Bartimaeus']
      },
      {
        id: 'passion_resurrection',
        name: 'Death & Resurrection of Jesus',
        description: 'Last Supper, Gethsemane, Crucifixion, Empty Tomb, Ascension',
        topics: ['The Upper Room', 'Garden of Gethsemane', 'Trial before Pilate', 'Calvary Cross', 'The Empty Tomb', 'Ascension to Heaven']
      },
      {
        id: 'acts_early_church',
        name: 'Acts & Early Church',
        description: 'Pentecost, apostolic miracles, Paul\'s conversion, missionary journeys',
        topics: ['Day of Pentecost', 'Stephen\'s Martyrdom', 'Road to Damascus', 'Peter and Cornelius', 'Philippian Jailer']
      },
      {
        id: 'pauls_letters',
        name: 'Paul\'s Letters',
        description: 'Romans through Philemon: theology, grace, and church guidance',
        topics: ['Romans Road to Salvation', '1 Corinthians Love Chapter', 'Ephesians Armor of God', 'Philippians Joy']
      },
      {
        id: 'general_epistles',
        name: 'General Epistles',
        description: 'Hebrews, James, 1–2 Peter, 1–3 John, Jude',
        topics: ['Hebrews Heroes of Faith', 'James on Faith & Works', 'Peter on Living Hope', 'John on Walking in Light']
      },
      {
        id: 'nt_church_leadership',
        name: 'Church Leadership & Ministry',
        description: 'Pastoral epistles (Timothy, Titus), elders, deacons, spiritual gifts',
        topics: ['Pastoral Qualifications', 'Deacons & Elders', 'Spiritual Gifts in Order', 'Good Soldier of Christ']
      },
      {
        id: 'revelation_eschatology',
        name: 'Revelation & Last Things',
        description: 'Letters to seven churches, throne room, visions, new creation',
        topics: ['Seven Churches of Asia', 'Heavenly Throne & Lamb', 'Seven Seals & Trumpets', 'New Jerusalem']
      }
    ]
  },
  {
    id: 'bible_characters',
    title: 'Bible Characters & Biographies',
    subtitle: 'Patriarchs, Heroes, Prophets, Apostles & Kings',
    icon: 'Users',
    color: '#0284c7', // Sky Blue
    testamentScope: 'all',
    order: 4,
    subcategories: [
      {
        id: 'char_patriarchs',
        name: 'Patriarchs',
        description: 'Abraham, Isaac, Jacob, and Joseph',
        topics: ['Abraham Father of Faith', 'Isaac\'s Blessing', 'Jacob\'s Wrestling', 'Joseph the Ruler']
      },
      {
        id: 'women_of_bible',
        name: 'Women of the Bible',
        description: 'Sarah, Rebekah, Deborah, Ruth, Hannah, Esther, Mary, Priscilla',
        topics: ['Deborah the Judge', 'Ruth\'s Loyalty', 'Queen Esther\'s Courage', 'Mary Mother of Jesus']
      },
      {
        id: 'kings_rulers',
        name: 'Kings & Rulers',
        description: 'Saul, David, Solomon, Hezekiah, Josiah, Nebuchadnezzar, Herod',
        topics: ['King David A Man After God\'s Heart', 'Solomon\'s Reign', 'King Josiah\'s Reform', 'Cyrus King of Persia']
      },
      {
        id: 'char_prophets',
        name: 'Prophets',
        description: 'Elijah, Elisha, Isaiah, Jeremiah, Daniel, John the Baptist',
        topics: ['Elijah the Tishbite', 'Elisha\'s Double Portion', 'Jeremiah in the Cistern', 'John the Baptist Voice in Desert']
      },
      {
        id: 'apostles_disciples',
        name: 'Apostles & Disciples',
        description: 'Peter, John, James, Andrew, Thomas, Matthew, Paul',
        topics: ['Simon Peter the Rock', 'John the Beloved', 'Doubting Thomas', 'Apostle Paul']
      },
      {
        id: 'faith_heroes',
        name: 'Faith Heroes',
        description: 'Abel, Enoch, Noah, Moses, Rahab, Gideon, Samson',
        topics: ['Enoch Walked with God', 'Rahab\'s Scarlet Cord', 'Gideon\'s 300 Men', 'Moses the Deliverer']
      },
      {
        id: 'villains_opponents',
        name: 'Bible Villains & Opponents',
        description: 'Pharaoh, Goliath, Jezebel, Haman, Judas Iscariot',
        topics: ['Hardened Heart of Pharaoh', 'Goliath of Gath', 'Wicked Queen Jezebel', 'Judas\' Betrayal']
      },
      {
        id: 'genealogies',
        name: 'Family Trees & Genealogies',
        description: 'Lineage of Jesus, tribes of Israel, and biblical heritage',
        topics: ['Lineage of David', 'Matthew 1 Genealogy', 'Twelve Sons of Jacob', 'Levitical Priesthood Line']
      },
      {
        id: 'character_comparisons',
        name: 'Character Comparisons',
        description: 'Contrasting faithful vs unfaithful choices and leadership',
        topics: ['Saul vs David', 'Peter vs Judas', 'Mary vs Martha', 'Cain vs Abel']
      }
    ]
  },
  {
    id: 'theology_doctrines',
    title: 'Theology & Core Doctrines',
    subtitle: 'God, Christ, Holy Spirit, Salvation & Covenants',
    icon: 'Shield',
    color: '#dc2626', // Crimson Red
    testamentScope: 'all',
    order: 5,
    subcategories: [
      {
        id: 'attributes_of_god',
        name: 'Nature & Attributes of God',
        description: 'Holiness, sovereignty, omnipotence, omnipresence, love, justice',
        topics: ['God is Holy', 'God is Love', 'Sovereign King', 'Merciful & Gracious']
      },
      {
        id: 'holy_trinity',
        name: 'The Trinity',
        description: 'Biblical foundation of the Father, Son, and Holy Spirit',
        topics: ['One God in Three Persons', 'Baptism of Jesus', 'The Great Commission Triune Formula']
      },
      {
        id: 'christology',
        name: 'Jesus Christ & His Divinity',
        description: 'Incarnation, deity, atonement, resurrection, and Lordship of Christ',
        topics: ['The Word Made Flesh', 'The Lamb of God', 'King of Kings', 'High Priest Forever']
      },
      {
        id: 'salvation_redemption',
        name: 'Salvation & Redemption',
        description: 'Sin, grace, repentance, faith, justification, sanctification',
        topics: ['Saved by Grace Through Faith', 'Justification by Faith', 'Born Again in Christ', 'Blood of the Lamb']
      },
      {
        id: 'scripture_covenants',
        name: 'Covenants in Scripture',
        description: 'Noahic, Abrahamic, Mosaic, Davidic, and New Covenant',
        topics: ['Abrahamic Promise', 'Mosaic Law', 'Davidic Throne', 'New Covenant in Jesus\' Blood']
      },
      {
        id: 'sin_human_nature',
        name: 'Sin & Human Nature',
        description: 'The Fall, original sin, human depravity, and redemption',
        topics: ['Fall of Man', 'Wages of Sin', 'Repentance and Forgiveness']
      },
      {
        id: 'resurrection_eternal_life',
        name: 'Resurrection & Eternal Life',
        description: 'Victory over death, bodily resurrection, and eternity with God',
        topics: ['Resurrection of Christ', 'Believer\'s Future Resurrection', 'Eternal Life Promised']
      },
      {
        id: 'kingdom_of_god',
        name: 'Kingdom of God',
        description: 'Jesus\' teachings on the present and coming Kingdom of God',
        topics: ['The Kingdom is at Hand', 'Righteousness, Peace & Joy in the Holy Ghost', 'Parables of the Kingdom']
      },
      {
        id: 'spiritual_realms',
        name: 'Angels, Satan & Spiritual Opposition',
        description: 'Angelic ministry, spiritual warfare, enemy defeat through Christ',
        topics: ['Ministering Angels', 'Defeat of Satan at the Cross', 'Spiritual Armor']
      },
      {
        id: 'heaven_hell_judgment',
        name: 'Heaven, Hell & Final Judgment',
        description: 'Biblical truths concerning the afterlife and God\'s righteous judgment',
        topics: ['The Great White Throne', 'The New Jerusalem', 'Rewards for the Faithful']
      },
      {
        id: 'hermeneutics',
        name: 'Biblical Hermeneutics',
        description: 'Context, genre, interpretation, and comparing Scripture with Scripture',
        topics: ['Scripture Interprets Scripture', 'Historical Context', 'Literal & Figurative Language']
      }
    ]
  },
  {
    id: 'holy_spirit_life',
    title: 'Holy Spirit & Spiritual Life',
    subtitle: 'Fruit, Gifts, Prayer, Worship & Revival',
    icon: 'Flame',
    color: '#ea580c', // Orange
    testamentScope: 'all',
    order: 6,
    subcategories: [
      {
        id: 'person_work_spirit',
        name: 'Person & Work of the Holy Spirit',
        description: 'The Comforter, Guide, Teacher, and Spirit of Truth',
        topics: ['The Helper / Paraclete', 'Convicting of Sin', 'Indwelling Presence', 'Sealing the Believer']
      },
      {
        id: 'fruit_of_spirit',
        name: 'Fruit of the Spirit',
        description: 'Love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance',
        topics: ['Galatians 5:22-23', 'Love & Joy', 'Peace & Patience', 'Faithfulness & Self-Control']
      },
      {
        id: 'spiritual_gifts',
        name: 'Spiritual Gifts',
        description: '1 Corinthians 12, Romans 12: prophecy, teaching, faith, healing, tongues, discernment',
        topics: ['Gifts for Edification', 'Prophecy & Teaching', 'Faith & Miracles', 'Discernment of Spirits']
      },
      {
        id: 'prayer_fasting',
        name: 'Prayer, Fasting & Intercession',
        description: 'The Lord\'s Prayer, prayer of faith, corporate prayer, fasting power',
        topics: ['The Lord\'s Prayer Model', 'Fasting in Scripture', 'Paul\'s Intercessory Prayers', 'Standing in the Gap']
      },
      {
        id: 'worship_praise',
        name: 'Worship, Praise & Thanksgiving',
        description: 'Worship in spirit and in truth, joyful praise, thank offerings',
        topics: ['Worship in Spirit & Truth', 'Sacrifice of Praise', 'Enter His Gates with Thanksgiving']
      },
      {
        id: 'faith_obedience',
        name: 'Faith, Trust & Obedience',
        description: 'Walking by faith, trusting God\'s promises, unreserved obedience',
        topics: ['Faith is the Substance', 'Obedience is Better than Sacrifice', 'Trust in the Lord with All Your Heart']
      },
      {
        id: 'sanctification',
        name: 'Holiness & Consecration',
        description: 'Being set apart for God, pure living, transformation by the Word',
        topics: ['Be Holy as I Am Holy', 'Living Sacrifice', 'Cleansing by the Washing of the Word']
      },
      {
        id: 'repentance_forgiveness',
        name: 'Repentance & Forgiveness',
        description: 'Confession of sin, God\'s cleansing, forgiving one another',
        topics: ['Confession Brings Cleansing', 'Forgiving 70 Times 7', 'David\'s Broken Spirit (Psalm 51)']
      },
      {
        id: 'spiritual_warfare',
        name: 'Spiritual Warfare & Temptation',
        description: 'Whole armor of God, resisting the enemy, victory in Christ',
        topics: ['Ephesians 6 Armor of God', 'Overcoming Temptation', 'The Sword of the Spirit']
      },
      {
        id: 'discernment_guidance',
        name: 'Discernment & Guidance',
        description: 'Knowing God\'s will, testing the spirits, following the Shepherd\'s voice',
        topics: ['My Sheep Hear My Voice', 'Testing Spirits by God\'s Word', 'Renewing Your Mind']
      },
      {
        id: 'revival_growth',
        name: 'Revival, Renewal & Spiritual Growth',
        description: 'Awakenings in scripture, fresh outpouring, spiritual maturity',
        topics: ['Pentecost Fire', 'Hezekiah\'s Revival', 'From Milk to Solid Food']
      },
      {
        id: 'calling_service',
        name: 'Calling & Christian Service',
        description: 'Finding purpose, servant leadership, serving in the local church',
        topics: ['Here Am I, Send Me', 'Serving One Another in Love', 'Faithful in the Little Things']
      }
    ]
  },
  {
    id: 'prophecy_eschatology',
    title: 'Prophecy & Biblical Eschatology',
    subtitle: 'Messianic Predictions, Daniel, Revelation & Return',
    icon: 'Compass',
    color: '#059669', // Emerald Green
    testamentScope: 'all',
    order: 7,
    subcategories: [
      {
        id: 'messianic_prophecies',
        name: 'Messianic Prophecies',
        description: 'Over 300 Old Testament prophecies fulfilled in Jesus Christ',
        topics: ['Born in Bethlehem (Micah 5:2)', 'Virgin Birth (Isaiah 7:14)', 'Suffering Servant (Isaiah 53)', 'Pierced for Transgressions']
      },
      {
        id: 'ot_prophet_messages',
        name: 'Old Testament Prophets & Messages',
        description: 'Calls to repentance, warnings of exile, promises of restoration',
        topics: ['Jeremiah\'s 70-Year Prophecy', 'Ezekiel\'s Valley of Dry Bones', 'Joel\'s Spirit Outpouring']
      },
      {
        id: 'fulfilled_prophecies',
        name: 'Prophecies Fulfilled in NT',
        description: 'New Testament records demonstrating fulfilled Scripture',
        topics: ['Fulfillment Quotes in Matthew', 'Triumphal Entry Fulfillment', 'Soldiers Casting Lots']
      },
      {
        id: 'daniels_visions',
        name: 'Daniel\'s Visions',
        description: 'Four kingdoms, seventy weeks, the statue dream, Son of Man',
        topics: ['Nebuchadnezzar\'s Image', 'Four Beasts Vision', 'Seventy Weeks Prophecy', 'Writing on the Wall']
      },
      {
        id: 'book_of_revelation',
        name: 'The Book of Revelation',
        description: 'Visions given to John on the island of Patmos',
        topics: ['Seven Golden Lampstands', 'The Scroll with Seven Seals', 'The Two Witnesses', 'The Marriage Supper']
      },
      {
        id: 'second_coming',
        name: 'Second Coming of Christ',
        description: 'The return of the Lord Jesus in glory, catching away of the saints',
        topics: ['In the Twinkling of an Eye', 'Coming on the Clouds of Heaven', 'Every Eye Shall See Him']
      },
      {
        id: 'prophecy_judgment',
        name: 'Resurrection & Final Judgment',
        description: 'Resurrection of the just and unjust, the Bema Seat, White Throne',
        topics: ['The Judgment Seat of Christ', 'Book of Life Opened', 'Victory over Death']
      },
      {
        id: 'new_creation',
        name: 'New Heaven & New Earth',
        description: 'The holy city New Jerusalem, no more tears, sorrow, or death',
        topics: ['No More Tears or Pain', 'The River of Life', 'God Dwelling with Men', 'Gates of Pearl']
      },
      {
        id: 'biblical_symbols',
        name: 'Biblical Symbols, Numbers & Imagery',
        description: 'Significance of horns, crowns, lampstands, numbers 7, 12, 40, etc.',
        topics: ['Number 7 Completeness', 'Number 12 Tribal Order', 'Lamb & Lion Imagery', 'The White Horse']
      },
      {
        id: 'israel_and_nations',
        name: 'Israel, the Nations & Prophecy',
        description: 'God\'s promises to Abraham\'s seed, Gentiles grafted in, the nations',
        topics: ['Wild Olive Branch Grafted In', 'Gospel Preached to All Nations', 'God\'s Faithfulness to His Word']
      }
    ]
  },
  {
    id: 'family_relationships',
    title: 'Family, Love & Relationships',
    subtitle: 'Marriage, Parenting, Friendship & Compassion',
    icon: 'Heart',
    color: '#db2777', // Hot Pink / Magenta
    testamentScope: 'all',
    order: 8,
    subcategories: [
      {
        id: 'marriage_partnership',
        name: 'Marriage & Biblical Partnership',
        description: 'Genesis covenant, Ephesians 5 blueprint, mutual honor and love',
        topics: ['Two Become One Flesh', 'Husbands Love Your Wives', 'Wives Respect Your Husbands', 'Cord of Three Strands']
      },
      {
        id: 'parents_children',
        name: 'Parents, Children & Family Duties',
        description: 'Training up a child, honoring parents, generational faithfulness',
        topics: ['Honor Your Father & Mother', 'Train Up a Child', 'Do Not Provoke Your Children', 'Heritage from the Lord']
      },
      {
        id: 'greatest_commandment',
        name: 'Love & the Greatest Commandment',
        description: 'Loving God with all heart and mind, and loving neighbor as self',
        topics: ['The Shema (Deut 6)', 'Love Your Neighbor', 'Love as Christ Loved Us', '1 Corinthians 13 Love']
      },
      {
        id: 'rel_forgiveness',
        name: 'Forgiveness & Reconciliation',
        description: 'Biblical peacemaking, healing broken bonds, Joseph and brothers',
        topics: ['Joseph Forgives His Brothers', 'Esau & Jacob Reconciled', 'Forgiving as God Forgave You']
      },
      {
        id: 'friendship_loyalty',
        name: 'Friendship & Loyalty',
        description: 'David and Jonathan, Ruth and Naomi, iron sharpening iron',
        topics: ['David & Jonathan Covenant', 'Ruth Clings to Naomi', 'Friend Sticks Closer than a Brother']
      },
      {
        id: 'kindness_compassion',
        name: 'Respect, Kindness & Compassion',
        description: 'Gentleness, bearing one another\'s burdens, warm hospitality',
        topics: ['Be Kind & Compassionate', 'Show Hospitality to Strangers', 'Bear One Another\'s Burdens']
      },
      {
        id: 'peacemaking',
        name: 'Conflict Resolution & Peacemaking',
        description: 'Blessed are the peacemakers, Matthew 18 order, turning away wrath',
        topics: ['Soft Answer Turns Away Wrath', 'Matthew 18 Reconciliation Steps', 'Live Peaceably with All Men']
      },
      {
        id: 'relationship_examples',
        name: 'Examples of Relationships',
        description: 'Scriptural case studies: healthy bonds and toxic pitfalls to avoid',
        topics: ['Boaz & Ruth', 'Aquila & Priscilla', 'Ahab & Jezebel Warning', 'Samson & Delilah Trap']
      },
      {
        id: 'care_vulnerable',
        name: 'Widows, Orphans & Vulnerable People',
        description: 'Pure religion undefiled, defending the oppressed and poor',
        topics: ['Pure Religion (James 1:27)', 'Defend the Fatherless', 'Leave Gleanings for the Poor']
      },
      {
        id: 'generational_faith',
        name: 'Family Faith & Generational Teaching',
        description: 'Passing the torch of faith: Lois, Eunice, and Timothy',
        topics: ['Timothy\'s Faith from Mother & Grandmother', 'Joshua\'s Resolve: As for Me and My House']
      }
    ]
  },
  {
    id: 'christian_character',
    title: 'Christian Character & Practical Living',
    subtitle: 'Integrity, Speech, Humility, Stewardship & Work',
    icon: 'Sparkles',
    color: '#16a34a', // Bright Spring Leaf Green
    testamentScope: 'all',
    order: 9,
    subcategories: [
      {
        id: 'integrity_honesty',
        name: 'Integrity, Honesty & Truthfulness',
        description: 'Speaking truth in love, honest scales, upright conduct before God',
        topics: ['The Lord Delights in Honest Scales', 'Putting Away Lying', 'Walking with Integrity']
      },
      {
        id: 'humility_servanthood',
        name: 'Humility, Pride & Servanthood',
        description: 'God resists the proud and gives grace to the humble, Jesus washing feet',
        topics: ['Pride Goes Before a Fall', 'Jesus Washes Disciples\' Feet', 'He Who Humblest Himself']
      },
      {
        id: 'patience_self_control',
        name: 'Patience & Self-Control',
        description: 'Ruling one\'s spirit, enduring with patience, avoiding rash anger',
        topics: ['Better to Rule One\'s Spirit than a City', 'Wait Patiently for the Lord', 'Self-Control in All Things']
      },
      {
        id: 'justice_mercy',
        name: 'Justice, Mercy & Righteousness',
        description: 'Micah 6:8, doing justice, loving mercy, walking humbly with God',
        topics: ['Micah 6:8 Requirements', 'Mercy Triumphs Over Judgment', 'Righteousness Exalts a Nation']
      },
      {
        id: 'speech_tongue',
        name: 'Speech, Gossip, Anger & the Tongue',
        description: 'James 3 on the rudder of the tongue, life and death in speech power',
        topics: ['Death & Life in the Power of the Tongue', 'James 3 Taming the Tongue', 'Let Your Speech Be Gracious']
      },
      {
        id: 'stewardship_giving',
        name: 'Money, Stewardship & Giving',
        description: 'Tithes and offerings, cheerful giver, contentment over riches',
        topics: ['God Loves a Cheerful Giver', 'Love of Money is Root of Evil', 'Store Up Treasures in Heaven']
      },
      {
        id: 'work_diligence',
        name: 'Work, Diligence & Responsibility',
        description: 'Work as unto the Lord, sluggard warnings in Proverbs, excellence',
        topics: ['Work Heartily as for the Lord', 'Go to the Ant, You Sluggard', 'Hands of the Diligent Prosper']
      },
      {
        id: 'trials_suffering',
        name: 'Temptation, Trials & Suffering',
        description: 'Count it all joy, testing of faith producing perseverance',
        topics: ['Count It Joy in Diverse Trials', 'No Temptation Beyond What You Can Bear', 'Gold Refined by Fire']
      },
      {
        id: 'leadership_character',
        name: 'Leadership & Decision-Making',
        description: 'Godly wisdom in counsel, accountability, servant leadership model',
        topics: ['In the Multitude of Counselors Safety', 'Servant of All', 'Leading with Integrity of Heart']
      },
      {
        id: 'generosity_helping',
        name: 'Compassion & Helping Others',
        description: 'Feeding the hungry, clothing the needy, being the hands of Christ',
        topics: ['Whatever You Did for the Least of These', 'Generous Soul Made Rich', 'Good Samaritan Compassion']
      }
    ]
  },
  {
    id: 'wisdom_literature',
    title: 'Psalms, Proverbs & Wisdom Literature',
    subtitle: 'Worship, Life Principles, Job & Ecclesiastes',
    icon: 'Feather',
    color: '#0d9488', // Teal
    testamentScope: 'ot',
    order: 10,
    subcategories: [
      {
        id: 'psalms_praise',
        name: 'Psalms of Praise & Thanksgiving',
        description: 'Psalm 100, 103, 145-150: rejoicing in God\'s greatness',
        topics: ['Make a Joyful Noise', 'Bless the Lord O My Soul', 'Praise with Stringed Instruments']
      },
      {
        id: 'psalms_comfort',
        name: 'Lament, Comfort & Trust in God',
        description: 'Psalm 23, 27, 46, 91: safety under His wings, refuge in trouble',
        topics: ['The Lord is My Shepherd (Ps 23)', 'God is Our Refuge & Strength (Ps 46)', 'Dwelling in the Secret Place (Ps 91)']
      },
      {
        id: 'wisdom_intro',
        name: 'Wisdom Literature',
        description: 'The fear of the Lord is the beginning of wisdom and knowledge',
        topics: ['Fear of the Lord', 'Wisdom Crying Aloud in the Streets', 'Value Above Rubies']
      },
      {
        id: 'proverbs_wisdom',
        name: 'Proverbs & Practical Wisdom',
        description: 'Proverbs on words, wealth, friendship, discipline, and folly',
        topics: ['Trust in the Lord with All Thine Heart', 'Guard Your Heart with All Diligence', 'The Virtuous Woman']
      },
      {
        id: 'job_faith',
        name: 'Job, Suffering & Faith',
        description: 'Job\'s integrity, his three friends, God answering out of whirlwind',
        topics: ['The Lord Gave and Took Away', 'I Know that My Redeemer Lives', 'God\'s Majesty in Creation']
      },
      {
        id: 'ecclesiastes_meaning',
        name: 'Ecclesiastes & Life\'s Meaning',
        description: 'Vanity under the sun, a time for everything, duty of man',
        topics: ['A Time for Every Purpose Under Heaven', 'Fear God and Keep His Commandments', 'Threefold Cord']
      },
      {
        id: 'song_of_solomon',
        name: 'Song of Solomon & Love Poetry',
        description: 'Biblical love poetry, imagery of marital beauty and devotion',
        topics: ['Love is Strong as Death', 'Many Waters Cannot Quench Love', 'My Beloved is Mine']
      },
      {
        id: 'biblical_poetry',
        name: 'Poetry, Metaphors & Parallelism',
        description: 'Hebrew poetic structure: synonymous, antithetic, and synthetic lines',
        topics: ['Hebrew Parallelism', 'Trees Planted by Water', 'Shield and Buckler']
      },
      {
        id: 'daily_wisdom',
        name: 'Wisdom for Daily Decisions',
        description: 'Applying scriptural wisdom to modern ethical and life situations',
        topics: ['Seeking Counsel', 'Avoiding Strife', 'Choosing the Narrow Way']
      }
    ]
  },
  {
    id: 'scripture_challenges',
    title: 'Bible Verses & Scripture Challenges',
    subtitle: 'Finish the Verse, Match Themes & Memory Tests',
    icon: 'CheckSquare',
    color: '#2563eb', // Royal Blue
    testamentScope: 'all',
    order: 11,
    subcategories: [
      {
        id: 'complete_the_verse',
        name: 'Complete the Bible Verse',
        description: 'Fill in missing words from famous scriptural declarations',
        topics: ['John 3:16', 'Romans 8:28', 'Philippians 4:13', 'Jeremiah 29:11']
      },
      {
        id: 'identify_reference',
        name: 'Identify Book, Chapter & Verse',
        description: 'Identify the exact biblical address for famous passages',
        topics: ['Great Commission Address', 'Love Chapter Address', 'Faith Chapter Address']
      },
      {
        id: 'who_said_this',
        name: 'Who Said This in the Bible?',
        description: 'Name the speaker behind historic quotes in the Old and New Testaments',
        topics: ['As for Me and My House', 'Speak Lord, Your Servant Hears', 'Behold the Lamb of God']
      },
      {
        id: 'verse_theme_matching',
        name: 'Match Verse to Its Theme',
        description: 'Connect verses to core concepts: Grace, Hope, Peace, Forgiveness',
        topics: ['Theme of Salvation', 'Theme of Spiritual Peace', 'Theme of God\'s Protection']
      },
      {
        id: 'verse_context',
        name: 'Verse Context & Original Audience',
        description: 'Who wrote it, to whom, where, and what was happening',
        topics: ['Paul Writing from Prison', 'Moses Speaking to Israel on Plains of Moab', 'John on Patmos']
      },
      {
        id: 'scripture_memory',
        name: 'Scripture Memory Challenges',
        description: 'Test your memorization of core scriptural verses and psalms',
        topics: ['Psalm 23 Word-for-Word', 'Ten Commandments Order', 'Lord\'s Prayer Lines']
      },
      {
        id: 'promises_commands_warnings',
        name: 'Promises, Commands & Warnings',
        description: 'Differentiating divine promises, covenant commands, and warnings',
        topics: ['Precious Promises', 'Commands of Christ', 'Apostolic Warnings']
      },
      {
        id: 'ot_nt_connections',
        name: 'OT–NT Connections',
        description: 'Spotting direct quotes from the Old Testament quoted in the New',
        topics: ['Isaiah Quoted in Gospels', 'Joel Quoted at Pentecost', 'Habakkuk Quoted in Romans']
      },
      {
        id: 'find_reference',
        name: 'Find the Biblical Reference',
        description: 'Rapid reference finding across Pentateuch, Gospels, and Epistles',
        topics: ['Gospel Parallels', 'Key Old Testament Milestones', 'Pauline References']
      },
      {
        id: 'translation_comparison',
        name: 'Translation Comparison',
        description: 'Understanding nuances across KJV, NKJV, NIV, ESV, and Telugu',
        topics: ['KJV Historic Phrasings', 'Modern English Equivalents', 'Telugu Scriptural Phrases']
      }
    ]
  },
  {
    id: 'events_miracles_parables',
    title: 'Biblical Events, Miracles & Parables',
    subtitle: 'Red Sea, Miracles of Jesus & Kingdom Stories',
    icon: 'Sun',
    color: '#eab308', // Sunny Marigold Yellow
    testamentScope: 'all',
    order: 12,
    subcategories: [
      {
        id: 'creation_fall_flood',
        name: 'Creation, Fall & Flood',
        description: 'Genesis primeval events from six days of creation to rainbow covenant',
        topics: ['Creation Days Sequence', 'First Sin & Expulsion', 'Great Deluge Specifics']
      },
      {
        id: 'exodus_passover_redsea',
        name: 'Exodus, Passover & Red Sea',
        description: 'Deliverance from Egyptian bondage and journey into freedom',
        topics: ['Blood on the Doorposts', 'Parting of the Waters', 'Song of Moses and Miriam']
      },
      {
        id: 'ot_miracles',
        name: 'Miracles in the Old Testament',
        description: 'Sun standing still, Jordan parting, fire from heaven, floating axe head',
        topics: ['Sun Standing Still for Joshua', 'Elijah\'s Chariot of Fire', 'Naaman Healed in Jordan']
      },
      {
        id: 'miracles_of_jesus',
        name: 'Miracles of Jesus',
        description: '37 recorded miracles: authority over nature, sickness, and demons',
        topics: ['Calming the Storm', 'Walking upon Sea of Galilee', 'Coin in the Fish\'s Mouth']
      },
      {
        id: 'parables_of_jesus',
        name: 'Parables of Jesus',
        description: 'Stories revealing kingdom mysteries: Good Samaritan, Prodigal Son, Talents',
        topics: ['Parable of the Talents', 'The Ten Virgins', 'The Lost Sheep & Lost Coin']
      },
      {
        id: 'healings_deliverance',
        name: 'Healings & Deliverance',
        description: 'Woman with issue of blood, blind Bartimaeus, ten lepers, demoniac',
        topics: ['Touch of Faith on Hem of Garment', 'Lepers Cleansed & One Returned', 'Legion Delivered']
      },
      {
        id: 'biblical_resurrections',
        name: 'Resurrections in Scripture',
        description: 'Widow\'s son at Zarephath, Jairus\' daughter, widow of Nain, Lazarus, Eutychus',
        topics: ['Lazarus Come Forth', 'Jairus\' Daughter Arise', 'Widow of Zarephath\'s Son Raised']
      },
      {
        id: 'pentecost_events',
        name: 'Pentecost & the Early Church',
        description: 'Rushing mighty wind, tongues of fire, 3000 added in a single day',
        topics: ['Sound from Heaven', 'Peter\'s Bold Pentecost Sermon', 'Fellowship of the Believers']
      },
      {
        id: 'prison_journeys',
        name: 'Prison Deliverances & Journeys',
        description: 'Peter released by angel, Paul & Silas praying at midnight in Philippi',
        topics: ['Chains Fell Off Peter', 'Midnight Praise in Philippi Prison', 'Shipwreck at Malta']
      },
      {
        id: 'signs_and_wonders',
        name: 'Signs, Wonders & Biblical Context',
        description: 'Purpose of signs in scripture to confirm the Word preached',
        topics: ['Signs Following the Apostles', 'Confirming the Message of the Lord']
      }
    ]
  },
  {
    id: 'church_ministry',
    title: 'Church, Worship & Ministry',
    subtitle: 'Early Church, Baptism, Communion & Evangelism',
    icon: 'Church',
    color: '#831843', // Deep Wine Plum
    testamentScope: 'nt',
    order: 13,
    subcategories: [
      {
        id: 'early_church_acts',
        name: 'The Early Church in Acts',
        description: 'Devoted to apostles\' doctrine, fellowship, breaking of bread, and prayers',
        topics: ['Daily Meeting in Solomon\'s Porch', 'All Things in Common', 'Antioch Believers Called Christians']
      },
      {
        id: 'church_unity_fellowship',
        name: 'Church Unity & Fellowship',
        description: 'One body, one Spirit, one hope, one Lord, one faith, one baptism',
        topics: ['Ephesians 4 Unity', 'Many Members One Body', 'Preferring One Another']
      },
      {
        id: 'ordinances_sacraments',
        name: 'Baptism & the Lord\'s Supper',
        description: 'Water baptism by immersion, remembering Christ\'s broken body and blood',
        topics: ['Great Commission Baptism', 'This Do in Remembrance of Me', 'Examining Oneself at Communion']
      },
      {
        id: 'corporate_worship',
        name: 'Prayer Meetings & Corporate Worship',
        description: 'Upper room prayers, worshipping together with hymns, psalms, spiritual songs',
        topics: ['Do Not Forsake Assembling Together', 'Speaking to One Another in Spiritual Songs']
      },
      {
        id: 'pastoral_qualifications',
        name: 'Pastoral Leadership & Elders',
        description: '1 Timothy 3, Titus 1: blameless, hospitable, able to teach, godly home',
        topics: ['Bishops & Overseers', 'Qualities of Deacons', 'Leading by Example as Under-Shepherds']
      },
      {
        id: 'great_commission',
        name: 'Evangelism & Great Commission',
        description: 'Go into all the world and preach the gospel to every creature',
        topics: ['Matthew 28:18-20', 'You Shall Be My Witnesses', 'How Beautiful the Feet of Those Who Bring Good News']
      },
      {
        id: 'discipleship_mentoring',
        name: 'Discipleship & Mentoring',
        description: 'Commit to faithful men who will teach others also (2 Timothy 2:2)',
        topics: ['Moses & Joshua', 'Paul & Timothy', 'Barnabas & John Mark']
      },
      {
        id: 'church_planting',
        name: 'Missionary Journeys & Church Planting',
        description: 'Paul, Barnabas, Silas, establishing churches in Galatia, Greece, and Asia',
        topics: ['Council of Jerusalem', 'Berea Examining the Scriptures', 'Mars Hill in Athens']
      },
      {
        id: 'church_service',
        name: 'Serving Church & Community',
        description: 'Serving the saints, helping the poor, using your hands for God\'s glory',
        topics: ['Seven Chosen to Serve Tables', 'Dorcas Making Garments for Widows']
      },
      {
        id: 'church_discipline',
        name: 'Discipline, Reconciliation & Order',
        description: 'Biblical order in public gatherings, restoring brethren overtaken in a fault',
        topics: ['Restoring in a Spirit of Meekness', 'All Things Done Decently and in Order']
      }
    ]
  },
  {
    id: 'people_nations_cultures',
    title: 'People, Nations & Cultures',
    subtitle: '12 Tribes, Empires, Temple & Customs',
    icon: 'Globe',
    color: '#06b6d4', // Radiant Cyan
    testamentScope: 'all',
    order: 14,
    subcategories: [
      {
        id: 'twelve_tribes',
        name: 'Twelve Tribes of Israel',
        description: 'Judah, Levi, Benjamin, Joseph (Ephraim/Manasseh), Dan, Naphtali, Gad, Asher, Issachar, Zebulun, Reuben, Simeon',
        topics: ['Jacob\'s Blessings to Sons', 'Land Allotments by Joshua', 'Tribe of Judah & Messiah']
      },
      {
        id: 'divided_kingdoms',
        name: 'Judah & Israel Kingdoms',
        description: 'Northern Kingdom (Israel / Samaria) vs Southern Kingdom (Judah / Jerusalem)',
        topics: ['Rehoboam and Jeroboam Split', 'Fall of Samaria to Assyria', 'Fall of Jerusalem to Babylon']
      },
      {
        id: 'ancient_empires',
        name: 'Egypt, Assyria, Babylon & Persia',
        description: 'Great empires surrounding and impacting the people of God',
        topics: ['Pharaohs of Egypt', 'Assyrian Siege of Jerusalem', 'Babylonian Captivity', 'Persian Edict of Return']
      },
      {
        id: 'roman_background',
        name: 'Roman Empire & NT Background',
        description: 'Caesars, Pontius Pilate, Roman roads, citizenship, Pax Romana',
        topics: ['Caesar Augustus Census', 'Paul\'s Roman Citizenship', 'Roman Centurion\'s Faith']
      },
      {
        id: 'priests_temple_service',
        name: 'Priests, Levites & Temple Service',
        description: 'Order of Aaron, Levitical duties, musical courses, holy garments',
        topics: ['High Priest Urim & Thummim', 'Levitical Cities of Refuge', 'David\'s 24 Priest Courses']
      },
      {
        id: 'ancient_daily_life',
        name: 'Occupations, Trade & Daily Life',
        description: 'Fishermen, carpenters, shepherds, farmers, merchants, tentmakers',
        topics: ['Shepherds and Sheepfolds', 'Vineyards and Winepresses', 'Fishermen of Galilee']
      },
      {
        id: 'weights_measures_money',
        name: 'Weights, Measures, Money & Calendars',
        description: 'Shekels, talents, denarii, mites, cubits, ephahs, lunar months',
        topics: ['Widow\'s Two Mites', 'Value of a Roman Denarius', 'Cubit Dimensions of Ark']
      },
      {
        id: 'tabernacle_sacred_objects',
        name: 'Tabernacle, Temple & Sacred Objects',
        description: 'Ark of the Covenant, Menorah, Table of Shewbread, Altar of Incense',
        topics: ['Ark of the Covenant & Mercy Seat', 'Seven-Branched Golden Lampstand', 'Solomon\'s Temple Glory']
      },
      {
        id: 'festivals_customs',
        name: 'Biblical Festivals & Customs',
        description: 'Passover, Unleavened Bread, Firstfruits, Weeks/Pentecost, Trumpets, Atonement, Tabernacles',
        topics: ['Three Pilgrim Feasts', 'Sabbath Observance', 'Wedding Banquets and Customs']
      },
      {
        id: 'biblical_archaeology',
        name: 'Archaeology & Historical Context',
        description: 'Dead Sea Scrolls, Pool of Siloam, Tel Dan inscription, City of David',
        topics: ['Dead Sea Scrolls Discovery', 'Pool of Siloam Excavation', 'Hezekiah\'s Tunnel']
      }
    ]
  },
  {
    id: 'special_tracks',
    title: 'Special Quiz Tracks',
    subtitle: 'Tailored Challenges for Kids, Youth, Pastors & Groups',
    icon: 'Trophy',
    color: '#b45309', // Warm Bronze Copper
    testamentScope: 'all',
    order: 15,
    subcategories: [
      { id: 'kids_quiz', name: 'Bible Quiz for Kids', description: 'Fun, accessible questions for children and Sunday School' },
      { id: 'youth_challenge', name: 'Youth Bible Challenge', description: 'Exciting, engaging biblical questions for youth groups' },
      { id: 'family_competition', name: 'Family Bible Competition', description: 'Multi-generational quiz ideal for family devotions' },
      { id: 'couples_quiz', name: 'Couples & Marriage Quiz', description: 'Scriptures on marriage, partnership, and love' },
      { id: 'beginner_journey', name: 'Beginner\'s Bible Journey', description: 'Gentle introduction to core Bible stories and figures' },
      { id: 'pastors_leaders', name: 'Pastors & Bible Leaders Challenge', description: 'In-depth theology, Greek/Hebrew insights, and leadership' },
      { id: 'advanced_theology', name: 'Advanced Theology Challenge', description: 'Doctrinal depth, hermeneutics, and biblical prophecy' },
      { id: 'women_of_faith', name: 'Women of Faith Challenge', description: 'Honoring the faithful women throughout biblical history' },
      { id: 'men_of_faith', name: 'Men of Faith Challenge', description: 'Scriptural leadership, courage, and integrity for men' },
      { id: 'daily_challenge', name: 'Daily Bible Challenge', description: 'Fresh 5-question daily Scripture test for every believer' },
      { id: 'church_competition', name: 'Church-versus-Church Competition', description: 'Championship questions for inter-church competitions' },
      { id: 'full_mastery', name: 'Full Bible Mastery Challenge', description: 'The ultimate test across all 66 books and doctrines' }
    ]
  }
];

/**
 * 12 PRESET SPECIAL QUIZ TRACKS
 * Quickly filters and configures quizzes tailored for different audiences.
 */
export const SPECIAL_QUIZ_TRACKS: QuizTrack[] = [
  {
    id: 'kids_quiz',
    title: 'Bible Quiz for Kids',
    subtitle: 'Sunday School & Children',
    icon: 'Smile',
    color: '#06b6d4',
    defaultDifficulty: 'easy',
    recommendedCategoryIds: ['events_miracles_parables', 'bible_characters', 'complete_bible'],
    description: 'Fun and clear questions on Noah, David, Jesus, and favorite Bible stories.'
  },
  {
    id: 'youth_challenge',
    title: 'Youth Bible Challenge',
    subtitle: 'Teens & Young Adults',
    icon: 'Zap',
    color: '#8b5cf6',
    defaultDifficulty: 'medium',
    recommendedCategoryIds: ['christian_character', 'holy_spirit_life', 'nt_studies'],
    description: 'Practical, inspiring questions on faith, peer pressure, identity, and discipleship.'
  },
  {
    id: 'family_competition',
    title: 'Family Bible Competition',
    subtitle: 'Home Devotions & Game Night',
    icon: 'HeartHandshake',
    color: '#ec4899',
    defaultDifficulty: 'mixed',
    recommendedCategoryIds: ['family_relationships', 'events_miracles_parables', 'scripture_challenges'],
    description: 'Fun competition questions for parents and kids to study Scripture together.'
  },
  {
    id: 'couples_quiz',
    title: 'Couples & Marriage Quiz',
    subtitle: 'Husbands & Wives',
    icon: 'Heart',
    color: '#f43f5e',
    defaultDifficulty: 'medium',
    recommendedCategoryIds: ['family_relationships', 'christian_character'],
    description: 'Deepen your marriage with questions on biblical love, respect, and mutual honor.'
  },
  {
    id: 'beginner_journey',
    title: 'Beginner\'s Bible Journey',
    subtitle: 'New Believers & Seekers',
    icon: 'Compass',
    color: '#10b981',
    defaultDifficulty: 'easy',
    recommendedCategoryIds: ['nt_studies', 'theology_doctrines', 'complete_bible'],
    description: 'Foundational steps: discover the life of Jesus, grace, and key biblical figures.'
  },
  {
    id: 'pastors_leaders',
    title: 'Pastors & Bible Leaders',
    subtitle: 'Ministers & Elders',
    icon: 'Award',
    color: '#b45309',
    defaultDifficulty: 'hard',
    recommendedCategoryIds: ['church_ministry', 'theology_doctrines', 'prophecy_eschatology', 'ot_studies'],
    description: 'Challenging questions on church leadership, hermeneutics, theology, and ministry.'
  },
  {
    id: 'advanced_theology',
    title: 'Advanced Theology Challenge',
    subtitle: 'Doctrine & Hermeneutics',
    icon: 'ShieldCheck',
    color: '#4338ca',
    defaultDifficulty: 'hard',
    recommendedCategoryIds: ['theology_doctrines', 'prophecy_eschatology', 'nt_studies'],
    description: 'Explore the Trinity, Christology, covenant theology, and biblical prophecy.'
  },
  {
    id: 'women_of_faith',
    title: 'Women of Faith Challenge',
    subtitle: 'Sisters & Women\'s Ministry',
    icon: 'Crown',
    color: '#c026d3',
    defaultDifficulty: 'mixed',
    recommendedCategoryIds: ['bible_characters', 'christian_character', 'family_relationships'],
    description: 'Celebrate Ruth, Esther, Mary, Deborah, Hannah, and faithful women of God.'
  },
  {
    id: 'men_of_faith',
    title: 'Men of Faith Challenge',
    subtitle: 'Brothers & Men\'s Fellowship',
    icon: 'Shield',
    color: '#0284c7',
    defaultDifficulty: 'mixed',
    recommendedCategoryIds: ['christian_character', 'ot_studies', 'bible_characters'],
    description: 'Spiritual leadership, godly integrity, courage, and family responsibility.'
  },
  {
    id: 'daily_challenge',
    title: 'Daily Scripture Challenge',
    subtitle: '5-Minute Daily Walk',
    icon: 'Flame',
    color: '#ea580c',
    defaultDifficulty: 'mixed',
    recommendedCategoryIds: ['complete_bible', 'nt_studies', 'wisdom_literature'],
    description: 'Daily fresh 5 questions across the entire Bible to keep your streak alive.'
  },
  {
    id: 'church_competition',
    title: 'Inter-Church Competition',
    subtitle: 'District & Church Contests',
    icon: 'Trophy',
    color: '#eab308',
    defaultDifficulty: 'hard',
    recommendedCategoryIds: ['scripture_challenges', 'ot_studies', 'nt_studies', 'people_nations_cultures'],
    description: 'High-level competitive questions prepared for church-vs-church tournaments.'
  },
  {
    id: 'full_mastery',
    title: 'Full Bible Mastery Challenge',
    subtitle: 'The Ultimate 66-Book Test',
    icon: 'GraduationCap',
    color: '#059669',
    defaultDifficulty: 'mixed',
    recommendedCategoryIds: ['complete_bible', 'ot_studies', 'nt_studies', 'theology_doctrines'],
    description: 'Comprehensive test spanning all 66 books, Old and New Testaments, and all doctrines.'
  }
];
