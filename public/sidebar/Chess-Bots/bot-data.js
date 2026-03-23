// =============================================================================
//  bot-data.js
//  Pure data: bot roster, piece values, piece-square tables, opening book.
//  No Chess.js dependency. Load this FIRST.
//  Load order: bot-data.js → bot-engine.js → bot-backend.js
// =============================================================================
console.log('🔄 bot-data.js: Loading...');
try {

// ── ALL 183 BOTS ──────────────────────────────────────────────────────────────
const BOTS = [
    { id:1,  name:"Magnus Carlsen",  elo:2882,  category:"Chess GM",  locked:false },
    { id:2,  name:"Garry Kasparov",  elo:2851,  category:"Chess GM",  locked:false },
    { id:3,  name:"Fabiano Caruana",  elo:2819,  category:"Chess GM",  locked:false },
    { id:4,  name:"Hikaru Nakamura",  elo:2802,  category:"Chess GM",  locked:false },
    { id:5,  name:"Ding Liren",  elo:2799,  category:"Chess GM",  locked:false },
    { id:6,  name:"Gukesh D",  elo:2794,  category:"Chess GM",  locked:false },
    { id:7,  name:"Ian Nepomniachtchi",  elo:2793,  category:"Chess GM",  locked:false },
    { id:8,  name:"Alireza Firouzja",  elo:2793,  category:"Chess GM",  locked:false },
    { id:9,  name:"Dommaraju Gukesh",  elo:2790,  category:"Chess GM",  locked:false },
    { id:10,  name:"Bobby Fischer",  elo:2785,  category:"Chess GM",  locked:false },
    { id:11,  name:"Nodirbek Abdusattorov",  elo:2784,  category:"Chess GM",  locked:false },
    { id:12,  name:"Arjun Erigaisi",  elo:2778,  category:"Chess GM",  locked:false },
    { id:13,  name:"Levon Aronian",  elo:2775,  category:"Chess GM",  locked:false },
    { id:14,  name:"Wesley So",  elo:2773,  category:"Chess GM",  locked:false },
    { id:15,  name:"Shakhriyar Mamedyarov",  elo:2767,  category:"Chess GM",  locked:false },
    { id:16,  name:"Anish Giri",  elo:2764,  category:"Chess GM",  locked:false },
    { id:17,  name:"Alexander Grischuk",  elo:2764,  category:"Chess GM",  locked:false },
    { id:18,  name:"Maxime Vachier-Lagrave",  elo:2760,  category:"Chess GM",  locked:false },
    { id:19,  name:"Leinier Dominguez",  elo:2758,  category:"Chess GM",  locked:false },
    { id:20,  name:"Teimour Radjabov",  elo:2753,  category:"Chess GM",  locked:false },
    { id:21,  name:"Sergey Karjakin",  elo:2753,  category:"Chess GM",  locked:false },
    { id:22,  name:"Viswanathan Anand",  elo:2751,  category:"Chess GM",  locked:false },
    { id:23,  name:"Praggnanandhaa",  elo:2747,  category:"Chess GM",  locked:false },
    { id:24,  name:"Wei Yi",  elo:2741,  category:"Chess GM",  locked:false },
    { id:25,  name:"Vladislav Artemiev",  elo:2741,  category:"Chess GM",  locked:false },
    { id:26,  name:"Judit Polgar",  elo:2735,  category:"Chess GM",  locked:false },
    { id:27,  name:"Pentala Harikrishna",  elo:2730,  category:"Chess GM",  locked:false },
    { id:28,  name:"Radoslaw Wojtaszek",  elo:2730,  category:"Chess GM",  locked:false },
    { id:29,  name:"Vincent Keymer",  elo:2726,  category:"Chess GM",  locked:false },
    { id:30,  name:"Anatoly Karpov",  elo:2725,  category:"Chess GM",  locked:false },
    { id:31,  name:"Jose Raul Capablanca",  elo:2725,  category:"Chess GM",  locked:false },
    { id:32,  name:"Emanuel Lasker",  elo:2720,  category:"Chess GM",  locked:false },
    { id:33,  name:"Peter Svidler",  elo:2714,  category:"Chess GM",  locked:false },
    { id:34,  name:"Jeffery Xiong",  elo:2712,  category:"Chess GM",  locked:false },
    { id:35,  name:"Alexei Shirov",  elo:2709,  category:"Chess GM",  locked:false },
    { id:36,  name:"Sam Shankland",  elo:2709,  category:"Chess GM",  locked:false },
    { id:37,  name:"Nihal Sarin",  elo:2707,  category:"Chess GM",  locked:false },
    { id:38,  name:"Daniil Dubov",  elo:2706,  category:"Chess GM",  locked:false },
    { id:39,  name:"Mikhail Tal",  elo:2705,  category:"Chess GM",  locked:false },
    { id:40,  name:"Andrey Esipenko",  elo:2701,  category:"Chess GM",  locked:false },
    { id:41,  name:"David Navara",  elo:2693,  category:"Chess GM",  locked:false },
    { id:42,  name:"Mikhail Botvinnik",  elo:2690,  category:"Chess GM",  locked:false },
    { id:43,  name:"Alexander Alekhine",  elo:2690,  category:"Chess GM",  locked:false },
    { id:44,  name:"Paul Morphy",  elo:2690,  category:"Chess GM",  locked:false },
    { id:45,  name:"Rustam Kasimdzhanov",  elo:2685,  category:"Chess GM",  locked:false },
    { id:46,  name:"Nigel Short",  elo:2682,  category:"Chess GM",  locked:false },
    { id:47,  name:"Leon Mendonca",  elo:2678,  category:"Chess GM",  locked:false },
    { id:48,  name:"Michael Adams",  elo:2677,  category:"Chess GM",  locked:false },
    { id:49,  name:"Krishnan Sasikiran",  elo:2677,  category:"Chess GM",  locked:false },
    { id:50,  name:"Hans Niemann",  elo:2677,  category:"Chess GM",  locked:false },
    { id:51,  name:"Boris Gelfand",  elo:2674,  category:"Chess GM",  locked:true },
    { id:52,  name:"Peter Leko",  elo:2663,  category:"Chess GM",  locked:true },
    { id:53,  name:"Hou Yifan",  elo:2658,  category:"Chess GM",  locked:true },
    { id:54,  name:"Victor Bologan",  elo:2655,  category:"Chess GM",  locked:true },
    { id:55,  name:"Maxime Lagarde",  elo:2651,  category:"Chess GM",  locked:true },
    { id:56,  name:"Etienne Bacrot",  elo:2651,  category:"Chess GM",  locked:true },
    { id:57,  name:"Wilhelm Steinitz",  elo:2650,  category:"Chess GM",  locked:true },
    { id:58,  name:"Daniel Naroditsky",  elo:2647,  category:"Chess GM",  locked:true },
    { id:59,  name:"Romain Edouard",  elo:2618,  category:"Chess GM",  locked:true },
    { id:60,  name:"Humpy Koneru",  elo:2586,  category:"Chess GM",  locked:true },
    { id:61,  name:"Lei Tingjie",  elo:2584,  category:"Chess GM",  locked:true },
    { id:62,  name:"Kateryna Lagno",  elo:2556,  category:"Chess GM",  locked:true },
    { id:63,  name:"Nana Dzagnidze",  elo:2545,  category:"Chess GM",  locked:true },
    { id:64,  name:"Anna Muzychuk",  elo:2534,  category:"Chess GM",  locked:true },
    { id:65,  name:"Mariya Muzychuk",  elo:2534,  category:"Chess GM",  locked:true },
    { id:66,  name:"Tan Zhongyi",  elo:2533,  category:"Chess GM",  locked:true },
    { id:67,  name:"Alexandra Kosteniuk",  elo:2524,  category:"Chess GM",  locked:true },
    { id:68,  name:"Elisabeth Paehtz",  elo:2498,  category:"Chess GM",  locked:true },
    { id:69,  name:"Antoaneta Stefanova",  elo:2492,  category:"Chess GM",  locked:true },
    { id:70,  name:"Irina Krush",  elo:2476,  category:"Chess GM",  locked:true },
    { id:71,  name:"GothamChess (Levy)",  elo:2400,  category:"Chess GM",  locked:true },
    { id:72,  name:"Eric Rosen",  elo:2400,  category:"Chess GM",  locked:true },
    { id:73,  name:"Anna Cramling",  elo:2175,  category:"Chess GM",  locked:true },
    { id:74,  name:"Botez Sisters",  elo:1900,  category:"Chess GM",  locked:true },
    { id:75,  name:"Vidit Gujrathi",  elo:2724,  category:"Chess GM",  locked:false },
    { id:76,  name:"Viktor",  elo:400,  category:"Regular", locked:false },
    { id:77,  name:"Sophia",  elo:408,  category:"Regular", locked:false },
    { id:78,  name:"Diego",  elo:416,  category:"Regular", locked:false },
    { id:79,  name:"Emma",  elo:424,  category:"Regular", locked:false },
    { id:80,  name:"Raj",  elo:432,  category:"Regular", locked:false },
    { id:81,  name:"Olivia",  elo:440,  category:"Regular", locked:false },
    { id:82,  name:"Hassan",  elo:448,  category:"Regular", locked:false },
    { id:83,  name:"Isabella",  elo:456,  category:"Regular", locked:false },
    { id:84,  name:"Yuki",  elo:464,  category:"Regular", locked:false },
    { id:85,  name:"Lucas",  elo:472,  category:"Regular", locked:false },
    { id:86,  name:"Amara",  elo:480,  category:"Regular", locked:false },
    { id:87,  name:"Noah",  elo:489,  category:"Regular", locked:false },
    { id:88,  name:"Zara",  elo:497,  category:"Regular", locked:false },
    { id:89,  name:"Leo",  elo:505,  category:"Regular", locked:false },
    { id:90,  name:"Priya",  elo:513,  category:"Regular", locked:false },
    { id:91,  name:"Mateo",  elo:521,  category:"Regular", locked:false },
    { id:92,  name:"Aaliyah",  elo:529,  category:"Regular", locked:false },
    { id:93,  name:"Oscar",  elo:537,  category:"Regular", locked:false },
    { id:94,  name:"Fatima",  elo:545,  category:"Regular", locked:false },
    { id:95,  name:"Felix",  elo:553,  category:"Regular", locked:false },
    { id:96,  name:"Nina",  elo:561,  category:"Regular", locked:false },
    { id:97,  name:"Santiago",  elo:569,  category:"Regular", locked:false },
    { id:98,  name:"Leila",  elo:578,  category:"Regular", locked:false },
    { id:99,  name:"Andre",  elo:586,  category:"Regular", locked:false },
    { id:100,  name:"Jasmine",  elo:594,  category:"Regular", locked:false },
    { id:101,  name:"Marco",  elo:602,  category:"Regular", locked:false },
    { id:102,  name:"Elena",  elo:610,  category:"Regular", locked:false },
    { id:103,  name:"Kai",  elo:618,  category:"Regular", locked:false },
    { id:104,  name:"Sofia",  elo:626,  category:"Regular", locked:false },
    { id:105,  name:"Dimitri",  elo:634,  category:"Regular", locked:false },
    { id:106,  name:"Ava",  elo:642,  category:"Regular", locked:false },
    { id:107,  name:"Pavel",  elo:650,  category:"Regular", locked:false },
    { id:108,  name:"Mia",  elo:659,  category:"Regular", locked:false },
    { id:109,  name:"Tariq",  elo:667,  category:"Regular", locked:false },
    { id:110,  name:"Lily",  elo:675,  category:"Regular", locked:false },
    { id:111,  name:"Boris",  elo:683,  category:"Regular", locked:false },
    { id:112,  name:"Alex",  elo:691,  category:"Regular", locked:false },
    { id:113,  name:"Maria",  elo:699,  category:"Regular", locked:false },
    { id:114,  name:"Chen",  elo:707,  category:"Regular", locked:false },
    { id:115,  name:"Aisha",  elo:715,  category:"Regular", locked:false },
    { id:116,  name:"Cole",  elo:723,  category:"Regular", locked:false },
    { id:117,  name:"Freya",  elo:731,  category:"Regular", locked:false },
    { id:118,  name:"Nico",  elo:739,  category:"Regular", locked:false },
    { id:119,  name:"Alara",  elo:748,  category:"Regular", locked:false },
    { id:120,  name:"Rex",  elo:756,  category:"Regular", locked:false },
    { id:121,  name:"Vera",  elo:764,  category:"Regular", locked:false },
    { id:122,  name:"Cruz",  elo:772,  category:"Regular", locked:false },
    { id:123,  name:"Mara",  elo:780,  category:"Regular", locked:false },
    { id:124,  name:"Troy",  elo:788,  category:"Regular", locked:false },
    { id:125,  name:"Luna",  elo:796,  category:"Regular", locked:false },
    { id:126,  name:"Jax",  elo:804,  category:"Regular", locked:false },
    { id:127,  name:"Sam",  elo:812,  category:"Regular", locked:false },
    { id:128,  name:"Petra",  elo:820,  category:"Regular", locked:false },
    { id:129,  name:"Finn",  elo:829,  category:"Regular", locked:false },
    { id:130,  name:"Nadia",  elo:837,  category:"Regular", locked:false },
    { id:131,  name:"Omar",  elo:845,  category:"Regular", locked:true },
    { id:132,  name:"Chloe",  elo:853,  category:"Regular", locked:true },
    { id:133,  name:"Bruno",  elo:861,  category:"Regular", locked:true },
    { id:134,  name:"Layla",  elo:869,  category:"Regular", locked:true },
    { id:135,  name:"Eli",  elo:877,  category:"Regular", locked:true },
    { id:136,  name:"Jade",  elo:885,  category:"Regular", locked:true },
    { id:137,  name:"Kurt",  elo:893,  category:"Regular", locked:true },
    { id:138,  name:"Lila",  elo:901,  category:"Regular", locked:true },
    { id:139,  name:"Mace",  elo:909,  category:"Regular", locked:true },
    { id:140,  name:"Nell",  elo:918,  category:"Regular", locked:true },
    { id:141,  name:"Remy",  elo:926,  category:"Regular", locked:true },
    { id:142,  name:"Skye",  elo:934,  category:"Regular", locked:true },
    { id:143,  name:"Reed",  elo:942,  category:"Regular", locked:true },
    { id:144,  name:"Hazel",  elo:950,  category:"Regular", locked:true },
    { id:145,  name:"Gray",  elo:958,  category:"Regular", locked:true },
    { id:146,  name:"Knox",  elo:966,  category:"Regular", locked:true },
    { id:147,  name:"Milo",  elo:974,  category:"Regular", locked:true },
    { id:148,  name:"Nova",  elo:982,  category:"Regular", locked:true },
    { id:149,  name:"Prue",  elo:990,  category:"Regular", locked:true },
    { id:150,  name:"Thea",  elo:999,  category:"Regular", locked:true },
    { id:151,  name:"Amy",  elo:100,  category:"Regular", locked:false },
    { id:152,  name:"Ben",  elo:104,  category:"Regular", locked:false },
    { id:153,  name:"Cal",  elo:108,  category:"Regular", locked:false },
    { id:154,  name:"Dawn",  elo:112,  category:"Regular", locked:false },
    { id:155,  name:"Faye",  elo:116,  category:"Regular", locked:false },
    { id:156,  name:"Gil",  elo:120,  category:"Regular", locked:false },
    { id:157,  name:"Hope",  elo:124,  category:"Regular", locked:false },
    { id:158,  name:"Ian",  elo:128,  category:"Regular", locked:false },
    { id:159,  name:"Jess",  elo:132,  category:"Regular", locked:false },
    { id:160,  name:"Kim",  elo:136,  category:"Regular", locked:false },
    { id:161,  name:"Lee",  elo:140,  category:"Regular", locked:false },
    { id:162,  name:"Max",  elo:144,  category:"Regular", locked:false },
    { id:163,  name:"Nora",  elo:148,  category:"Regular", locked:false },
    { id:164,  name:"Owen",  elo:152,  category:"Regular", locked:false },
    { id:165,  name:"Pam",  elo:156,  category:"Regular", locked:false },
    { id:166,  name:"Ned",  elo:160,  category:"Regular", locked:false },
    { id:167,  name:"Sue",  elo:164,  category:"Regular", locked:false },
    { id:168,  name:"Tim",  elo:168,  category:"Regular", locked:false },
    { id:169,  name:"Una",  elo:172,  category:"Regular", locked:false },
    { id:170,  name:"Vin",  elo:176,  category:"Regular", locked:false },
    { id:171,  name:"Wren",  elo:180,  category:"Regular", locked:false },
    { id:172,  name:"Xia",  elo:184,  category:"Regular", locked:false },
    { id:173,  name:"Jay",  elo:188,  category:"Regular", locked:false },
    { id:174,  name:"Ace",  elo:192,  category:"Regular", locked:false },
    { id:175,  name:"Bex",  elo:196,  category:"Regular", locked:false },
    { id:176,  name:"Coy",  elo:201,  category:"Regular", locked:false },
    { id:177,  name:"Dex",  elo:205,  category:"Regular", locked:false },
    { id:178,  name:"Eve",  elo:209,  category:"Regular", locked:false },
    { id:179,  name:"Fox",  elo:213,  category:"Regular", locked:false },
    { id:180,  name:"Gem",  elo:217,  category:"Regular", locked:false },
    { id:181,  name:"Hal",  elo:221,  category:"Regular", locked:false },
    { id:182,  name:"Ida",  elo:225,  category:"Regular", locked:false },
    { id:183,  name:"Kay",  elo:229,  category:"Regular", locked:false },
    { id:184,  name:"Lou",  elo:233,  category:"Regular", locked:false },
    { id:185,  name:"Mae",  elo:237,  category:"Regular", locked:false },
    { id:186,  name:"Ola",  elo:241,  category:"Regular", locked:false },
    { id:187,  name:"Pat",  elo:245,  category:"Regular", locked:false },
    { id:188,  name:"Rob",  elo:249,  category:"Regular", locked:false },
    { id:189,  name:"Sia",  elo:253,  category:"Regular", locked:false },
    { id:190,  name:"Teo",  elo:257,  category:"Regular", locked:false },
    { id:191,  name:"Val",  elo:261,  category:"Regular", locked:false },
    { id:192,  name:"Win",  elo:265,  category:"Regular", locked:false },
    { id:193,  name:"Abel",  elo:269,  category:"Regular", locked:false },
    { id:194,  name:"Bree",  elo:273,  category:"Regular", locked:false },
    { id:195,  name:"Dani",  elo:277,  category:"Regular", locked:false },
    { id:196,  name:"Eden",  elo:281,  category:"Regular", locked:false },
    { id:197,  name:"Glen",  elo:285,  category:"Regular", locked:false },
    { id:198,  name:"Hana",  elo:289,  category:"Regular", locked:false },
    { id:199,  name:"Igor",  elo:293,  category:"Regular", locked:false },
    { id:200,  name:"Imo",  elo:297,  category:"Regular", locked:false },
    { id:201,  name:"Otto",  elo:302,  category:"Regular", locked:false },
    { id:202,  name:"Penn",  elo:306,  category:"Regular", locked:false },
    { id:203,  name:"Rain",  elo:310,  category:"Regular", locked:false },
    { id:204,  name:"Seth",  elo:314,  category:"Regular", locked:false },
    { id:205,  name:"Ugo",  elo:318,  category:"Regular", locked:false },
    { id:206,  name:"Vito",  elo:322,  category:"Regular", locked:true },
    { id:207,  name:"Walt",  elo:326,  category:"Regular", locked:true },
    { id:208,  name:"Arlo",  elo:330,  category:"Regular", locked:true },
    { id:209,  name:"Beau",  elo:334,  category:"Regular", locked:true },
    { id:210,  name:"Chip",  elo:338,  category:"Regular", locked:true },
    { id:211,  name:"Dell",  elo:342,  category:"Regular", locked:true },
    { id:212,  name:"Flo",  elo:346,  category:"Regular", locked:true },
    { id:213,  name:"Koda",  elo:350,  category:"Regular", locked:true },
    { id:214,  name:"Alby",  elo:354,  category:"Regular", locked:true },
    { id:215,  name:"Elan",  elo:358,  category:"Regular", locked:true },
    { id:216,  name:"Fitz",  elo:362,  category:"Regular", locked:true },
    { id:217,  name:"Gwen",  elo:366,  category:"Regular", locked:true },
    { id:218,  name:"Holt",  elo:370,  category:"Regular", locked:true },
    { id:219,  name:"Toby",  elo:374,  category:"Regular", locked:true },
    { id:220,  name:"Zuri",  elo:378,  category:"Regular", locked:true },
    { id:221,  name:"Roan",  elo:382,  category:"Regular", locked:true },
    { id:222,  name:"Sari",  elo:386,  category:"Regular", locked:true },
    { id:223,  name:"Ula",  elo:390,  category:"Regular", locked:true },
    { id:224,  name:"Viggo",  elo:394,  category:"Regular", locked:true },
    { id:225,  name:"Yori",  elo:399,  category:"Regular", locked:true },
    { id:226,  name:"Casper",  elo:1000,  category:"Regular", locked:false },
    { id:227,  name:"Dominic",  elo:1010,  category:"Regular", locked:false },
    { id:228,  name:"Emilia",  elo:1021,  category:"Regular", locked:false },
    { id:229,  name:"Greta",  elo:1032,  category:"Regular", locked:false },
    { id:230,  name:"Henrik",  elo:1043,  category:"Regular", locked:false },
    { id:231,  name:"Julius",  elo:1053,  category:"Regular", locked:false },
    { id:232,  name:"Kira",  elo:1064,  category:"Regular", locked:false },
    { id:233,  name:"Laszlo",  elo:1075,  category:"Regular", locked:false },
    { id:234,  name:"Marcus",  elo:1086,  category:"Regular", locked:false },
    { id:235,  name:"Natasha",  elo:1097,  category:"Regular", locked:false },
    { id:236,  name:"Quinn",  elo:1107,  category:"Regular", locked:false },
    { id:237,  name:"Rory",  elo:1118,  category:"Regular", locked:false },
    { id:238,  name:"Sage",  elo:1129,  category:"Regular", locked:false },
    { id:239,  name:"Theo",  elo:1140,  category:"Regular", locked:false },
    { id:240,  name:"Uma",  elo:1151,  category:"Regular", locked:false },
    { id:241,  name:"Vince",  elo:1161,  category:"Regular", locked:false },
    { id:242,  name:"Wendy",  elo:1172,  category:"Regular", locked:false },
    { id:243,  name:"Xander",  elo:1183,  category:"Regular", locked:false },
    { id:244,  name:"Yasmin",  elo:1194,  category:"Regular", locked:false },
    { id:245,  name:"Zeke",  elo:1205,  category:"Regular", locked:false },
    { id:246,  name:"Aria",  elo:1215,  category:"Regular", locked:false },
    { id:247,  name:"Dante",  elo:1226,  category:"Regular", locked:false },
    { id:248,  name:"Fraser",  elo:1237,  category:"Regular", locked:false },
    { id:249,  name:"Giselle",  elo:1248,  category:"Regular", locked:false },
    { id:250,  name:"Hunter",  elo:1259,  category:"Regular", locked:false },
    { id:251,  name:"Juno",  elo:1269,  category:"Regular", locked:false },
    { id:252,  name:"Kendra",  elo:1280,  category:"Regular", locked:false },
    { id:253,  name:"Lance",  elo:1291,  category:"Regular", locked:false },
    { id:254,  name:"Noel",  elo:1302,  category:"Regular", locked:false },
    { id:255,  name:"Piper",  elo:1313,  category:"Regular", locked:false },
    { id:256,  name:"Riley",  elo:1323,  category:"Regular", locked:false },
    { id:257,  name:"Scott",  elo:1334,  category:"Regular", locked:false },
    { id:258,  name:"Tessa",  elo:1345,  category:"Regular", locked:false },
    { id:259,  name:"Ulysses",  elo:1356,  category:"Regular", locked:false },
    { id:260,  name:"Vita",  elo:1367,  category:"Regular", locked:false },
    { id:261,  name:"Wade",  elo:1377,  category:"Regular", locked:false },
    { id:262,  name:"Xena",  elo:1388,  category:"Regular", locked:false },
    { id:263,  name:"York",  elo:1399,  category:"Regular", locked:false },
    { id:264,  name:"Zoey",  elo:1410,  category:"Regular", locked:false },
    { id:265,  name:"Adrian",  elo:1421,  category:"Regular", locked:false },
    { id:266,  name:"Blake",  elo:1431,  category:"Regular", locked:false },
    { id:267,  name:"Cara",  elo:1442,  category:"Regular", locked:false },
    { id:268,  name:"Iris",  elo:1453,  category:"Regular", locked:false },
    { id:269,  name:"Emre",  elo:1464,  category:"Regular", locked:false },
    { id:270,  name:"Layla",  elo:1475,  category:"Regular", locked:false },
    { id:271,  name:"Kasim",  elo:1485,  category:"Regular", locked:false },
    { id:272,  name:"Sven",  elo:1496,  category:"Regular", locked:false },
    { id:273,  name:"Tova",  elo:1507,  category:"Regular", locked:false },
    { id:274,  name:"Fabian",  elo:1518,  category:"Regular", locked:false },
    { id:275,  name:"Alina",  elo:1529,  category:"Regular", locked:false },
    { id:276,  name:"Dario",  elo:1539,  category:"Regular", locked:false },
    { id:277,  name:"Cleo",  elo:1550,  category:"Regular", locked:false },
    { id:278,  name:"Bram",  elo:1561,  category:"Regular", locked:false },
    { id:279,  name:"Orla",  elo:1572,  category:"Regular", locked:false },
    { id:280,  name:"Lyra",  elo:1583,  category:"Regular", locked:false },
    { id:281,  name:"Mack",  elo:1593,  category:"Regular", locked:true },
    { id:282,  name:"Nash",  elo:1604,  category:"Regular", locked:true },
    { id:283,  name:"Elan",  elo:1615,  category:"Regular", locked:true },
    { id:284,  name:"Fitz",  elo:1626,  category:"Regular", locked:true },
    { id:285,  name:"Gwen",  elo:1637,  category:"Regular", locked:true },
    { id:286,  name:"Holt",  elo:1647,  category:"Regular", locked:true },
    { id:287,  name:"Iman",  elo:1658,  category:"Regular", locked:true },
    { id:288,  name:"Kael",  elo:1669,  category:"Regular", locked:true },
    { id:289,  name:"Brendan",  elo:1680,  category:"Regular", locked:true },
    { id:290,  name:"Celestine",  elo:1691,  category:"Regular", locked:true },
    { id:291,  name:"Drago",  elo:1701,  category:"Regular", locked:true },
    { id:292,  name:"Elara",  elo:1712,  category:"Regular", locked:true },
    { id:293,  name:"Florent",  elo:1723,  category:"Regular", locked:true },
    { id:294,  name:"Gavril",  elo:1734,  category:"Regular", locked:true },
    { id:295,  name:"Haruto",  elo:1745,  category:"Regular", locked:true },
    { id:296,  name:"Imogen",  elo:1755,  category:"Regular", locked:true },
    { id:297,  name:"Joaquin",  elo:1766,  category:"Regular", locked:true },
    { id:298,  name:"Kalani",  elo:1777,  category:"Regular", locked:true },
    { id:299,  name:"Lorenz",  elo:1788,  category:"Regular", locked:true },
    { id:300,  name:"Mireia",  elo:1799,  category:"Regular", locked:true },
    { id:301,  name:"Mateo",  elo:1800,  category:"Regular", locked:false },
    { id:302,  name:"Aaliyah",  elo:1809,  category:"Regular", locked:false },
    { id:303,  name:"Oscar",  elo:1818,  category:"Regular", locked:false },
    { id:304,  name:"Fatima",  elo:1828,  category:"Regular", locked:false },
    { id:305,  name:"Felix",  elo:1837,  category:"Regular", locked:false },
    { id:306,  name:"Boris",  elo:1847,  category:"Regular", locked:false },
    { id:307,  name:"Lily",  elo:1856,  category:"Regular", locked:false },
    { id:308,  name:"Alex",  elo:1866,  category:"Regular", locked:false },
    { id:309,  name:"Maria",  elo:1875,  category:"Regular", locked:false },
    { id:310,  name:"Chen",  elo:1885,  category:"Regular", locked:false },
    { id:311,  name:"Yuki",  elo:1894,  category:"Regular", locked:false },
    { id:312,  name:"Amara",  elo:1903,  category:"Regular", locked:false },
    { id:313,  name:"Noah",  elo:1913,  category:"Regular", locked:false },
    { id:314,  name:"Zara",  elo:1922,  category:"Regular", locked:false },
    { id:315,  name:"Leo",  elo:1932,  category:"Regular", locked:false },
    { id:316,  name:"Priya",  elo:1941,  category:"Regular", locked:false },
    { id:317,  name:"Hassan",  elo:1951,  category:"Regular", locked:false },
    { id:318,  name:"Diego",  elo:1960,  category:"Regular", locked:false },
    { id:319,  name:"Emma",  elo:1970,  category:"Regular", locked:false },
    { id:320,  name:"Isabella",  elo:1979,  category:"Regular", locked:false },
    { id:321,  name:"Viktor",  elo:1988,  category:"Regular", locked:false },
    { id:322,  name:"Sophia",  elo:1998,  category:"Regular", locked:false },
    { id:323,  name:"Raj",  elo:2007,  category:"Regular", locked:false },
    { id:324,  name:"Olivia",  elo:2017,  category:"Regular", locked:false },
    { id:325,  name:"Pavel",  elo:2026,  category:"Regular", locked:false },
    { id:326,  name:"Santiago",  elo:2036,  category:"Regular", locked:false },
    { id:327,  name:"Leila",  elo:2045,  category:"Regular", locked:false },
    { id:328,  name:"Andre",  elo:2055,  category:"Regular", locked:false },
    { id:329,  name:"Marco",  elo:2064,  category:"Regular", locked:false },
    { id:330,  name:"Elena",  elo:2073,  category:"Regular", locked:false },
    { id:331,  name:"Astrid",  elo:2083,  category:"Regular", locked:false },
    { id:332,  name:"Brendan",  elo:2092,  category:"Regular", locked:false },
    { id:333,  name:"Celeste",  elo:2102,  category:"Regular", locked:false },
    { id:334,  name:"Drake",  elo:2111,  category:"Regular", locked:false },
    { id:335,  name:"Elara",  elo:2121,  category:"Regular", locked:false },
    { id:336,  name:"Gavril",  elo:2130,  category:"Regular", locked:false },
    { id:337,  name:"Haruto",  elo:2140,  category:"Regular", locked:false },
    { id:338,  name:"Imogen",  elo:2149,  category:"Regular", locked:false },
    { id:339,  name:"Joaquin",  elo:2158,  category:"Regular", locked:false },
    { id:340,  name:"Kalani",  elo:2168,  category:"Regular", locked:false },
    { id:341,  name:"Lorenz",  elo:2177,  category:"Regular", locked:false },
    { id:342,  name:"Mireia",  elo:2187,  category:"Regular", locked:false },
    { id:343,  name:"Niamh",  elo:2196,  category:"Regular", locked:false },
    { id:344,  name:"Oberon",  elo:2206,  category:"Regular", locked:false },
    { id:345,  name:"Paloma",  elo:2215,  category:"Regular", locked:false },
    { id:346,  name:"Qasim",  elo:2225,  category:"Regular", locked:false },
    { id:347,  name:"Rowena",  elo:2234,  category:"Regular", locked:false },
    { id:348,  name:"Stellan",  elo:2243,  category:"Regular", locked:false },
    { id:349,  name:"Tamsin",  elo:2253,  category:"Regular", locked:false },
    { id:350,  name:"Ulrik",  elo:2262,  category:"Regular", locked:false },
    { id:351,  name:"Vesna",  elo:2272,  category:"Regular", locked:false },
    { id:352,  name:"Xochitl",  elo:2281,  category:"Regular", locked:false },
    { id:353,  name:"Yngve",  elo:2291,  category:"Regular", locked:false },
    { id:354,  name:"Zorka",  elo:2300,  category:"Regular", locked:false },
    { id:355,  name:"Adaeze",  elo:2310,  category:"Regular", locked:false },
    { id:356,  name:"Bertram",  elo:2319,  category:"Regular", locked:true },
    { id:357,  name:"Cosima",  elo:2328,  category:"Regular", locked:true },
    { id:358,  name:"Dragan",  elo:2338,  category:"Regular", locked:true },
    { id:359,  name:"Elspeth",  elo:2347,  category:"Regular", locked:true },
    { id:360,  name:"Florent",  elo:2357,  category:"Regular", locked:true },
    { id:361,  name:"Giulia",  elo:2366,  category:"Regular", locked:true },
    { id:362,  name:"Halvard",  elo:2376,  category:"Regular", locked:true },
    { id:363,  name:"Isolde",  elo:2385,  category:"Regular", locked:true },
    { id:364,  name:"Jakub",  elo:2395,  category:"Regular", locked:true },
    { id:365,  name:"Kirabo",  elo:2404,  category:"Regular", locked:true },
    { id:366,  name:"Saoirse",  elo:2413,  category:"Regular", locked:true },
    { id:367,  name:"Tarquin",  elo:2423,  category:"Regular", locked:true },
    { id:368,  name:"Umberto",  elo:2432,  category:"Regular", locked:true },
    { id:369,  name:"Valdis",  elo:2442,  category:"Regular", locked:true },
    { id:370,  name:"Wolfram",  elo:2451,  category:"Regular", locked:true },
    { id:371,  name:"Xiulan",  elo:2461,  category:"Regular", locked:true },
    { id:372,  name:"Yaroslav",  elo:2470,  category:"Regular", locked:true },
    { id:373,  name:"Zinedine",  elo:2480,  category:"Regular", locked:true },
    { id:374,  name:"Abebe",  elo:2489,  category:"Regular", locked:true },
    { id:375,  name:"Bogdan",  elo:2499,  category:"Regular", locked:true },
    { id:376,  name:"Stockfish 18",  elo:3700,  category:"Engine", locked:false },
    { id:377,  name:"Stockfish 17",  elo:3650,  category:"Engine", locked:false },
    { id:378,  name:"Stockfish 16.1",  elo:3610,  category:"Engine", locked:false },
    { id:379,  name:"Stockfish 16",  elo:3600,  category:"Engine", locked:false },
    { id:380,  name:"Komodo Dragon 3",  elo:3550,  category:"Engine", locked:false },
    { id:381,  name:"Leela Chess Zero",  elo:3580,  category:"Engine", locked:false },
    { id:382,  name:"AlphaZero Style",  elo:3650,  category:"Engine", locked:false },
    { id:383,  name:"Houdini 6",  elo:3480,  category:"Engine", locked:false },
    { id:384,  name:"Dragon 3.2",  elo:3520,  category:"Engine", locked:false },
    { id:385,  name:"Ethereal 14",  elo:3420,  category:"Engine", locked:false },
    { id:386,  name:"Berserk 12",  elo:3400,  category:"Engine", locked:false },
    { id:387,  name:"Koivisto 9",  elo:3370,  category:"Engine", locked:true },
    { id:388,  name:"RubiChess 3",  elo:3390,  category:"Engine", locked:true },
    { id:389,  name:"Torch 2",  elo:3360,  category:"Engine", locked:true },
    { id:390,  name:"Royal Chess Arena Engine",  elo:1500,  category:"Engine", locked:false }
];


// ── PIECE VALUES ──────────────────────────────────────────────────────────────
const PIECE_VALUES = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// ── PIECE-SQUARE TABLES (white's perspective, rank 1→8 = index 0→7) ──────────
// These are CRITICAL for positional play — previously defined but never used!
const PST = {
    p: [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    b: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    r: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0
    ],
    q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    // Middlegame king safety (hide the king!)
    k_mid: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    ],
    // Endgame king activity (centralize!)
    k_end: [
        -50,-40,-30,-20,-20,-30,-40,-50,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -50,-30,-30,-30,-30,-30,-30,-50
    ]
};

// ── PST LOOKUP ─────────────────────────────────────────────────────────────────
// Returns the piece-square bonus for a piece at a board position
function getPSTValue(pieceType, color, rank, file, isEndgame) {
    // rank: 0=rank1, 7=rank8  |  file: 0=fileA, 7=fileH
    let tableIdx;
    if (color === 'w') {
        // White: rank 0 is at the bottom of the board (rank 1), PST index 56+file
        tableIdx = (7 - rank) * 8 + file;
    } else {
        // Black: mirror vertically
        tableIdx = rank * 8 + file;
    }

    if (pieceType === 'k') {
        return isEndgame ? PST.k_end[tableIdx] : PST.k_mid[tableIdx];
    }
    return PST[pieceType] ? PST[pieceType][tableIdx] : 0;
}

// ── ENDGAME DETECTION ─────────────────────────────────────────────────────────
function isEndgame(board) {
    let queens = 0, minors = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            if (p.type === 'q') queens++;
            if (p.type === 'n' || p.type === 'b' || p.type === 'r') minors++;
        }
    }
    return queens === 0 || (queens <= 2 && minors <= 2);
}

// ── OPENING BOOK ─────────────────────────────────────────────────────────────
// Weighted move table keyed by FEN position prefix (first 3 fields = position + turn).
// Each entry: [uci_move, weight] — higher weight = more likely to be chosen.
// Covers: e4/d4/c4/Nf3 systems, Sicilian, French, Caro, KID, QGD, Italian, Spanish,
//         London, King's Indian Attack, English, and many sub-lines.
const OPENING_BOOK = {
    // ════════════════════════════════════════════════════════════════════════
    //  START POSITION
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': [
        ['e2e4',12],['d2d4',11],['c2c4',6],['g1f3',5],['g2g3',2],['b2b3',2],['f2f4',1]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  1.e4 RESPONSES
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': [
        ['e7e5',12],['c7c5',12],['e7e6',9],['c7c6',8],['d7d5',7],['g8f6',5],['d7d6',4],['g7g6',3]
    ],

    // 1.e4 e5
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': [
        ['g1f3',12],['f1c4',7],['f2f4',3],['b1c3',4],['d2d4',2]
    ],
    // 1.e4 e5 2.Nf3
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b': [
        ['b8c6',12],['g8f6',8],['d7d6',4],['f7f5',2]
    ],
    // 1.e4 e5 2.Nf3 Nc6
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
        ['f1b5',11],['f1c4',10],['d2d4',7],['b1c3',5],['f1e2',3]
    ],

    // ── RUY LOPEZ ────────────────────────────────────────────────────────────
    // 3.Bb5
    'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b': [
        ['a7a6',12],['g8f6',9],['f8c5',6],['d7d6',4],['b7b5',3],['g7g6',3]
    ],
    // 3.Bb5 a6 (Morphy) 4.Ba4
    'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b': [
        ['g8f6',12],['d7d6',5],['f8c5',5],['b7b5',4]
    ],
    // 3.Bb5 a6 4.Ba4 Nf6 5.O-O
    'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b': [
        ['f8e7',12],['b7b5',8],['d7d6',5]
    ],
    // 5...Be7 6.Re1
    'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 b': [
        ['b7b5',10],['e8g8',12],['d7d6',5]
    ],
    // 5...Be7 6.Re1 b5 7.Bb3
    'r1bqk2r/1pppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 b': [
        ['e8g8',12],['d7d6',7]
    ],

    // ── ITALIAN GAME ─────────────────────────────────────────────────────────
    // 3.Bc4
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b': [
        ['f8c5',12],['g8f6',10],['f8e7',5],['d7d6',4]
    ],
    // 3.Bc4 Bc5 4.c3
    'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b': [
        ['g8f6',12],['d7d6',6],['a7a6',4]
    ],
    // 3.Bc4 Bc5 4.c3 Nf6 5.d4
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b': [
        ['e5d4',12],['f8e7',6]
    ],
    // 3.Bc4 Nf6 (Two Knights)
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w': [
        ['d2d3',8],['b1c3',8],['d2d4',7],['e1g1',7]
    ],

    // ── SCOTCH GAME ──────────────────────────────────────────────────────────
    // 3.d4
    'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b': [
        ['e5d4',12],['d7d6',4]
    ],
    // 3.d4 exd4 4.Nxd4
    'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w': [
        ['f3d4',12]
    ],
    'r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b': [
        ['g8f6',10],['f8c5',9],['d8h4',6]
    ],

    // ── FOUR KNIGHTS ─────────────────────────────────────────────────────────
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w': [
        ['f1b5',10],['f1c4',8],['d2d4',6]
    ],

    // ── PETROV DEFENSE ───────────────────────────────────────────────────────
    'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
        ['f3e5',10],['d2d4',8],['b1c3',5]
    ],

    // ── GIUOCO PIANO / EVANS GAMBIT continuation ─────────────────────────────
    'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w': [
        ['c2c3',10],['d2d3',8],['b2b4',5],['e1g1',7]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  SICILIAN DEFENSE
    // ════════════════════════════════════════════════════════════════════════
    // 1.e4 c5 2.Nf3
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': [
        ['g1f3',12],['b1c3',7],['f2f4',4],['c2c3',3]
    ],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b': [
        ['d7d6',12],['b8c6',10],['e7e6',9],['g7g6',7],['a7a6',4]
    ],
    // 2.Nf3 d6 3.d4
    'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
        ['d2d4',12],['f1b5',5]
    ],
    'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b': [
        ['c5d4',12]
    ],
    // 3...cxd4 4.Nxd4 (Open Sicilian)
    'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b': [
        ['g8f6',12],['b8c6',10],['a7a6',9],['g7g6',7]
    ],
    // Najdorf 4...Nf6 5.Nc3
    'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b': [
        ['a7a6',12],['e7e6',9],['g7g6',7],['e7e5',6]
    ],
    // Najdorf a6 6.Bg5
    'rnbqkb1r/1p2pppp/p2p1n2/6B1/3NP3/2N5/PPP2PPP/R2QKB1R b': [
        ['e7e6',12],['g7g6',7],['b7b5',6]
    ],
    // Dragon 4...g6
    'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w': [
        ['c1e3',9],['f1e2',8],['f2f3',6]
    ],
    // Scheveningen 4...e6
    'rnbqkb1r/pp3ppp/3ppn2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w': [
        ['c1e3',9],['f1e2',8],['g2g4',6]
    ],
    // 2.Nf3 Nc6 3.d4
    'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
        ['d2d4',12]
    ],
    'r1bqkbnr/pp1ppppp/2n5/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b': [
        ['c5d4',12]
    ],
    // 2.Nf3 e6 3.d4
    'rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
        ['d2d4',12],['b1c3',6]
    ],
    // Kan/Taimanov after cxd4
    'rnbqkbnr/pp1p1ppp/4p3/8/3NP3/8/PPP2PPP/RNBQKB1R b': [
        ['b8c6',10],['a7a6',9],['g8f6',8]
    ],
    // Closed Sicilian 2.Nc3
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b': [
        ['b8c6',10],['e7e6',9],['g7g6',8],['d7d6',7]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  FRENCH DEFENSE
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w': [
        ['d2d4',12],['b1c3',5],['b1d2',4],['g1f3',3]
    ],
    'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b': [
        ['d7d5',12],['c7c5',5]
    ],
    // 1.e4 e6 2.d4 d5 3.Nc3
    'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b': [
        ['g8f6',12],['d5e4',9],['f8b4',8],['c7c5',7]
    ],
    // 3.Nd2
    'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPPN1PPP/R1BQKBNR b': [
        ['g8f6',12],['c7c5',10],['f8e7',8]
    ],
    // Winawer: 3.Nc3 Bb4
    'rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w': [
        ['e4e5',12],['a2a3',9],['d8d3',7]
    ],
    // Classical: 3.Nc3 Nf6 4.e5
    'rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w': [
        ['e4e5',12],['e4d5',7],['f1d3',6]
    ],
    // 4.e5 Nfd7 5.f4
    'rnbqkb1r/pppn1ppp/4p3/3pP3/3P4/2N5/PPP2PPP/R1BQKBNR w': [
        ['f2f4',10],['g1f3',8],['c1e3',7]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  CARO-KANN DEFENSE
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w': [
        ['d2d4',12],['b1c3',7],['g1f3',4]
    ],
    'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b': [
        ['d7d5',12]
    ],
    // 2.d4 d5 3.Nc3
    'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b': [
        ['d5e4',12],['g7g6',5],['e7e6',5]
    ],
    // 3...dxe4 4.Nxe4
    'rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b': [
        ['c8f5',12],['g8f6',10],['b8d7',8]
    ],
    // Classical: 4...Bf5 5.Ng3 Bg6
    'rnbqkbnr/pp2pppp/2p3b1/8/3P4/6N1/PPP2PPP/R1BQKBNR w': [
        ['h2h4',10],['f1d3',9]
    ],
    // Advance: 3.e5
    'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b': [
        ['c8f5',12],['e7e6',8],['g7g6',5]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  PIRC / MODERN DEFENSE
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w': [
        ['d2d4',10],['b1c3',8],['g1f3',7]
    ],
    'rnbqkbnr/ppp1pppp/3p4/8/3PP3/8/PPP2PPP/RNBQKBNR b': [
        ['g8f6',12],['g7g6',10]
    ],
    'rnbqkbnr/ppp1pp1p/3p2p1/8/3PP3/8/PPP2PPP/RNBQKBNR w': [
        ['b1c3',10],['g1f3',9],['f2f4',7]
    ],
    // Pirc: ...Nf6 ...g6 ...Bg7
    'rnbqk2r/ppp1ppbp/3p1np1/8/3PP3/2N5/PPP2PPP/R1BQKBNR w': [
        ['f2f4',10],['g1f3',9],['c1e3',8],['f1e2',7]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  1.d4 OPENINGS
    // ════════════════════════════════════════════════════════════════════════
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': [
        ['d7d5',12],['g8f6',11],['e7e6',7],['c7c5',7],['g7g6',6],['f7f5',3]
    ],
    // 1.d4 d5 2.c4 (QGD/QGA)
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w': [
        ['c2c4',12],['g1f3',8],['e2e3',4],['c1f4',4]
    ],
    'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b': [
        ['e7e6',12],['c7c6',11],['d5c4',8],['g8f6',7],['c7c5',5]
    ],
    // QGD 2...e6 3.Nc3
    'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b': [
        ['g8f6',12],['c7c6',8],['f8e7',7],['c7c5',6]
    ],
    // QGD 3.Nc3 Nf6 4.Bg5
    'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N3P1/PP2PP1P/R1BQKBNR b': [
        ['f8e7',12],['b8d7',9]
    ],
    'rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b': [
        ['f8e7',12],['b8d7',9],['h7h6',7]
    ],
    // QGA: 2...dxc4 3.e3
    'rnbqkbnr/ppp1pppp/8/8/2pP4/4P3/PP3PPP/RNBQKBNR b': [
        ['e7e5',10],['g8f6',9],['c7c5',8]
    ],
    // Slav: 2.c4 c6
    'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w': [
        ['g1f3',12],['b1c3',10],['e2e3',6]
    ],
    'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b': [
        ['g8f6',12],['d5c4',7],['e7e6',7]
    ],
    // Slav 3.Nf3 Nf6 4.Nc3
    'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b': [
        ['d5c4',10],['e7e6',9],['a7a6',7],['g7g6',6]
    ],
    // Semi-Slav
    'rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w': [
        ['e2e3',10],['c1g5',9],['d1c2',7]
    ],

    // ── QUEEN'S GAMBIT ACCEPTED ───────────────────────────────────────────────
    'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w': [
        ['e2e4',10],['g1f3',9],['e2e3',7]
    ],

    // ── KING'S INDIAN DEFENSE ─────────────────────────────────────────────────
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w': [
        ['c2c4',12],['g1f3',9],['c1f4',5],['e2e3',4]
    ],
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b': [
        ['g7g6',12],['e7e6',10],['c7c5',8],['d7d5',7],['b7b6',5]
    ],
    // KID: Nf6 g6 Bg7
    'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w': [
        ['e2e4',12],['g1f3',9],['c1f4',7]
    ],
    // KID main line: e4 d6 Nf3 O-O
    'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w': [
        ['g1f3',12],['f2f3',8],['c1e3',7]
    ],
    'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R w': [
        ['f1e2',12],['c1e3',9],['h2h3',7]
    ],
    // KID Classical: Be2 O-O O-O e5
    'rnbq1rk1/ppp2pbp/3p1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 w': [
        ['d4d5',10],['c1e3',9],['d1d2',8]
    ],

    // ── NIMZO-INDIAN DEFENSE ─────────────────────────────────────────────────
    'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b': [
        ['f8b4',12],['d7d5',9],['b7b6',6],['c7c5',5]
    ],
    // Nimzo: 4.e3
    'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N1P3/PP3PPP/R1BQKBNR b': [
        ['e8g8',10],['c7c5',9],['d7d5',8],['b7b6',7]
    ],
    // Nimzo: 4.Qc2
    'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PPQ1PPPP/R1B1KBNR b': [
        ['e8g8',10],['c7c5',9],['d7d5',8],['b4c3',7]
    ],
    // Nimzo: 4.a3 (Saemisch)
    'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/P1N5/1P2PPPP/R1BQKBNR b': [
        ['f8b4',12],['b4a5',9]
    ],

    // ── QUEEN'S INDIAN DEFENSE ────────────────────────────────────────────────
    'rnbqkb1r/p1pppppp/1p3n2/8/2PP4/8/PP2PPPP/RNBQKBNR w': [
        ['b1c3',10],['g1f3',9],['e2e3',7],['g2g3',7]
    ],
    'rnbqkb1r/p1pppppp/1p3n2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b': [
        ['c8b7',12],['e7e6',9],['g7g6',7]
    ],
    // QID fianchetto
    'rn1qkb1r/pbpppppp/1p3n2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w': [
        ['g2g3',10],['e2e3',9],['b1c3',8]
    ],

    // ── CATALAN OPENING ──────────────────────────────────────────────────────
    'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w': [
        ['f1g2',12],['g1f3',10]
    ],
    'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PPBP/RNBQK1NR b': [
        ['f8e7',10],['d5c4',9],['c7c6',7],['b7b6',6]
    ],

    // ── ENGLISH OPENING (1.c4) ────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b': [
        ['e7e5',12],['c7c5',9],['g8f6',8],['e7e6',6],['g7g6',5],['d7d5',5]
    ],
    // 1.c4 e5
    'rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w': [
        ['b1c3',12],['g1f3',9],['g2g3',7]
    ],
    // 1.c4 e5 2.Nc3 Nf6 3.g3
    'rnbqkb1r/pppp1ppp/5n2/4p3/2P5/2N3P1/PP1PPP1P/R1BQKBNR b': [
        ['d7d5',10],['f8b4',9],['b8c6',8]
    ],
    // 1.c4 Nf6 2.Nc3
    'rnbqkb1r/pppppppp/5n2/8/2P5/2N5/PP1PPPPP/R1BQKBNR b': [
        ['e7e5',10],['d7d5',9],['g7g6',8],['c7c5',7],['e7e6',6]
    ],
    // Symmetrical English 1.c4 c5
    'rnbqkbnr/pp1ppppp/8/2p5/2P5/8/PP1PPPPP/RNBQKBNR w': [
        ['b1c3',12],['g1f3',9],['g2g3',7]
    ],

    // ── RETI OPENING (1.Nf3) ─────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b': [
        ['d7d5',12],['g8f6',10],['c7c5',8],['e7e6',7],['g7g6',5],['b7b6',4]
    ],
    // 1.Nf3 d5 2.c4 (Reti)
    'rnbqkbnr/ppp1pppp/8/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R b': [
        ['d5c4',9],['e7e6',9],['d5d4',7],['g8f6',7],['c7c6',6]
    ],
    // 1.Nf3 Nf6 2.c4
    'rnbqkb1r/pppppppp/5n2/8/2P5/5N2/PP1PPPPP/RNBQKB1R b': [
        ['g7g6',10],['e7e6',9],['c7c5',8],['d7d5',7]
    ],
    // 1.Nf3 d5 2.g3 (Zukertort)
    'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b': [
        ['g8f6',10],['e7e6',9],['c7c5',8],['g7g6',7]
    ],

    // ── LONDON SYSTEM ────────────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/3P4/5N2/PPP1PPPP/RNBQKB1R b': [
        ['d7d5',12],['g8f6',10],['e7e6',7],['c7c5',6],['g7g6',5]
    ],
    'rnbqkb1r/pppppppp/5n2/8/3P1B2/5N2/PPP1PPPP/RN1QKB1R b': [
        ['e7e6',10],['d7d5',9],['c7c5',7],['g7g6',5]
    ],
    // London after ...d5 ...Nf6 ...e6
    'rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w': [
        ['e2e3',10],['b1d2',9],['c2c3',8]
    ],

    // ── KING'S INDIAN ATTACK ─────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPP1P/RNBQKB1R b': [
        ['d7d5',10],['e7e5',9],['g8f6',8],['c7c5',7]
    ],

    // ── DUTCH DEFENSE ────────────────────────────────────────────────────────
    'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w': [
        ['c2c4',10],['g2g3',8],['g1f3',7],['e2e4',6]
    ],
    'rnbqkbnr/ppppp1pp/8/5p2/2PP4/8/PP2PPPP/RNBQKBNR b': [
        ['g8f6',10],['e7e6',9],['d7d6',7]
    ],

    // ── KING'S GAMBIT ────────────────────────────────────────────────────────
    'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b': [
        ['e5f4',12],['d7d5',8],['f8c5',5]
    ],
    // KGA accepted: 2...exf4 3.Nf3
    'rnbqkbnr/pppp1ppp/8/8/4Pp2/5N2/PPPP2PP/RNBQKB1R b': [
        ['g7g5',9],['d7d5',8],['g8f6',7],['f8e7',5]
    ],
    // KGD 2...Bc5
    'rnbqk1nr/pppp1ppp/8/2b1p3/4PP2/8/PPPP2PP/RNBQKBNR w': [
        ['g1f3',10],['f4e5',8]
    ],

    // ── BIRD'S OPENING ───────────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b': [
        ['d7d5',10],['e7e5',9],['g8f6',8],['c7c5',7]
    ],

    // ── POLISH / SOKOLSKY ────────────────────────────────────────────────────
    'rnbqkbnr/pppppppp/8/8/1P6/8/P1PPPPPP/RNBQKBNR b': [
        ['e7e5',10],['d7d5',9],['g8f6',8],['c7c5',7]
    ],

    // ════════════════════════════════════════════════════════════════════════
    //  COMMON MIDDLEGAME POSITIONS (move 6-12 continuations)
    // ════════════════════════════════════════════════════════════════════════

    // After castling kingside (many openings)
    // Spanish after O-O
    'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b': [
        ['e8g8',12],['d7d6',7],['b7b5',6]
    ],
    'r1bq1rk1/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w': [
        ['c2c3',10],['d2d4',8],['d2d3',7],['b1c3',6]
    ],
    // Spanish exchange
    'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w': [
        ['f1b5',10],['c6d4',8]
    ],
    'r1bqkbnr/1ppp1ppp/p7/4p3/B2nP3/5N2/PPPP1PPP/RNBQK2R w': [
        ['f3e5',10],['e1g1',9]
    ],

    // Italian: after c3 d4
    'r1bq1rk1/ppp1bppp/2np1n2/4p3/2BPP3/2P2N2/PP3PPP/RNBQ1RK1 w': [
        ['d4d5',10],['c1e3',9],['b1d2',8]
    ],

    // QGD exchange variation
    'rnbqkb1r/ppp2ppp/4pn2/3P4/3P4/2N5/PP2PPPP/R1BQKBNR b': [
        ['f8d6',10],['c7c5',9],['b8d7',8]
    ],

    // Common Sicilian middlegame after castle
    'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPP3PP/R2QKB1R w': [
        ['d1d2',10],['f1c4',9],['e1g1',12]
    ],
};


// ── LOOKUP OPENING BOOK ───────────────────────────────────────────────────────
// Takes a chess.js game object, returns a UCI move string or null.
// Uses the board position (first 2 FEN fields) as key, randomly weighted selection.
function lookupBook(game) {
    try {
        // ── CRITICAL: Never use book/principles when there is an immediate tactic ──
        // Tactics = checkmate in 1, free capture (undefended piece), or being in check
        // If any of these exist, return null so the engine calculates instead.
        const legalMoves = game.moves({ verbose: true });
        if (!legalMoves.length) return null;

        // 1. If in check — engine must calculate, not follow book
        if (game.in_check && game.in_check()) return null;

        // 2. If there is a checkmate in 1 — engine finds it, not book
        for (const m of legalMoves) {
            if (m.san && m.san.includes('#')) return null;
        }

        // 3. If there is a free capture (piece we can take for free or winning exchange)
        for (const m of legalMoves) {
            if (!m.captured) continue;
            const vic = (typeof PIECE_VALUES !== 'undefined' ? PIECE_VALUES[m.captured] : {p:100,n:320,b:330,r:500,q:900}[m.captured]) || 0;
            const agg = (typeof PIECE_VALUES !== 'undefined' ? PIECE_VALUES[m.piece]    : {p:100,n:320,b:330,r:500,q:900}[m.piece])    || 0;
            if (vic > agg) return null; // winning capture available — let engine handle
        }

        // ── Now safe to use book ──────────────────────────────────────────────
        const fenParts = game.fen().split(' ');
        const key = fenParts[0] + ' ' + fenParts[1];
        const entry = OPENING_BOOK[key];
        if (entry && entry.length) {
            // Exact match — weighted random selection
            const totalWeight = entry.reduce((s, [, w]) => s + w, 0);
            let rand = Math.random() * totalWeight;
            for (const [move, weight] of entry) {
                rand -= weight;
                if (rand <= 0) return move;
            }
            return entry[0][0];
        }

        // No exact match — use principled opening play
        // But only in the first 10 full moves (not 15)
        const fullMove = parseInt(fenParts[5]) || 1;
        if (fullMove > 10) return null; // past move 10 — let engine calculate freely
        return principledOpeningMove(game);
    } catch(e) { return null; }
}

// ── PRINCIPLED OPENING FALLBACK ───────────────────────────────────────────────
// When no book match, play according to opening principles:
//   1. Control centre (e4/d4/e5/d5)
//   2. Develop knights before bishops
//   3. Castle early
//   4. Connect rooks (don't block development)
//   5. Don't move same piece twice before developing
//   6. Don't bring queen out early
function principledOpeningMove(game) {
    try {
        const board    = game.board();
        const myColor  = game.turn();
        const legal    = game.moves({ verbose: true });
        if (!legal.length) return null;

        const fen      = game.fen();
        const fenParts = fen.split(' ');
        const fullMove = parseInt(fenParts[5]) || 1;
        const halfMove = (fullMove - 1) * 2 + (fenParts[1] === 'b' ? 1 : 0);

        // Only apply up to move 15
        if (halfMove >= 30) return null;

        const backRank = myColor === 'w' ? 7 : 0;
        const pawnRank = myColor === 'w' ? 6 : 1;
        const scored   = [];

        // Count developed pieces and piece move history
        let unmovedMinors = 0;
        let movedPieces   = new Set(); // squares that have been moved to (approx)
        try {
            for (const h of game.history({ verbose: true })) {
                if (h.color === myColor) movedPieces.add(h.from);
            }
        } catch(e) {}

        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p || p.color !== myColor) continue;
            if ((p.type === 'n' || p.type === 'b') && r === backRank) unmovedMinors++;
        }

        for (const m of legal) {
            let score = 0;
            const toR  = 8 - parseInt(m.to[1]);
            const toC  = m.to.charCodeAt(0) - 97;
            const fromR= 8 - parseInt(m.from[1]);
            const fromC= m.from.charCodeAt(0) - 97;

            // ── Castle: very high priority once developed ────────────────────
            if (m.san === 'O-O' || m.san === 'O-O-O') {
                score += unmovedMinors === 0 ? 900 : 500;
            }

            // ── Centre pawn moves ─────────────────────────────────────────────
            if (m.piece === 'p') {
                const isEorD = (toC === 3 || toC === 4); // d or e file
                if (isEorD) {
                    const advance = myColor === 'w' ? (pawnRank - toR) : (toR - pawnRank);
                    if (advance === 1) score += 700; // one push centre pawn
                    if (advance === 2) score += 600; // two push centre pawn
                }
                // Avoid random pawn moves
                if (!isEorD && halfMove < 10) score -= 200;
            }

            // ── Knight development ────────────────────────────────────────────
            if (m.piece === 'n' && fromR === backRank) {
                // Knights to f3/c3 (or f6/c6) get priority
                if ((toC === 5 && toR === (myColor==='w'?5:2)) ||
                    (toC === 2 && toR === (myColor==='w'?5:2))) score += 800;
                else score += 650;
            }

            // ── Bishop development ────────────────────────────────────────────
            if (m.piece === 'b' && fromR === backRank) {
                // Only after at least one knight is out
                const knightsOut = legal.filter(l => false).length; // just check board
                let knightsDev = 0;
                for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
                    const p=board[r][c];
                    if(p&&p.color===myColor&&p.type==='n'&&r!==backRank) knightsDev++;
                }
                score += knightsDev > 0 ? 600 : 300;
            }

            // ── Don't move queen early ────────────────────────────────────────
            if (m.piece === 'q' && halfMove < 12 && !m.captured) score -= 600;

            // ── Don't move king without castling ─────────────────────────────
            if (m.piece === 'k' && m.san !== 'O-O' && m.san !== 'O-O-O') score -= 800;

            // ── Don't move same piece twice (penalise if already moved) ──────
            if (movedPieces.has(m.from) && m.piece !== 'p' && m.san !== 'O-O' && m.san !== 'O-O-O') {
                score -= 300;
            }

            // ── Captures are fine ─────────────────────────────────────────────
            if (m.captured) {
                const vic = { p:100, n:320, b:330, r:500, q:900 }[m.captured] || 0;
                const agg = { p:100, n:320, b:330, r:500, q:900 }[m.piece]    || 0;
                score += vic >= agg ? 400 + vic : -100;
            }

            if (score > 0) scored.push({ move: m.from + m.to + (m.promotion||''), score });
        }

        if (!scored.length) return null;
        scored.sort((a, b) => b.score - a.score);

        // Pick from top 3 to add variety
        const topN = scored.slice(0, Math.min(3, scored.length));
        // Weight by score
        const total = topN.reduce((s, m) => s + m.score, 0);
        let rand = Math.random() * total;
        for (const { move, score } of topN) {
            rand -= score;
            if (rand <= 0) return move;
        }
        return topN[0].move;
    } catch(e) { return null; }
}

// ── DEVELOPMENT BONUS (used inside evaluateAbsolute) ─────────────────────────
// Rewards: pieces off back rank, centre pawns moved, castled king
// Penalises: unmoved minor pieces in opening, queen out too early, blocked centre
function developmentScore(board, color) {
    let dev = 0;
    const backRank    = color === 'w' ? 7 : 0;
    const pawnRank2   = color === 'w' ? 6 : 1;   // starting pawn rank
    const pawnRank3   = color === 'w' ? 5 : 2;   // one push
    const centrePawns = [3, 4]; // d and e files

    let unmovedMinors  = 0;
    let movedMinors    = 0;
    let centrePawnMoved = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p || p.color !== color) continue;

            // Minor pieces still on back rank = undeveloped
            if ((p.type === 'n' || p.type === 'b') && r === backRank) {
                unmovedMinors++;
                dev -= 18; // strong penalty for each lagging minor
            }
            // Minor pieces developed (off back rank)
            if ((p.type === 'n' || p.type === 'b') && r !== backRank) {
                movedMinors++;
            }
            // Rooks on back rank are fine — don't penalise
            // Queen out too early (on rank 2-5 before minors developed) — handled implicitly

            // Centre pawns: reward if moved from starting square
            if (p.type === 'p' && centrePawns.includes(c)) {
                if (r !== pawnRank2) centrePawnMoved++; // pawn has moved
            }
        }
    }

    // Bonus for centre pawn advances
    dev += centrePawnMoved * 12;

    // Bonus for completing development (all 4 minors off back rank)
    if (unmovedMinors === 0) dev += 20;

    return dev;
}


// ── EXPORTS ───────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports !== undefined) {
    module.exports = {
        BOTS, PIECE_VALUES, PST,
        getPSTValue, isEndgame,
        OPENING_BOOK, lookupBook,
        developmentScore
    };
}
if (typeof window !== 'undefined') {
    window.BOTS             = BOTS;
    window.PIECE_VALUES     = PIECE_VALUES;
    window.PST              = PST;
    window.getPSTValue      = getPSTValue;
    window.isEndgame        = isEndgame;
    window.OPENING_BOOK     = OPENING_BOOK;
    window.lookupBook       = lookupBook;
    window.developmentScore = developmentScore;
    window._BotDataLoaded   = true;
    console.log('✅ bot-data.js: 183 bots + opening book loaded');
}

} catch(err) {
    console.error('🔴 FATAL in bot-data.js:', err.message, err.stack);
    if (typeof window !== 'undefined') window._BotDataLoaded = false;
}