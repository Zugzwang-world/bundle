// Layer-1 safety lexicon (HANDOVER B7 · gate, spec §10). Everything here is lower-case and
// matched on word boundaries over the lower-cased name. A hit never renders as given.

export const CONDITIONS = [
  'diabetes', 'type 2 diabetes', 'type 1 diabetes', 'prediabetes', 'hypertension', 'high blood pressure', 'low blood pressure',
  'cancer', 'breast cancer', 'lung cancer', 'prostate cancer', 'colon cancer', 'cervical cancer', 'ovarian cancer', 'oral cancer',
  'leukemia', 'leukaemia', 'lymphoma', 'melanoma', 'tumor', 'tumour', 'chemo', 'chemotherapy', 'radiotherapy', 'radiation therapy',
  'asthma', 'copd', 'bronchitis', 'pneumonia', 'tuberculosis', 'tb', 'arthritis', 'osteoarthritis', 'rheumatoid arthritis',
  'osteoporosis', 'gout', 'migraine', 'epilepsy', 'seizure', 'stroke', 'heart attack', 'heart failure', 'heart disease', 'cardiac arrest',
  'angina', 'arrhythmia', 'atrial fibrillation', 'anemia', 'anaemia', 'thyroid', 'hypothyroidism', 'hyperthyroidism',
  'pcos', 'pcod', 'endometriosis', 'fibroids', 'infertility', 'ivf', 'iui', 'miscarriage', 'stillbirth', 'ectopic pregnancy', 'abortion',
  'pregnancy loss', 'postpartum depression', 'depression', 'anxiety', 'panic disorder', 'bipolar', 'bipolar disorder', 'schizophrenia',
  'ocd', 'ptsd', 'adhd', 'autism', 'eating disorder', 'anorexia', 'bulimia', 'dementia', "alzheimer's", 'alzheimers', 'alzheimer',
  "parkinson's", 'parkinsons', 'parkinson', 'multiple sclerosis', 'hiv', 'aids', 'hepatitis', 'herpes', 'hpv', 'chlamydia',
  'gonorrhea', 'gonorrhoea', 'syphilis', 'sti', 'std', 'uti', 'kidney disease', 'kidney failure', 'dialysis', 'kidney stones',
  'gallstones', 'cirrhosis', 'fatty liver', 'ulcer', 'ulcers', "crohn's", 'crohns', 'colitis', 'ibs', 'celiac', 'coeliac', 'cataract',
  'glaucoma', 'hearing loss', 'tinnitus', 'psoriasis', 'eczema', 'shingles', 'covid', 'long covid', 'dengue', 'malaria', 'typhoid',
  'chikungunya', 'jaundice', 'addiction', 'alcoholism', 'alcohol addiction', 'drug addiction', 'gambling addiction', 'substance abuse',
  'overdose', 'relapse', 'knee replacement', 'hip replacement', 'bypass surgery', 'angioplasty', 'biopsy', 'mastectomy', 'hysterectomy',
  'obesity', 'erectile dysfunction', 'incontinence', 'sleep apnea', 'sleep apnoea', 'self-harm', 'self harm', 'suicide', 'suicidal',
  'diagnosis', 'prognosis', 'menopause', 'prostate', 'hernia', 'appendicitis', 'sciatica', 'slipped disc', 'spondylitis', 'vertigo',
  'burnout', 'nervous breakdown', 'trauma', 'grief counselling', 'grief counseling',
];

export const MEDICATIONS = [
  'metformin', 'insulin', 'glimepiride', 'sitagliptin', 'atorvastatin', 'rosuvastatin', 'statin', 'statins', 'amlodipine',
  'telmisartan', 'losartan', 'metoprolol', 'atenolol', 'aspirin', 'clopidogrel', 'warfarin', 'levothyroxine', 'thyronorm',
  'sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'venlafaxine', 'duloxetine', 'bupropion', 'alprazolam', 'clonazepam',
  'lorazepam', 'diazepam', 'zolpidem', 'lithium', 'quetiapine', 'olanzapine', 'risperidone', 'methylphenidate', 'ritalin', 'adderall',
  'prozac', 'zoloft', 'lexapro', 'xanax', 'valium', 'ozempic', 'semaglutide', 'wegovy', 'mounjaro', 'viagra', 'sildenafil', 'tadalafil',
  'prednisone', 'prednisolone', 'omeprazole', 'pantoprazole', 'ibuprofen', 'paracetamol', 'dolo 650', 'tramadol', 'morphine', 'oxycodone',
  'gabapentin', 'pregabalin', 'amoxicillin', 'azithromycin', 'augmentin', 'tamoxifen', 'letrozole', 'clomid', 'clomiphene',
  'antidepressant', 'antidepressants', 'antipsychotic', 'antipsychotics', 'painkiller', 'painkillers', 'sleeping pills', 'benzodiazepine',
  'ecosprin', 'telma', 'glycomet', 'janumet',
];

export const SYMPTOMS = [
  'chest pain', 'back pain', 'knee pain', 'joint pain', 'stomach pain', 'abdominal pain', 'pelvic pain', 'headache', 'headaches',
  'dizziness', 'fainting', 'nausea', 'vomiting', 'diarrhea', 'diarrhoea', 'constipation', 'bloating', 'fever', 'chills', 'cough',
  'shortness of breath', 'breathlessness', 'wheezing', 'palpitations', 'fatigue', 'insomnia', 'night sweats', 'weight loss', 'weight gain',
  'hair loss', 'rash', 'swelling', 'numbness', 'tingling', 'blurred vision', 'memory loss', 'mood swings', 'panic attack', 'anxiety attack',
  'tremor', 'tremors', 'bleeding', 'spotting', 'lump', 'lumps', 'cramps', 'heartburn', 'acid reflux', 'indigestion', 'hot flashes',
  'hot flushes', 'sore throat', 'ear pain', 'tooth pain', 'toothache', 'burning sensation', 'low mood', 'blood sugar', 'blood pressure',
  'cholesterol', 'side effects', 'symptoms', 'flare-up', 'flare up', 'snoring', 'itching', 'nosebleed', 'nosebleeds', 'swollen',
];

// Intimate details (spec §10): a hit downgrades to the domain word given here.
export const INTIMATE_DOMAIN = {
  divorce: 'Legal', 'divorce lawyer': 'Legal', alimony: 'Legal', custody: 'Legal', 'child custody': 'Legal', 'domestic violence': 'Legal',
  harassment: 'Legal', 'restraining order': 'Legal', lawsuit: 'Legal', arrest: 'Legal', arrested: 'Legal', bail: 'Legal', eviction: 'Legal',
  'police complaint': 'Legal', 'court case': 'Legal', 'legal notice': 'Legal',
  'debt collector': 'Finances', 'debt collection': 'Finances', 'loan default': 'Finances', 'defaulted loan': 'Finances', bankruptcy: 'Finances',
  bankrupt: 'Finances', insolvency: 'Finances', foreclosure: 'Finances', repossession: 'Finances', 'credit card debt': 'Finances',
  'unpaid emi': 'Finances', 'emi default': 'Finances', 'missed emi': 'Finances', garnishment: 'Finances', 'job loss': 'Finances',
  'lost my job': 'Finances', layoff: 'Finances', 'laid off': 'Finances', 'loan shark': 'Finances', 'overdue loan': 'Finances',
  rehab: 'Health', therapy: 'Health', therapist: 'Health', psychiatrist: 'Health', counselling: 'Health', counseling: 'Health',
  'mental breakdown': 'Health', 'weight loss journey': 'Health',
  affair: 'Personal', cheating: 'Personal', infidelity: 'Personal', abuse: 'Personal', abusive: 'Personal', breakup: 'Personal',
  'break up': 'Personal', grief: 'Personal', 'estranged': 'Personal', 'coming out': 'Personal', 'secret': 'Personal',
};
export const INTIMATE = Object.keys(INTIMATE_DOMAIN);

// Marathi / Hindi condition words — Devanagari and common Latin transliterations.
// Only words whose meaning is unambiguous on their own are listed.
export const TRANSLITERATED = {
  // Devanagari
  'मधुमेह': 'condition', 'कर्करोग': 'condition', 'कॅन्सर': 'condition', 'कैंसर': 'condition', 'कर्क रोग': 'condition',
  'क्षयरोग': 'condition', 'क्षय': 'condition', 'दमा': 'condition', 'हृदयविकार': 'condition', 'हृदयरोग': 'condition',
  'रक्तदाब': 'condition', 'उच्च रक्तदाब': 'condition', 'मायग्रेन': 'condition', 'नैराश्य': 'condition', 'अवसाद': 'condition',
  'व्यसन': 'condition', 'गर्भपात': 'condition', 'कावीळ': 'condition', 'पीलिया': 'condition', 'मलेरिया': 'condition',
  'डेंग्यू': 'condition', 'डेंगू': 'condition', 'टायफॉइड': 'condition', 'थायरॉईड': 'condition', 'थायराइड': 'condition',
  'अपस्मार': 'condition', 'मिरगी': 'condition', 'पक्षाघात': 'condition', 'लकवा': 'condition', 'आत्महत्या': 'condition',
  'बुखार': 'symptom', 'खोकला': 'symptom', 'खांसी': 'symptom', 'उलटी': 'symptom', 'उल्टी': 'symptom', 'चक्कर': 'symptom',
  'सूज': 'symptom', 'रक्तस्राव': 'symptom', 'छातीत दुखणे': 'symptom', 'सीने में दर्द': 'symptom', 'डोकेदुखी': 'symptom',
  'सिरदर्द': 'symptom', 'कमरदर्द': 'symptom', 'पाठदुखी': 'symptom',
  'घटस्फोट': 'intimate', 'तलाक': 'intimate', 'दिवाळखोरी': 'intimate', 'दिवालिया': 'intimate', 'कर्जवसुली': 'intimate',
  // Latin transliterations
  'madhumeh': 'condition', 'kansar': 'condition', 'kshay': 'condition', 'kshayrog': 'condition', 'hriday rog': 'condition',
  'raktdab': 'condition', 'nairashya': 'condition', 'avsad': 'condition', 'vyasan': 'condition', 'garbhpat': 'condition',
  'kavil': 'condition', 'piliya': 'condition', 'lakva': 'condition', 'mirgi': 'condition', 'atmahatya': 'condition',
  'bukhar': 'symptom', 'khokla': 'symptom', 'khansi': 'symptom', 'ulti': 'symptom', 'chakkar': 'symptom', 'dokedukhi': 'symptom',
  'sirdard': 'symptom', 'kamardard': 'symptom', 'pathdukhi': 'symptom',
  'ghatasphot': 'intimate', 'talaq': 'intimate', 'divalkhori': 'intimate', 'diwaliya': 'intimate', 'karjvasuli': 'intimate',
};
const TRANSLITERATED_DOMAIN = { 'घटस्फोट': 'Legal', 'तलाक': 'Legal', 'ghatasphot': 'Legal', 'talaq': 'Legal' };

// Places, brands, products and fixture-title phrases: never person names.
export const PLACE_BRAND_ALLOWLIST = [
  'Dadar Station', 'Dadar', 'Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Lonavala', 'Lonavala Trip', 'Delhi', 'New Delhi', 'Bangalore',
  'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Goa', 'Nashik', 'Nagpur', 'Bandra', 'Andheri', 'Borivali', 'Matunga', 'Shivaji Park',
  'Marine Drive', 'Western Railway', 'Central Railway', 'Indian Railways', 'Post Office', 'Reserve Bank', 'State Bank', 'HDFC Bank',
  'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Bajaj Finance', 'Life Insurance Corporation', 'Income Tax', 'Aadhaar Card', 'PAN Card',
  'Google Docs', 'Google Sheets', 'Google Maps', 'Google Photos', 'Microsoft Word', 'Apple Watch', 'Amazon Prime', 'Tata Motors',
  'Tata Steel', 'Zerodha Coin', 'Zerodha', 'Groww', 'Paytm', 'PhonePe', 'WhatsApp', 'YouTube', 'Netflix', 'Spotify', 'Instagram',
  'Duolingo', 'Duolingo Spanish', 'Senior Citizen', 'Senior Citizen Savings', 'Tax Saver', 'Tax Saver FD', 'Mutual Funds',
  'Mutual Fund', 'Retirement Planning', 'Apartment Hunt', 'Spanish Practice', 'Financial Adviser', 'Pension Withdrawal',
  'Savings Scheme', 'Fixed Income', 'Bank Letter', 'Carpet Area', 'Built-up Area', 'Broker Fees', 'Stamp Duty', 'Society Transfer',
  'Ser Vs Estar', 'Past Tense', 'Por Vs Para', 'Common False Friends', 'False Friends', 'Double R', 'Video Call', 'Birthday Message',
  'Masala Oats', 'Hearing Aid', 'Balcony Plant', 'Weekend Trip', 'Morning Walks', 'Knee Exercises', 'October Reading',
  'Reading Shortlist', 'Discussion Questions', 'Cover Letter', 'Kitchen Tap', 'Gift Ideas', 'Annuity Quotes', 'Booking A Taxi',
  'Nominee Vs Heir', 'Book Club', 'Bookclub Notes', 'Defined Benefit', 'Defined Contribution',
];

// ── Person-name heuristics ──────────────────────────────────────────────────

const FIRST_NAMES = new Set(`
aarav aditi aditya ajay akash akshay amar amit amita amol anand anil anita anjali ankit ankita anu anupam anuradha arjun arun aruna asha ashok ashwin
atul avinash bhavana bhavesh chetan chitra deepa deepak deepika devendra dhruv dinesh dipti divya ganesh gauri gautam geeta girish gopal govind
harish harsh hema hemant indira ishaan jayant jaya jyoti kabir kajal kalpana kamal kamala karan kavita ketan kiran kishore krishna kunal lakshmi
lata leela mahesh madhav madhuri mala mangesh manish manisha manoj meena meera meenakshi mihir milind mohan mohit mrunal mukesh nandini
naresh navin neha neelam nikhil nilesh nisha nitin nitya padma pallavi pankaj parag parth pooja prakash pramod pranav prasad pratik pratiksha
pravin preeti priya priyanka rahul raj raja rajan rajesh rajiv rajni rakesh ram ramesh rani ranjan ranjana rashmi ravi rekha renuka riya rohan
rohit rupali sachin sagar sai sakshi sameer samir sandeep sandhya sangeeta sanjay sanjana santosh sarika sarita saurabh seema shalini
shankar sharad shashi sheela shilpa shirish shiv shivani shobha shreya shruti shubham siddharth smita sneha sonal sonali sonia sudha sudhir
sujata sumit sunil sunita suresh sushma swati tanvi tara tejas tushar uday uma umesh urmila usha vaibhav vandana varsha varun vasant veena
vidya vijay vijaya vikas vikram vimal vinay vinod vishal vivek yash yogesh yogita zara
aaron abigail adam alan albert alex alexander alice amanda amy andrew andrea angela ann anna anne anthony arthur ashley barbara benjamin
beth betty brandon brian bruce carl carol caroline catherine charles charlotte chloe chris christine christopher claire daniel david deborah
dennis diana donald donna dorothy douglas edward elizabeth emily emma eric ethan eugene evelyn frank gary george gerald gregory hannah
harold harry heather helen henry jack jacob james jane janet jason jeffrey jennifer jeremy jessica joan joe john jonathan joseph joshua
joyce judith julia julie karen katherine kathleen kevin kimberly laura lauren lawrence linda lisa louis lucy margaret maria marie marilyn
martha mary matthew megan melissa michael michelle nancy natalie nathan nicholas nicole noah olivia pamela patricia patrick paul peter
philip rachel ralph raymond rebecca richard robert roger ronald rose ruth ryan samantha samuel sandra sara sarah scott sean sharon
shirley sophia stephanie stephen steven susan teresa theresa thomas timothy tyler victoria vincent virginia walter wayne william zachary
`.split(/\s+/).filter(Boolean));

const SURNAMES = new Set(`
sharma patel deshpande kulkarni joshi iyer nair mehta shah gupta singh kumar reddy rao khan verma chopra malhotra kapoor bhatt desai jain
agarwal agrawal banerjee chatterjee mukherjee das bose sen ghosh biswas roy dutta pillai menon naik patil jadhav shinde pawar gaikwad sawant
kadam bhosale chavan thakur mishra pandey tiwari dubey yadav saxena srivastava bhatia sethi arora khanna ahuja anand fernandes d'souza dsouza
pinto sawardekar phadke gokhale kelkar apte sathe karnik tendulkar gavaskar mane salunkhe wagh raut lokhande shetty hegde kamath bhandari
smith johnson williams brown jones miller davis wilson taylor anderson thomas moore martin jackson thompson harris clark lewis walker hall
allen wright scott baker adams nelson campbell mitchell roberts carter phillips evans turner parker collins edwards stewart morris murphy
rogers morgan cooper reed bailey kelly howard richardson watson brooks bennett hughes sanders myers ross foster powell jenkins perry russell
sullivan fisher hamilton graham wallace cole jordan owens reynolds hicks fletcher o'brien obrien mcdonald macdonald
`.split(/\s+/).filter(Boolean));

// Words that make a capitalised pair read as a phrase rather than a person.
const DOMAIN_WORDS = new Set(`
planning practice hunt hunting recipes recipe cooking notes trips trip travel plants plant garden gardening setup paperwork search ideas
exercises exercise workout drill drills list basics rules rates budget budgeting tax taxes pension savings saving scheme flat flats apartment
housing rent rental spanish marathi hindi english french german italian japanese grammar vocabulary lessons learning language languages
finance finances health legal law money insurance investing investments investment fund funds retirement reading books book club music
photos photography fitness walking yoga diet nutrition home house kitchen repairs repair writing letters letter email emails resume cv job jobs
career work study studies exam exams school college university wedding family kids parenting pets pet dog cat car bike phone laptop
computer software app apps shopping gifts gift festival diwali holiday holidays vacation weekend morning evening daily weekly monthly
questions answers tips guide help advice quotes quote station market society registration broker area duty adviser advisor withdrawal income
benefit contribution annuities annuity heir nominee taxi food dialogue pharmacy numbers days months dates greetings tense friends oats aid
hearing message birthday feeling place word deductible balcony photo knee walks tap cover cinema film films movies movie series tv news
sports cricket football chess games game puzzle puzzles crossword hobby hobbies craft crafts knitting sewing painting drawing art history
science maths math physics chemistry biology poetry poems stories story novel novels essay essays blog podcast podcasts radio
bank banking account accounts loan loans emi card cards credit debit cheque deposit deposits fd scss epf nps ppf nomination will wills
estate property flat lease agreement contract documents document forms form application visa passport ticket tickets booking bookings
flight flights train trains bus hotel hotels temple temples church trek trekking hike hiking beach beaches monsoon summer winter
groceries grocery cleaning laundry plumbing electric electrician painter carpenter furniture appliances fridge washing machine
volunteering community neighbourhood neighborhood society meetings meeting minutes agenda festival festivals prayers rituals
grandkids grandchildren grandson granddaughter son daughter mother father parents wife husband brother sister uncle aunt cousin
tools tool tech technology gadgets gadget settings setting password passwords wifi internet printer camera
the and of for with vs my our a an in on at to from about new old first second best big small
`.split(/\s+/).filter(Boolean));

const allowPhrases = new Set(PLACE_BRAND_ALLOWLIST.map((p) => p.toLowerCase()));
const allowWords = new Set(PLACE_BRAND_ALLOWLIST.flatMap((p) => p.toLowerCase().split(/\s+/)));

const stripPossessive = (w) => w.replace(/(['’]s|['’])$/i, '').toLowerCase();
const isCapitalised = (w) => /^\p{Lu}[\p{Ll}'’.-]*$/u.test(w) && !/^\p{Lu}+$/u.test(w) && /\p{Ll}/u.test(w);

export function looksLikePersonName(name) {
  if (typeof name !== 'string' || !name.trim()) return false;
  const tokens = name.trim().split(/\s+/);
  // Collect runs of consecutive Capitalised words (acronyms such as FD/SCSS break a run).
  const runs = [];
  let cur = [];
  for (const t of tokens) {
    const clean = t.replace(/[,.;:!?()"]+$/g, '').replace(/^[("]+/g, '');
    if (isCapitalised(clean)) cur.push(clean);
    else { if (cur.length) runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);

  for (const run of runs) {
    for (let len = Math.min(3, run.length); len >= 2; len--) {
      for (let i = 0; i + len <= run.length; i++) {
        const words = run.slice(i, i + len).map(stripPossessive);
        const phrase = words.join(' ');
        if (allowPhrases.has(phrase)) continue;
        // High confidence: a known first name leads the run ("Ravi Sharma", "Meera's Knee").
        if (FIRST_NAMES.has(words[0])) return true;
        if (words.some((w) => allowWords.has(w))) continue;
        const knownLast = SURNAMES.has(words[words.length - 1]);
        const anyDomain = words.some((w) => DOMAIN_WORDS.has(w));
        // Medium: known surname closes the run and nothing in it reads as a topic ("Kavitha Sharma").
        if (knownLast && !anyDomain) return true;
        // Low: the whole name is exactly two unknown Capitalised words of letters only ("Kavitha Nadar").
        if (len === 2 && run.length === 2 && tokens.length === 2 && !anyDomain && words.every((w) => /^[a-z]{3,}$/.test(w))) return true;
      }
    }
  }
  return false;
}

// ── Lexicon matching ────────────────────────────────────────────────────────

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Unicode-aware word boundary (JS \b is ASCII-only, so Devanagari needs lookarounds); allows simple plurals.
const termRe = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(term)}(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu');

const CATEGORIES = [
  ['condition', CONDITIONS],
  ['medication', MEDICATIONS],
  ['symptom', SYMPTOMS],
  ['intimate', INTIMATE],
];
const COMPILED = CATEGORIES.map(([category, terms]) => [category, terms.map((t) => [t, termRe(t)])]);
const COMPILED_TRANSLIT = Object.entries(TRANSLITERATED).map(([t, category]) => [t, category, termRe(t)]);

// lexiconHit(name) → { hit, term, category, domain }
// category: 'condition' | 'medication' | 'symptom' | 'intimate' | null.
// domain: the word an intimate term should downgrade to (Legal / Finances / Personal / Health), else null.
export function lexiconHit(name) {
  if (typeof name !== 'string' || !name.trim()) return { hit: false, term: null, category: null, domain: null };
  const n = name.toLowerCase();
  for (const [category, terms] of COMPILED) {
    for (const [term, re] of terms) {
      if (re.test(n)) return { hit: true, term, category, domain: category === 'intimate' ? INTIMATE_DOMAIN[term] : null };
    }
  }
  for (const [term, category, re] of COMPILED_TRANSLIT) {
    if (re.test(n)) return { hit: true, term, category, domain: TRANSLITERATED_DOMAIN[term] || (category === 'intimate' ? 'Finances' : null) };
  }
  return { hit: false, term: null, category: null, domain: null };
}
