import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: '50mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Load knowledge base ──────────────────────────────────────────
let knowledge = [];
const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge.json');

function loadKnowledge() {
  try {
    knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf-8'));
    console.log(`✅ Loaded ${knowledge.length} entries from knowledge.json`);
  } catch(e) {
    console.error('❌ Could not load knowledge.json:', e.message);
    knowledge = [];
  }
}
loadKnowledge();

// ── Transliteration map — Hinglish → Hindi search ───────────────
const TRANSLIT = {
  'aadesh': ['आदेश'],
  'aakasmik': ['आकस्मिक अवकाश'],
  'aapatti': ['आपत्ति'],
  'aarop': ['आरोप'],
  'aaropatra': ['आरोप पत्र'],
  'aaroppatra': ['आरोप पत्र'],
  'aavedan': ['आवेदन'],
  'aayu': ['आयु'],
  'abhilekh': ['अभिलेख'],
  'abhivachan': ['अभिवचन'],
  'abhyavedan': ['अभ्यावेदन'],
  'absent': ['अनुपस्थित'],
  'absorption': ['समायोजन'],
  'act': ['अधिनियम', 'एक्ट'],
  'adalat': ['अदालत'],
  'additionalsecretary': ['अपर सचिव'],
  'adhikaran': ['अधिकरण'],
  'adhiniyam': ['अधिनियम'],
  'adhisuchana': ['अधिसूचना'],
  'adhoc': ['तदर्थ', 'अस्थायी'],
  'adhyay': ['अध्याय'],
  'adhyayanavkash': ['अध्ययन अवकाश'],
  'advance': ['अग्रिम'],
  'advisory': ['परामर्शी'],
  'affidavit': ['शपथपत्र'],
  'ag': ['महालेखाकार', 'AG'],
  'age': ['आयु', 'उम्र'],
  'agnishaman': ['अग्निशमन'],
  'agrim': ['अग्रिम'],
  'allahabad': ['इलाहाबाद', 'इलाहाबाद उच्च न्यायालय'],
  'allowance': ['भत्ता', 'भत्ते'],
  'amendment': ['संशोधन'],
  'anaapatti': ['अनापत्ति'],
  'anivaryasevanivritti': ['अनिवार्य सेवानिवृत्ति'],
  'antimvetan': ['अंतिम वेतन', 'अन्तिम वेतन'],
  'anubhag': ['अनुभाग'],
  'anubhagadhikari': ['अनुभाग अधिकारी'],
  'anuchhed': ['अनुच्छेद'],
  'anugraha': ['अनुग्रह', 'अनुग्रह राशि'],
  'anugrahrashi': ['अनुग्रह राशि'],
  'anukampa': ['अनुकम्पा', 'अनुकंपा'],
  'anukampaniyukti': ['अनुकम्पा नियुक्ति', 'अनुकंपा नियुक्ति'],
  'anumati': ['अनुमति'],
  'anumodan': ['अनुमोदन'],
  'anupasthit': ['अनुपस्थित'],
  'anusachiv': ['अनु सचिव'],
  'anushasan': ['अनुशासन'],
  'anveshan': ['अन्वेषण'],
  'aparsachiv': ['अपर सचिव'],
  'appeal': ['अपील'],
  'application': ['आवेदन', 'प्रार्थनापत्र'],
  'appointment': ['नियुक्ति'],
  'approval': ['अनुमोदन', 'स्वीकृति'],
  'apraadhik': ['आपराधिक'],
  'ardh': ['अर्द्ध वेतन'],
  'ardhasainik': ['अर्धसैनिक', 'अर्द्धसैनिक'],
  'argument': ['तर्क'],
  'arjitavkash': ['अर्जित अवकाश'],
  'arrear': ['एरियर', 'बकाया वेतन'],
  'arrears': ['एरियर', 'बकाया वेतन'],
  'asadharan': ['असाधारण अवकाश'],
  'ashrit': ['आश्रित'],
  'aso': ['ASO', 'सहायक अनुभाग अधिकारी'],
  'asthayi': ['अस्थायी'],
  'attendance': ['उपस्थिति'],
  'audit': ['लेखापरीक्षा', 'ऑडिट'],
  'auditpara': ['ऑडिट पैरा', 'लेखापरीक्षा पैरा'],
  'avakash': ['अवकाश'],
  'avamanana': ['अवमानना'],
  'avkash': ['अवकाश'],
  'avkashyatra': ['अवकाश यात्रा'],
  'avmanana': ['अवमानना'],
  'awas': ['आवास'],
  'baalshiksha': ['बाल शिक्षा भत्ता'],
  'bakaya': ['बकाया'],
  'bandhpatra': ['बंधपत्र'],
  'barkhast': ['बर्खास्त'],
  'barkhastagi': ['बर्खास्तगी'],
  'basic': ['बेसिक', 'मूल'],
  'basicpay': ['मूल वेतन', 'मूलवेतन'],
  'basicshiksha': ['बेसिक शिक्षा', 'प्राथमिक शिक्षा'],
  'bharti': ['भर्ती'],
  'bhartsana': ['भर्त्सना'],
  'bhatta': ['भत्ता', 'भत्ते'],
  'bhatte': ['भत्ते'],
  'bhavishyanidhi': ['भविष्य निधि'],
  'bhrashtachar': ['भ्रष्टाचार'],
  'bond': ['बंधपत्र', 'बॉन्ड'],
  'bsf': ['BSF', 'सीमा सुरक्षा बल'],
  'cadre': ['संवर्ग', 'काडर'],
  'capf': ['CAPF', 'केन्द्रीय सशस्त्र पुलिस बल'],
  'caradvance': ['वाहन अग्रिम'],
  'caseno': ['केस नंबर'],
  'casenumber': ['वाद संख्या', 'केस नंबर'],
  'casual': ['आकस्मिक', 'कैजुअल'],
  'casualleave': ['आकस्मिक अवकाश', 'CL'],
  'cat': ['केंद्रीय प्रशासनिक अधिकरण', 'CAT'],
  'cause': ['कारण', 'वजह'],
  'cca': ['CCA Rules', 'CCS (CCA)', 'अनुशासन नियमावली'],
  'cca-allowance': ['नगर प्रतिकर भत्ता', 'CCA'],
  'ccl': ['बाल देखभाल अवकाश', 'CCL'],
  'censure': ['निंदा', 'भर्त्सना'],
  'chapter': ['अध्याय'],
  'charge': ['आरोप'],
  'chargesheet': ['आरोप पत्र', 'चार्जशीट'],
  'chetavani': ['चेतावनी'],
  'chhatravas': ['छात्रावास'],
  'chhuti': ['छुट्टी'],
  'chhutti': ['छुट्टी', 'अवकाश'],
  'chikitsa': ['चिकित्सा'],
  'chikitsaavkash': ['चिकित्सा अवकाश'],
  'childcare': ['बाल देखभाल अवकाश', 'CCL'],
  'childreneducation': ['बाल शिक्षा भत्ता'],
  'circular': ['परिपत्र'],
  'cisf': ['CISF', 'केन्द्रीय औद्योगिक सुरक्षा बल'],
  'civil': ['दीवानी', 'सिविल'],
  'civilpolice': ['सिविल पुलिस', 'सामान्य पुलिस'],
  'cl': ['आकस्मिक अवकाश', 'CL', 'Casual Leave'],
  'classi': ['वर्ग-1', 'श्रेणी-1'],
  'clause': ['खण्ड', 'धारा'],
  'clerk': ['लिपिक'],
  'cnr': ['CNR', 'केस नंबर'],
  'comments': ['टिप्पणी'],
  'commutation': ['संराशीकरण', 'पेंशन संराशीकरण'],
  'commute': ['संराशीकरण'],
  'compassion': ['अनुकम्पा', 'करुणा'],
  'compassionate': ['अनुकम्पा', 'अनुकंपा'],
  'compensatory': ['प्रतिकर अवकाश'],
  'complaint': ['शिकायत'],
  'compulsoryretirement': ['अनिवार्य सेवानिवृत्ति'],
  'computeradvance': ['कंप्यूटर अग्रिम'],
  'condition': ['शर्त', 'अनुबंध'],
  'confirmation': ['स्थायीकरण', 'पुष्टि'],
  'contempt': ['अवमानना', 'न्यायालय अवमानना'],
  'contract': ['संविदा'],
  'contractual': ['संविदा', 'संविदात्मक'],
  'conveyance': ['यातायात भत्ता', 'वाहन भत्ता'],
  'corruption': ['भ्रष्टाचार'],
  'counter': ['प्रतिवादी', 'प्रतिशपथपत्र'],
  'counteraffidavit': ['प्रति-शपथपत्र', 'काउंटर एफिडेविट'],
  'court': ['न्यायालय', 'कोर्ट', 'अदालत'],
  'cpf': ['अंशदायी भविष्य निधि', 'CPF'],
  'criminal': ['फौजदारी', 'दण्डाधिकार', 'आपराधिक'],
  'crpf': ['CRPF', 'केन्द्रीय रिज़र्व पुलिस बल'],
  'csr': ['Civil Service Regulations', 'CSR', 'सिविल सेवा विनियम'],
  'da': ['महंगाई भत्ता', 'महँगाई भत्ता', 'DA', 'डी.ए.'],
  'da-allowance': ['दैनिक भत्ता'],
  'dailyallowance': ['दैनिक भत्ता'],
  'dailywage': ['दैनिक वेतन', 'दिहाड़ी'],
  'dainikbhatta': ['दैनिक भत्ता'],
  'dand': ['दण्ड', 'दंड'],
  'danda': ['दण्ड'],
  'danga': ['दंगा'],
  'dastavej': ['दस्तावेज़'],
  'date': ['दिनांक', 'तारीख'],
  'day': ['दिन', 'दिवस'],
  'dearness': ['महंगाई', 'महँगाई'],
  'deceased': ['मृतक'],
  'deevani': ['दीवानी'],
  'dehari': ['दिहाड़ी'],
  'demotion': ['पदावनति'],
  'department': ['विभाग'],
  'departmentalenquiry': ['विभागीय जाँच', 'विभागीय जांच'],
  'dependent': ['आश्रित'],
  'deputation': ['प्रतिनियुक्ति'],
  'deputysecretary': ['उप सचिव'],
  'dhara': ['धारा'],
  'dharanadhikar': ['धारणाधिकार'],
  'din': ['दिन'],
  'dinaank': ['दिनांक'],
  'direct': ['सीधी'],
  'directrecruitment': ['सीधी भर्ती'],
  'discipline': ['अनुशासन'],
  'dishanirdesh': ['दिशानिर्देश'],
  'dismissal': ['बर्खास्तगी'],
  'divas': ['दिवस'],
  'document': ['दस्तावेज़', 'अभिलेख'],
  'draft': ['प्रारूप', 'ड्राफ्ट', 'मसौदा'],
  'earnedleave': ['अर्जित अवकाश', 'EL'],
  'el': ['अर्जित अवकाश', 'EL', 'Earned Leave'],
  'eligibility': ['पात्रता'],
  'eligible': ['पात्र'],
  'encashment': ['नकदीकरण', 'अवकाश नकदीकरण'],
  'enquiry': ['जाँच', 'जांच', 'जाच'],
  'epf': ['कर्मचारी भविष्य निधि', 'EPF'],
  'evidence': ['साक्ष्य', 'सबूत'],
  'exgratia': ['अनुग्रह', 'अनुग्रह राशि', 'ex-gratia'],
  'exgratiaratio': ['अनुग्रह राशि'],
  'extraordinary': ['असाधारण अवकाश'],
  'faisla': ['फैसला'],
  'fake': ['फर्जी', 'जाली'],
  'family': ['परिवार'],
  'familypension': ['पारिवारिक पेंशन', 'पारिवारिक पेन्शन'],
  'farji': ['फर्जी', 'जाली'],
  'faujdari': ['फौजदारी'],
  'festivaladvance': ['पर्व अग्रिम', 'त्यौहार अग्रिम'],
  'fhb': ['वित्तीय हस्त-पुस्तिका', 'FHB', 'फाइनेंशियल हैंडबुक'],
  'file': ['फाइल', 'पत्रावली'],
  'filenum': ['फाइल संख्या'],
  'filenumber': ['फाइल संख्या', 'पत्रांक'],
  'finalpay': ['अंतिम वेतन'],
  'finance': ['वित्त विभाग', 'वित्त'],
  'financialyear': ['वित्तीय वर्ष'],
  'finantialhandbook': ['वित्तीय हस्त-पुस्तिका', 'FHB'],
  'fine': ['जुर्माना'],
  'firebrigade': ['अग्निशमन', 'फायर ब्रिगेड'],
  'foreignservice': ['विदेश सेवा', 'अन्य विभाग सेवा'],
  'forged': ['जाली', 'फर्जी'],
  'fy': ['वित्तीय वर्ष', 'FY'],
  'gawah': ['गवाह'],
  'gazette': ['राजपत्र', 'गजट'],
  'gazetted': ['राजपत्रित'],
  'go': ['शासनादेश', 'GO', 'जी.ओ.', 'सरकारी आदेश'],
  'gpf': ['सामान्य भविष्य निधि', 'GPF', 'जी.पी.एफ.'],
  'gpfadvance': ['GPF अग्रिम', 'भविष्य निधि अग्रिम'],
  'gratuiti': ['उपदान', 'ग्रेच्युटी'],
  'gratuity': ['उपदान', 'ग्रेच्युटी', 'ग्रैच्युटी'],
  'grih': ['गृह विभाग', 'गृह'],
  'guideline': ['दिशानिर्देश', 'मार्गदर्शिका'],
  'gyapan': ['ज्ञापन'],
  'halfpayleave': ['अर्द्ध वेतन अवकाश', 'HPL'],
  'handbook': ['हस्त-पुस्तिका'],
  'hastpustika': ['हस्त-पुस्तिका'],
  'hba': ['मकान निर्माण अग्रिम', 'HBA'],
  'health': ['स्वास्थ्य विभाग', 'स्वास्थ्य'],
  'highcourt': ['उच्च न्यायालय'],
  'home': ['गृह विभाग', 'गृह'],
  'homeguard': ['होम गार्ड'],
  'honorarium': ['मानदेय'],
  'hostel': ['छात्रावास भत्ता'],
  'housebuilding': ['मकान निर्माण अग्रिम', 'HBA'],
  'housing': ['आवास विभाग', 'आवास'],
  'hpl': ['अर्द्ध वेतन अवकाश', 'HPL'],
  'hra': ['मकान किराया भत्ता', 'HRA', 'एच.आर.ए.'],
  'increment': ['वेतनवृद्धि', 'वेतन वृद्धि'],
  'incrementstoppage': ['वेतनवृद्धि रोक'],
  'injunction': ['व्यादेश', 'निषेधाज्ञा'],
  'inquiry': ['जाँच', 'जांच'],
  'inspection': ['निरीक्षण'],
  'investigation': ['अन्वेषण', 'जाँच'],
  'itbp': ['ITBP', 'भारत-तिब्बत सीमा पुलिस'],
  'jaach': ['जाँच', 'जांच'],
  'jaanch': ['जाँच', 'जांच'],
  'janhit': ['जनहित'],
  'janhityachika': ['जनहित याचिका'],
  'jawab': ['जवाब'],
  'jobchange': ['पदबदलाव'],
  'jointsecretary': ['संयुक्त सचिव'],
  'judgement': ['निर्णय'],
  'judgment': ['निर्णय', 'judgement'],
  'jurmana': ['जुर्माना'],
  'jyeshthata': ['ज्येष्ठता', 'वरिष्ठता'],
  'kaaryavidhi': ['कार्यविधि'],
  'kadachar': ['कदाचार'],
  'kanoon': ['कानून'],
  'karmik': ['कार्मिक विभाग', 'कार्मिक'],
  'khand': ['खण्ड'],
  'law': ['विधि', 'कानून'],
  'leave': ['अवकाश', 'छुट्टी'],
  'leavetravel': ['अवकाश यात्रा रियायत', 'LTC'],
  'lekhaparaiksha': ['लेखापरीक्षा'],
  'lekhapariksha': ['लेखापरीक्षा'],
  'lien': ['धारणाधिकार', 'लियन'],
  'likhitkathan': ['लिखित कथन'],
  'limit': ['सीमा'],
  'lipik': ['लिपिक'],
  'loknirman': ['लोक निर्माण'],
  'ltc': ['अवकाश यात्रा रियायत', 'LTC'],
  'lucknow': ['लखनऊ'],
  'lucknowbench': ['लखनऊ खण्डपीठ', 'लखनऊ बेंच'],
  'lwp': ['बिना वेतन अवकाश', 'LWP'],
  'maah': ['माह'],
  'madhyamik': ['माध्यमिक शिक्षा'],
  'mahalekhakar': ['महालेखाकार'],
  'mahina': ['महीना'],
  'majorpenalty': ['गुरुतर दण्ड', 'गुरुतर दंड'],
  'makankirayabhatta': ['मकान किराया भत्ता'],
  'mandey': ['मानदेय'],
  'manjuri': ['मंजूरी', 'स्वीकृति'],
  'manual': ['मैनुअल', 'पुस्तिका'],
  'martyr': ['शहीद'],
  'masauda': ['मसौदा'],
  'maternity': ['प्रसूति अवकाश', 'मातृत्व अवकाश'],
  'matritva': ['मातृत्व अवकाश'],
  'medical': ['चिकित्सा विभाग', 'चिकित्सा'],
  'medicalleave': ['चिकित्सा अवकाश', 'ML'],
  'mehngaibhatta': ['महंगाई भत्ता', 'महँगाई भत्ता'],
  'memo': ['ज्ञापन', 'मेमो'],
  'memorandum': ['ज्ञापन', 'मेमो'],
  'minorpenalty': ['लघु दण्ड', 'लघु दंड'],
  'misal': ['मिसाल'],
  'misconduct': ['कदाचार'],
  'ml': ['चिकित्सा अवकाश', 'ML', 'Medical Leave'],
  'modification': ['संशोधन', 'परिवर्तन'],
  'modify': ['संशोधन', 'परिवर्तन'],
  'month': ['माह', 'महीना'],
  'moolvetan': ['मूल वेतन', 'मूलवेतन'],
  'mritak': ['मृतक'],
  'nagarvikas': ['नगर विकास'],
  'nakdikaran': ['नकदीकरण'],
  'newpension': ['नई पेंशन योजना', 'NPS'],
  'nextofkin': ['NOK', 'अगला निकटतम संबंधी'],
  'nilamban': ['निलंबन', 'निलम्बन'],
  'nilambit': ['निलंबित'],
  'ninda': ['निंदा'],
  'nirikshan': ['निरीक्षण'],
  'nirnay': ['निर्णय'],
  'nishedhajna': ['निषेधाज्ञा'],
  'niyam': ['नियम', 'नियमावली'],
  'niyamavali': ['नियमावली'],
  'niyamitkaran': ['नियमितीकरण'],
  'niyojan': ['नियोजन'],
  'niyukti': ['नियुक्ति'],
  'noc': ['अनापत्ति प्रमाण पत्र', 'NOC'],
  'nok': ['NOK', 'अगला निकटतम संबंधी'],
  'nongazetted': ['अराजपत्रित'],
  'nonpracticing': ['गैर-व्यवसाय भत्ता', 'NPA'],
  'note': ['टिप्पणी', 'नोट'],
  'notification': ['अधिसूचना'],
  'noting': ['टिप्पण', 'टिप्पणी'],
  'npa': ['गैर-व्यवसाय भत्ता', 'NPA'],
  'nps': ['नई पेंशन योजना', 'NPS', 'राष्ट्रीय पेंशन प्रणाली'],
  'nyayalaya': ['न्यायालय'],
  'objection': ['आपत्ति'],
  'oldpension': ['पुरानी पेंशन योजना', 'OPS'],
  'ops': ['पुरानी पेंशन योजना', 'OPS', 'OPS scheme'],
  'order': ['आदेश'],
  'pac': ['PAC', 'प्रादेशिक सशस्त्र पुलिस'],
  'padavnati': ['पदावनति'],
  'padchyuti': ['पदच्युति'],
  'padonnati': ['पदोन्नति'],
  'pagar': ['पगार', 'वेतन'],
  'panchayat': ['पंचायती राज'],
  'panchayatiraj': ['पंचायती राज'],
  'pansion': ['पेंशन', 'पेन्शन'],
  'paragraph': ['प्रस्तर'],
  'paramarshi': ['परामर्शी विभाग'],
  'paramilitary': ['अर्धसैनिक', 'अर्द्धसैनिक'],
  'parawise': ['पारवार', 'पैरावाइज़', 'पैराग्राफवार'],
  'paripatra': ['परिपत्र'],
  'paripenshan': ['पारिवारिक पेंशन'],
  'paripension': ['पारिवारिक पेंशन'],
  'parivahanbhatta': ['परिवहन भत्ता'],
  'parivar': ['परिवार'],
  'pariveeksha': ['परिवीक्षा'],
  'parivikshaa': ['परिवीक्षा'],
  'parmarshi': ['परामर्शी'],
  'paternity': ['पितृत्व अवकाश'],
  'patra': ['पात्र'],
  'patrank': ['पत्रांक'],
  'patrata': ['पात्रता'],
  'patravali': ['पत्रावली'],
  'pay': ['वेतन'],
  'paycommission': ['वेतन आयोग'],
  'paycommittee': ['वेतन समिति'],
  'paymatrix': ['वेतन मैट्रिक्स', 'वेतनमैट्रिक्स'],
  'payscale': ['वेतनमान'],
  'penalty': ['दण्ड', 'दंड', 'जुर्माना'],
  'penshan': ['पेंशन', 'पेन्शन'],
  'pension': ['पेंशन', 'पेन्शन', 'पैंशन'],
  'pensionable': ['पेंशन योग्य', 'पेंशनयोग्य'],
  'pensionbhogi': ['पेंशनभोगी'],
  'pensioner': ['पेंशनभोगी', 'पेन्शनभोगी'],
  'permanent': ['स्थायी'],
  'permission': ['अनुमति'],
  'personnel': ['कार्मिक विभाग', 'कार्मिक'],
  'peshkar': ['पेशकार'],
  'petition': ['याचिका'],
  'phatkar': ['फटकार'],
  'pil': ['जनहित याचिका', 'PIL'],
  'pitritva': ['पितृत्व अवकाश'],
  'plea': ['अनुनय', 'विनम्र निवेदन'],
  'pleadings': ['अभिवचन'],
  'posting': ['तैनाती'],
  'prakriya': ['प्रक्रिया'],
  'prarthnapatra': ['प्रार्थनापत्र'],
  'prarup': ['प्रारूप'],
  'prasooti': ['प्रसूति अवकाश'],
  'prastar': ['प्रस्तर'],
  'pratiniyukti': ['प्रतिनियुक्ति'],
  'pratipurti': ['प्रतिपूर्ति'],
  'pratishapathpatra': ['प्रति-शपथपत्र'],
  'pratyavedan': ['प्रत्यावेदन'],
  'pratyuttar': ['प्रत्युत्तर'],
  'precedent': ['पूर्व निर्णय', 'मिसाल'],
  'primary': ['प्राथमिक'],
  'probation': ['परिवीक्षा'],
  'procedure': ['प्रक्रिया', 'कार्यविधि'],
  'process': ['प्रक्रिया'],
  'promotion': ['पदोन्नति', 'प्रोन्नति'],
  'pronnati': ['पदोन्नति', 'प्रोन्नति'],
  'providentfund': ['भविष्य निधि', 'PF'],
  'punariksana': ['पुनरीक्षण'],
  'punarvilokan': ['पुनर्विलोकन'],
  'pustika': ['पुस्तिका'],
  'pwd': ['लोक निर्माण विभाग', 'PWD'],
  'rajasva': ['राजस्व विभाग'],
  'rajpatra': ['राजपत्र'],
  'rajpatrit': ['राजपत्रित'],
  'recommendation': ['संस्तुति'],
  'record': ['अभिलेख', 'रिकॉर्ड'],
  'recovery': ['वसूली'],
  'recruitment': ['भर्ती', 'नियुक्ति', 'नियोजन'],
  'reduction': ['पदावनति', 'पद घटाना'],
  'regularization': ['नियमितीकरण'],
  'regulation': ['विनियम', 'विनियमावली'],
  'reimbursement': ['प्रतिपूर्ति'],
  'rejoinder': ['प्रत्युत्तर'],
  'removal': ['पदच्युति'],
  'reply': ['उत्तर', 'जवाब'],
  'representation': ['अभ्यावेदन', 'प्रत्यावेदन'],
  'reprimand': ['फटकार', 'चेतावनी'],
  'resign': ['त्यागपत्र'],
  'resignation': ['त्यागपत्र'],
  'resolution': ['संकल्प'],
  'retire': ['सेवानिवृत्त', 'रिटायर'],
  'retirement': ['सेवानिवृत्ति', 'सेवानिवृति'],
  'revenue': ['राजस्व विभाग', 'राजस्व'],
  'review': ['पुनर्विलोकन'],
  'reviewofficer': ['समीक्षा अधिकारी'],
  'revision': ['पुनरीक्षण'],
  'rit': ['रिट'],
  'rule': ['नियम'],
  'rules': ['नियमावली'],
  'saal': ['साल', 'वर्ष'],
  'sachiv': ['सचिव'],
  'sachivalaya': ['सचिवालय'],
  'sad': ['SAD Manual', 'सचिवालय कार्यविधि मैनुअल'],
  'sadmanual': ['SAD Manual', 'सचिवालय कार्यविधि मैनुअल'],
  'sahayak': ['सहायक'],
  'sakshya': ['साक्ष्य'],
  'salary': ['वेतन', 'पगार'],
  'samayojan': ['समायोजन'],
  'sameeksha': ['समीक्षा'],
  'sanction': ['स्वीकृति', 'मंजूरी'],
  'sankalp': ['संकल्प'],
  'sanshodhan': ['संशोधन'],
  'sanstuti': ['संस्तुति'],
  'sanvarg': ['संवर्ग'],
  'sanvida': ['संविदा'],
  'sanyuktasachiv': ['संयुक्त सचिव'],
  'sarkariaadesh': ['सरकारी आदेश'],
  'sarvocch': ['सर्वोच्च न्यायालय'],
  'sat': ['राज्य प्रशासनिक अधिकरण', 'SAT'],
  'satarkata': ['सतर्कता'],
  'satyapan': ['सत्यापन'],
  'satyapit': ['सत्यापित'],
  'secondary': ['माध्यमिक'],
  'secondment': ['प्रतिनियुक्ति'],
  'secretariat': ['सचिवालय'],
  'secretary': ['सचिव'],
  'section': ['धारा'],
  'sectionofficer': ['अनुभाग अधिकारी'],
  'seedhibharti': ['सीधी भर्ती'],
  'seema': ['सीमा'],
  'seniority': ['वरिष्ठता'],
  'service': ['सेवा'],
  'seva': ['सेवा'],
  'sevanivritti': ['सेवानिवृत्ति'],
  'sevasamapti': ['सेवा समाप्ति'],
  'sevavidhi': ['सेवा विधि'],
  'shaheed': ['शहीद'],
  'shapathpatra': ['शपथपत्र'],
  'shart': ['शर्त'],
  'shasanadesh': ['शासनादेश'],
  'shashnadesh': ['शासनादेश'],
  'shhasanadesh': ['शासनादेश'],
  'shikayat': ['शिकायत'],
  'shreni': ['श्रेणी'],
  'sikhriot': ['सिख दंगा', '1984 दंगा'],
  'so': ['SO', 'अनुभाग अधिकारी'],
  'specialpay': ['विशेष वेतन'],
  'specialsecretary': ['विशेष सचिव'],
  'ssb': ['SSB', 'सशस्त्र सीमा बल'],
  'stay': ['स्थगन', 'रोक'],
  'sthagan': ['स्थगन'],
  'sthanantaran': ['स्थानांतरण', 'स्थानान्तरण'],
  'sthantaran': ['स्थानांतरण'],
  'sthayi': ['स्थायी'],
  'sthayikaran': ['स्थायीकरण'],
  'studyleave': ['अध्ययन अवकाश'],
  'subrule': ['उप-नियम'],
  'subsection': ['उप-धारा'],
  'superannuation': ['अधिवर्षिता', 'सेवानिवृत्ति आयु'],
  'supremecourt': ['सर्वोच्च न्यायालय', 'उच्चतम न्यायालय'],
  'surviving': ['उत्तरजीवी'],
  'suspension': ['निलंबन', 'निलम्बन'],
  'swasthya': ['स्वास्थ्य'],
  'swikriti': ['स्वीकृति', 'अनुमोदन'],
  'ta': ['यात्रा भत्ता', 'TA', 'टी.ए.'],
  'tabadala': ['तबादला'],
  'tabadla': ['तबादला', 'स्थानांतरण'],
  'tadarth': ['तदर्थ'],
  'tainati': ['तैनाती'],
  'tareekh': ['तारीख'],
  'tark': ['तर्क'],
  'temporary': ['अस्थायी'],
  'terminate': ['सेवा समाप्ति'],
  'termination': ['सेवा समाप्ति'],
  'tippan': ['टिप्पण'],
  'tippani': ['टिप्पणी'],
  'transfer': ['स्थानांतरण', 'तबादला', 'स्थानान्तरण'],
  'transportallowance': ['परिवहन भत्ता'],
  'tribunal': ['अधिकरण', 'ट्रिब्यूनल'],
  'tyagpatra': ['त्यागपत्र'],
  'uchhanyayalaya': ['उच्च न्यायालय'],
  'uchhatam': ['उच्चतम न्यायालय'],
  'umra': ['उम्र'],
  'undersecretary': ['अनु सचिव'],
  'undertaking': ['वचनबद्धता', 'अंडरटेकिंग'],
  'uniform': ['वर्दी भत्ता'],
  'upadan': ['उपदान', 'ग्रेच्युटी'],
  'upadhara': ['उप-धारा'],
  'upasthiti': ['उपस्थिति'],
  'upniyam': ['उप-नियम', 'उपनियम'],
  'upsachiv': ['उप सचिव'],
  'urbandevelopment': ['नगर विकास', 'शहरी विकास'],
  'uttar': ['उत्तर'],
  'vachanbaddhata': ['वचनबद्धता'],
  'vardi': ['वर्दी'],
  'varishtata': ['वरिष्ठता'],
  'varishtatatva': ['वरिष्ठता'],
  'varsh': ['वर्ष'],
  'varsha': ['वर्ष'],
  'vasooli': ['वसूली'],
  'vasuli': ['वसूली'],
  'verdict': ['फैसला'],
  'verification': ['सत्यापन'],
  'verify': ['सत्यापन', 'सत्यापित'],
  'vetan': ['वेतन'],
  'vetanaayog': ['वेतन आयोग'],
  'vetanman': ['वेतनमान'],
  'vetansamiti': ['वेतन समिति'],
  'vetanvriddhi': ['वेतनवृद्धि'],
  'vetanvridhi': ['वेतनवृद्धि'],
  'vibhag': ['विभाग'],
  'vibhagiyajaanch': ['विभागीय जाँच'],
  'vidhi': ['विधि'],
  'vidhwa': ['विधवा'],
  'vigilance': ['सतर्कता'],
  'viniyam': ['विनियम'],
  'visheshsachiv': ['विशेष सचिव'],
  'visheshvetan': ['विशेष वेतन'],
  'vitt': ['वित्त विभाग', 'वित्त'],
  'vittiyahaspustika': ['वित्तीय हस्त-पुस्तिका'],
  'vittiyavarsha': ['वित्तीय वर्ष'],
  'voluntary': ['स्वैच्छिक'],
  'vrs': ['स्वैच्छिक सेवानिवृत्ति', 'VRS'],
  'vyadesh': ['व्यादेश'],
  'warning': ['चेतावनी'],
  'washing': ['धुलाई भत्ता'],
  'widow': ['विधवा'],
  'withholding': ['रोकना', 'विरोधन'],
  'witness': ['गवाह'],
  'wp': ['रिट याचिका', 'WP'],
  'writ': ['रिट', 'याचिका'],
  'writtenstatement': ['लिखित कथन', 'लिखित बयान'],
  'yachika': ['याचिका'],
  'yatayatabhatta': ['यातायात भत्ता'],
  'yatrabhatta': ['यात्रा भत्ता'],
  'year': ['वर्ष', 'साल'],
};

// ── Roman letter → Devanagari variants (used in rule numbers like 22-B → 22-बी or 22-ख) ──
// Each English letter maps to 2 Devanagari forms commonly used in UP rules:
//   - alphabet-position form (क/ख/ग/घ — used for sub-section ordering)
//   - transliteration form (ए/बी/सी/डी — Hindi spelling of English letter name)
const ALPHA_DEV_VARIANTS = {
  'a': ['क', 'ए'],     'b': ['ख', 'बी'],    'c': ['ग', 'सी'],    'd': ['घ', 'डी'],
  'e': ['ङ', 'ई'],     'f': ['च', 'एफ'],    'g': ['छ', 'जी'],    'h': ['ज', 'एच'],
  'i': ['झ', 'आई'],    'j': ['ञ', 'जे'],    'k': ['ट', 'के'],    'l': ['ठ', 'एल'],
  'm': ['ड', 'एम'],    'n': ['ढ', 'एन'],    'o': ['ण', 'ओ'],     'p': ['त', 'पी'],
  'q': ['थ', 'क्यू'],   'r': ['द', 'आर'],    's': ['ध', 'एस'],    't': ['न', 'टी'],
  'u': ['प', 'यू'],    'v': ['फ', 'वी'],    'w': ['ब', 'डब्ल्यू'], 'x': ['भ', 'एक्स'],
  'y': ['म', 'वाई'],   'z': ['य', 'जेड'],
};

function expandQuery(q) {
  const terms = [q.toLowerCase()];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  // CRITICAL: add every individual word as a term so scorer can match each
  // independently (e.g. "22-बी" as a standalone term against rule_number fields).
  terms.push(...words);
  words.forEach(w => {
    if (TRANSLIT[w]) terms.push(...TRANSLIT[w].map(t => t.toLowerCase()));
    // Also try reverse — if Hindi word matches a key's value, add the key
    Object.entries(TRANSLIT).forEach(([eng, hindiArr]) => {
      hindiArr.forEach(h => {
        if (q.includes(h)) terms.push(eng, ...hindiArr.map(x => x.toLowerCase()));
      });
    });
    // Rule-number-letter pattern: "22-b" / "22-B" / "22b" → expand to Devanagari variants
    const ruleLetterMatch = w.match(/^(\d+)\s*[\-\u2010-\u2015]?\s*([a-z])$/);
    if (ruleLetterMatch) {
      const num = ruleLetterMatch[1];
      const letter = ruleLetterMatch[2];
      const variants = ALPHA_DEV_VARIANTS[letter] || [];
      variants.forEach(v => {
        terms.push(`${num}-${v}`);   // 22-बी, 22-ख
        terms.push(`${num} ${v}`);   // 22 बी
        terms.push(`${num}${v}`);    // 22बी
      });
    }
  });
  return [...new Set(terms)];
}

// ── Regex escape helper ─────────────────────────────────────────
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Count non-overlapping occurrences of substring (fast, no regex) ─
function countOccurrences(haystack, needle) {
  if (!haystack || !needle || needle.length === 0) return 0;
  let count = 0, pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

// ── Build searchable text from a KB entry (post-Phase-1 schema) ──
function buildSearchableText(r) {
  const parts = [
    r.title || '',
    r.summary || '',
    Array.isArray(r.key_provisions) ? r.key_provisions.join(' ') : (r.key_provisions || ''),
    Array.isArray(r.tags) ? r.tags.join(' ') : (r.tags || ''),
    r.chapter || '',
    r.rule_number || '',
    r.file_number || '',
    r.issuing_authority || '',
    r.source || '',
    // Legacy fields (if any old cards still around)
    r.content || '', r.text || '', r.heading || '', r.keywords || '', r.topic || '',
  ];
  return parts.join(' ').toLowerCase();
}

// ── Smart search — IDF-weighted field-aware scoring ──────────────
function smartSearch(query, bookFilter, limit = 12) {
  if (!query || !query.trim()) return [];
  const terms = expandQuery(query)
    .filter(t => t && t.length > 1)
    .map(t => String(t).toLowerCase());
  if (!terms.length) return [];

  let pool = knowledge;

  // Book filter (preserved: universal entries pass through)
  if (bookFilter && bookFilter.trim()) {
    const bf = bookFilter.toLowerCase().trim();
    pool = pool.filter(r => {
      const dept = (r.dept || r.department || '').toLowerCase();
      const book = (r.book || r.filename || r.source || '').toLowerCase();
      if (dept === 'universal') return true;
      return book.includes(bf) || dept.includes(bf);
    });
  }
  if (!pool.length) return [];

  // ── Step 1: precompute IDF for each term across pool ──
  const N = pool.length;
  const idf = {};
  // Precompute searchable text per entry (reused below for scoring)
  const searchables = pool.map(r => buildSearchableText(r));
  for (const term of terms) {
    let df = 0;
    for (let i = 0; i < searchables.length; i++) {
      if (searchables[i].includes(term)) df++;
    }
    // Smoothed IDF: log10((N+1)/(df+1)) + 1; range ≈ [1, ~3.5]
    idf[term] = Math.log10((N + 1) / (df + 1)) + 1;
  }

  // ── Step 2: phrase match preparation ──
  const fullQuery = query.toLowerCase().trim();
  const isMultiWord = fullQuery.split(/\s+/).filter(w => w.length > 1).length > 1;

  // ── Step 3: score each entry ──
  // Field weights (relative importance for matches)
  const W = {
    title: 5, rule_number: 4, file_number: 3.5, tags: 3,
    chapter: 2, summary: 1.5, provisions: 1, authority: 0.7, source: 0.5,
  };

  const scored = pool.map((r, idx) => {
    const title       = (r.title || '').toLowerCase();
    const summary     = (r.summary || '').toLowerCase();
    const provisions  = Array.isArray(r.key_provisions)
                          ? r.key_provisions.join(' ').toLowerCase()
                          : String(r.key_provisions || '').toLowerCase();
    const tags        = Array.isArray(r.tags)
                          ? r.tags.join(' ').toLowerCase()
                          : String(r.tags || '').toLowerCase();
    const chapter     = (r.chapter || '').toLowerCase();
    const ruleNum     = (r.rule_number || '').toLowerCase();
    const fileNum     = (r.file_number || '').toLowerCase();
    const source      = (r.source || '').toLowerCase();
    const authority   = (r.issuing_authority || '').toLowerCase();

    let score = 0;
    // TF saturation cap — each term gets at most CAP occurrences per field counted.
    // Prevents long body-text cards from drowning out targeted title/rule_number matches.
    const CAP = 3;
    const cap = (n) => Math.min(n, CAP);
    for (const term of terms) {
      const w = idf[term] || 1;
      const termScore =
        cap(countOccurrences(title,      term)) * W.title +
        cap(countOccurrences(ruleNum,    term)) * W.rule_number +
        cap(countOccurrences(fileNum,    term)) * W.file_number +
        cap(countOccurrences(tags,       term)) * W.tags +
        cap(countOccurrences(chapter,    term)) * W.chapter +
        cap(countOccurrences(summary,    term)) * W.summary +
        cap(countOccurrences(provisions, term)) * W.provisions +
        cap(countOccurrences(authority,  term)) * W.authority +
        cap(countOccurrences(source,     term)) * W.source;
      score += termScore * w;
    }

    // Strong bonus when card's rule_number field contains a SPECIFIC query term
    // (number-containing term, to avoid common words like "नियम"/"मूल" triggering)
    if (ruleNum) {
      for (const term of terms) {
        if (term.length >= 3 && /\d/.test(term) && ruleNum.includes(term)) {
          score += 80;
          break;
        }
      }
    }
    // Similar for file_number (GO number lookups)
    if (fileNum) {
      for (const term of terms) {
        if (term.length >= 3 && /\d/.test(term) && fileNum.includes(term)) {
          score += 60;
          break;
        }
      }
    }

    // Phrase match bonus: full query found contiguously in major fields
    if (isMultiWord) {
      const major = title + ' ' + summary + ' ' + provisions + ' ' + tags;
      if (major.includes(fullQuery)) score += 50;
    }

    return { entry: r, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

// ── Routes ──────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({
  status: 'Nyaysahayak API Live!',
  entries: knowledge.length,
  endpoints: ['GET /search?q=&book=&limit=', 'POST /search', 'GET /browse', 'GET /browse/:book', 'POST /bulk-insert', 'GET /knowledge?page=&limit=&book=']
}));

// ── SEARCH (GET + POST) ─────────────────────────────────────────
const handleSearch = async (req, res) => {
  const query      = req.body?.query || req.body?.q || req.query?.q || req.query?.query || '';
  const bookFilter = req.body?.book  || req.query?.book  || '';
  const limitParam = parseInt(req.query?.limit || req.body?.limit) || 12;
  const rawMode    = req.method === 'GET' || req.query?.raw;

  if (!query.trim()) return res.status(400).json({ error: 'Query required — use ?q=yourquery' });

  try {
    const results = smartSearch(query, bookFilter, limitParam);

    // GET request or ?raw — return raw results (used by frontend)
    if (rawMode) {
      return res.json({ results, total: results.length });
    }

    // POST without raw — return AI answer
    const context = results.length > 0
      ? results.map(r => {
          const book    = r.source || r.book || '';
          const chapter = r.chapter || '';
          const ruleNum = r.rule_number || '';
          const title   = r.title || '';
          const heading = [chapter, ruleNum, title].filter(Boolean).join(' — ');
          const provisions = Array.isArray(r.key_provisions)
                              ? r.key_provisions.join('\n')
                              : (r.key_provisions || r.summary || r.content || r.text || '');
          return `[${book}${heading ? ' — ' + heading : ''}]\n${provisions}`;
        }).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `आप न्यायसहायक हैं — उत्तर प्रदेश शासन के विधिक सहायक।

नियम:
1. उत्तर केवल शुद्ध सरकारी हिंदी में।
2. यदि तुलनात्मक या पैरावार प्रश्न हो — क्र.सं. सहित तालिका (table) में उत्तर दें।
3. citation अनिवार्य — इस प्रारूप में:
   🔖 शासनादेश: [विभाग व अनुभाग], शा०सं० [संख्या], दिनांक [DD Month YYYY]
   🔖 पुस्तक: [पुस्तक नाम], खण्ड-[X], अध्याय-[X], नियम [X]
   🔖 सेवा विधि: सेवा विधि, अध्याय-[X], प्रस्तर-[X]
4. उत्तर 150 शब्द या एक सम्पूर्ण प्रासंगिक अनुच्छेद — जो पहले पूर्ण हो।
5. अंत में अवश्य लिखें: 📚 विस्तृत विवरण — ज्ञानकोश में पढ़ें →
6. ज्ञान आधार में न हो तो: ⚠️ उपलब्ध ज्ञान आधार में यह जानकारी नहीं है — संबंधित विभाग से संपर्क करें।
7. अनुमान कदापि न लगाएं।`,
      messages: [{
        role: 'user',
        content: context
          ? `ज्ञान आधार:\n${context}\n\nप्रश्न: ${query}`
          : `प्रश्न: ${query}`
      }]
    });

    res.json({
      answer:  response.content[0].text,
      sources: results.map(r => ({ book: r.book || r.source, chapter: r.chapter || r.topic })),
      total:   results.length
    });

  } catch(e) {
    console.error('Search error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

app.post('/search', handleSearch);
app.get('/search',  handleSearch);

// ── KNOWLEDGE BROWSE (new) ───────────────────────────────────────
// GET /knowledge?page=1&limit=20&book=Seva Vidhi
app.get('/knowledge', (req, res) => {
  const page      = parseInt(req.query.page)  || 1;
  const limit     = parseInt(req.query.limit) || 20;
  const bookFilter= req.query.book || '';
  const dept      = req.query.dept || '';

  let pool = knowledge;
  if (bookFilter) {
    const bf = bookFilter.toLowerCase();
    pool = knowledge.filter(r =>
      (r.book   && r.book.toLowerCase().includes(bf)) ||
      (r.source && r.source.toLowerCase().includes(bf))
    );
  }
  if (dept) {
    const d = dept.toLowerCase();
    const NON_UNIVERSAL_DEPTS = ['sainik_school_mod', 'iti_mod'];
    const isNonUniversal = NON_UNIVERSAL_DEPTS.some(nd => d.includes(nd));
    pool = pool.filter(r => {
      const rdept = (r.department || r.dept || '').toLowerCase();
      if (isNonUniversal) return rdept.includes(d);
      return rdept === 'universal' || rdept.includes(d);
    });
  }

  const total = pool.length;
  const start = (page - 1) * limit;
  const entries = pool.slice(start, start + limit);

  res.json({ total, page, limit, total_pages: Math.ceil(total / limit), entries });
});

// ── BROWSE (book summary) ────────────────────────────────────────
app.get('/browse', (req, res) => {
  const grouped = {};
  knowledge.forEach(e => {
    const book = e.book || e.source || e.filename || 'Other';
    if (!grouped[book]) grouped[book] = { name: book, count: 0 };
    grouped[book].count++;
  });
  res.json({
    total_entries: knowledge.length,
    total_books: Object.keys(grouped).length,
    books: Object.values(grouped).sort((a, b) => b.count - a.count)
  });
});


// GET /gos?dept=madhyamik - dept specific + universal GOs
const UNIVERSAL_DEPTS = ['nyay', 'karmik', 'vitt', 'universal'];
app.get('/gos', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const dept = req.query.dept || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filtered = knowledge.filter(e => {
    if (e.type !== 'GO') return false;
    if (!dept) return true;
    if (dept === "iti") return e.dept === "iti";
    return e.dept === dept || UNIVERSAL_DEPTS.includes(e.dept);
  });
  const start = (page - 1) * limit;
  res.json({
    total: filtered.length,
    page,
    total_pages: Math.ceil(filtered.length / limit),
    entries: filtered.slice(start, start + limit)
  });
});

app.get('/browse/:book', (req, res) => {
  const book = decodeURIComponent(req.params.book);
  const page = parseInt(req.query.page) || 1;
  const filtered = knowledge.filter(e =>
    (e.book || e.source || e.filename || 'Other') === book
  );
  const start = (page - 1) * 30;
  res.json({
    book, total: filtered.length, page,
    total_pages: Math.ceil(filtered.length / 30),
    entries: filtered.slice(start, start + 30)
  });
});

// ── BULK INSERT (fixed — no SQLite) ─────────────────────────────
// POST /bulk-insert
// Body: array of entry objects
// Each entry should have: book, chapter/topic, content, keywords (optional), dept (optional)
app.post('/bulk-insert', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Array of entries expected' });
  if (entries.length === 0)    return res.status(400).json({ error: 'Empty array' });
  if (entries.length > 500)    return res.status(400).json({ error: 'Max 500 entries per request' });

  let inserted = 0;
  let skipped  = 0;

  entries.forEach(entry => {
    if (!entry.content && !entry.text) { skipped++; return; }
    // Normalize
    const normalized = {
      book:     entry.book     || entry.source  || 'Unknown',
      chapter:  entry.chapter  || entry.topic   || entry.heading || '',
      topic:    entry.topic    || entry.chapter  || entry.heading || '',
      heading:  entry.heading  || entry.topic    || '',
      filename: entry.filename || '',
      content:  entry.content  || entry.text    || '',
      keywords: entry.keywords || '',
      dept:     entry.dept     || entry.department || '',
      year:     entry.year     || '',
      ref:      entry.ref      || entry.go_number || '',
      type:     entry.type     || 'entry',
    };
    knowledge.push(normalized);
    inserted++;
  });

  // Save back to knowledge.json
  try {
    writeFileSync(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2), 'utf-8');
    console.log(`✅ Bulk insert: ${inserted} added, ${skipped} skipped. Total: ${knowledge.length}`);
    res.json({
      success: true,
      inserted,
      skipped,
      total: knowledge.length
    });
  } catch(e) {
    console.error('Write error:', e.message);
    res.status(500).json({ error: 'Could not save knowledge.json: ' + e.message });
  }
});

// ── Department-wise GOs insert ───────────────────────────────────
// POST /insert-go
// Single GO entry with department tag
app.post('/insert-go', (req, res) => {
  const { title, content, dept, year, ref, court, book } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const entry = {
    book:     book  || 'शासनादेश',
    chapter:  title || ref || '',
    topic:    title || '',
    heading:  title || '',
    filename: ref   || '',
    content:  content,
    keywords: `${dept || ''} ${year || ''} ${title || ''} GO शासनादेश`.trim(),
    dept:     dept  || '',
    year:     year  || '',
    ref:      ref   || '',
    type:     'GO',
    court:    court || '',
  };

  knowledge.push(entry);
  try {
    writeFileSync(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2), 'utf-8');
    res.json({ success: true, total: knowledge.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Stats endpoint ───────────────────────────────────────────────
app.get('/stats', (req, res) => {
  const byBook = {};
  const byDept = {};
  const byType = {};

  knowledge.forEach(e => {
    const book = e.book || 'Other';
    const dept = e.dept || 'General';
    const type = e.type || 'entry';
    byBook[book] = (byBook[book] || 0) + 1;
    byDept[dept] = (byDept[dept] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  });

  res.json({
    total: knowledge.length,
    by_book: byBook,
    by_dept: byDept,
    by_type: byType,
  });
});

// ── Reader endpoints (existing — unchanged) ──────────────────────
let fhbData = [];
try {
  fhbData = JSON.parse(readFileSync(path.join(__dirname, 'fhb_index.json'), 'utf-8'));
  console.log('FHB loaded:', fhbData.length, 'chapters');
} catch(e) { console.log('FHB not found:', e.message); }

app.get('/fhb', (req, res) => {
  res.json({ total: fhbData.length, chapters: fhbData.map(({pages,topic,filename}) => ({pages,topic,filename})) });
});
app.get('/fhb/:filename', (req, res) => {
  const ch = fhbData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let sadData = [];
try {
  sadData = JSON.parse(readFileSync(path.join(__dirname, 'sad_index.json'), 'utf-8'));
  console.log('SAD loaded:', sadData.length, 'chapters');
} catch(e) { console.log('SAD not found:', e.message); }

app.get('/sad', (req, res) => {
  res.json({ total: sadData.length, chapters: sadData.map(({prastar,topic,filename}) => ({prastar,topic,filename})) });
});
app.get('/sad/:filename', (req, res) => {
  const ch = sadData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let svData = [];
try {
  svData = JSON.parse(readFileSync(path.join(__dirname, 'sv_index.json'), 'utf-8'));
  console.log('SV loaded:', svData.length, 'chapters');
} catch(e) { console.log('SV not found:', e.message); }

app.get('/sv', (req, res) => {
  res.json({ total: svData.length, chapters: svData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});
app.get('/sv/:filename', (req, res) => {
  const ch = svData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

// UP Aacharan Niyamavali 1956 — 33 rules, OCR'd via Tesseract Hindi
let aacharanData = [];
try {
  aacharanData = JSON.parse(readFileSync(path.join(__dirname, 'aacharan_index.json'), 'utf-8'));
  console.log('Aacharan loaded:', aacharanData.length, 'rules');
} catch(e) { console.log('Aacharan not found:', e.message); }

app.get('/aacharan', (req, res) => {
  res.json({ total: aacharanData.length, chapters: aacharanData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});
app.get('/aacharan/:filename', (req, res) => {
  const ch = aacharanData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});



// Seva Vidhi — 4 volumes
const SV_VOLS = {
  sv1: { file: 'sv_vol1_index.json', name: 'नियुक्ति एवं भर्ती' },
  sv2: { file: 'sv_vol2_index.json', name: 'सेवा शर्तें एवं पदोन्नति' },
  sv3: { file: 'sv_vol3_index.json', name: 'अनुशासन एवं अपील' },
  sv4: { file: 'sv_vol4_index.json', name: 'पेंशन एवं शासनादेश' },
};
const svVolData = {};
for (const [key, vol] of Object.entries(SV_VOLS)) {
  try {
    svVolData[key] = JSON.parse(readFileSync(path.join(__dirname, vol.file), 'utf-8'));
    console.log(key + ' loaded:', svVolData[key].length, 'entries');
  } catch(e) { svVolData[key] = []; console.log(key + ' not found'); }
  app.get('/' + key, (req, res) => {
    const d = svVolData[key];
    res.json({ total: d.length, name: vol.name, chapters: d.map(({id,topic,type}) => ({id,topic,type})) });
  });
  app.get('/' + key + '/:id', (req, res) => {
    const ch = svVolData[key].find(c => String(c.id) === req.params.id);
    if (!ch) return res.status(404).json({ error: 'Not found' });
    res.json(ch);
  });
}

// ── PUVVNL ──
let puvvnlData = [];
try {
  puvvnlData = JSON.parse(readFileSync(path.join(__dirname, 'puvvnl_index.json'), 'utf-8'));
  console.log('PUVVNL loaded:', puvvnlData.length, 'entries');
} catch(e) { console.log('PUVVNL not found:', e.message); }

app.get('/puvvnl', (req, res) => {
  res.json({ total: puvvnlData.length, chapters: puvvnlData.map(({num,topic,filename,book,chapter}) => ({num,topic,filename,book,chapter})) });
});
app.get('/puvvnl/:filename', (req, res) => {
  const ch = puvvnlData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});
// ── Batch 1 books: DA Rules 1999, Reservation Act 1994, Basic Education Act 1972, RTE Act 2009 ──
const BATCH1_BOOKS = {
  dar: { file: 'dar_index.json', name: 'उ0प्र0 सरकारी सेवक (अनुशासन एवं अपील) नियमावली, 1999' },
  res: { file: 'res_index.json', name: 'उ0प्र0 लोक सेवा (अनुसूचित जाति/जनजाति/अन्य पिछड़े वर्ग आरक्षण) अधिनियम, 1994' },
  bea: { file: 'bea_index.json', name: 'उत्तर प्रदेश बेसिक शिक्षा अधिनियम, 1972' },
  rte: { file: 'rte_index.json', name: 'नि:शुल्क और अनिवार्य बाल शिक्षा का अधिकार अधिनियम, 2009' },
};
const batch1Data = {};
for (const [key, book] of Object.entries(BATCH1_BOOKS)) {
  try {
    batch1Data[key] = JSON.parse(readFileSync(path.join(__dirname, book.file), 'utf-8'));
    console.log(key + ' loaded:', batch1Data[key].length, 'chapters');
  } catch(e) { batch1Data[key] = []; console.log(key + ' not found:', e.message); }
  app.get('/' + key, (req, res) => {
    const d = batch1Data[key];
    res.json({ total: d.length, name: book.name, chapters: d.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
  });
  app.get('/' + key + '/:filename', (req, res) => {
    const ch = batch1Data[key].find(c => c.filename === req.params.filename);
    if (!ch) return res.status(404).json({ error: 'Not found' });
    res.json(ch);
  });
}

// ── Batch 2 books: Urban Planning & Development Act 1973 ──
const BATCH2_BOOKS = {
  nyv: { file: 'nyv_index.json', name: 'उत्तर प्रदेश नगर योजना और विकास अधिनियम, 1973' },
  prj: { file: 'prj_index.json', name: 'उत्तर प्रदेश (संयुक्त प्रांत) पंचायत राज अधिनियम, 1947' },
  kzp: { file: 'kzp_index.json', name: 'उत्तर प्रदेश (क्षेत्र पंचायत तथा जिला पंचायत) अधिनियम, 1961' },
  urc: { file: 'urc_index.json', name: 'उत्तर प्रदेश राजस्व संहिता, 2006' },
};
const batch2Data = {};
for (const [key, book] of Object.entries(BATCH2_BOOKS)) {
  try {
    batch2Data[key] = JSON.parse(readFileSync(path.join(__dirname, book.file), 'utf-8'));
    console.log(key + ' loaded:', batch2Data[key].length, 'chapters');
  } catch(e) { batch2Data[key] = []; console.log(key + ' not found:', e.message); }
  app.get('/' + key, (req, res) => {
    const d = batch2Data[key];
    res.json({ total: d.length, name: book.name, chapters: d.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
  });
  app.get('/' + key + '/:filename', (req, res) => {
    const ch = batch2Data[key].find(c => c.filename === req.params.filename);
    if (!ch) return res.status(404).json({ error: 'Not found' });
    res.json(ch);
  });
}

// ── Library chapter content search (per-book) ───────────────────
const LIBRARY_DATA = {
  fhb:    () => fhbData,
  sad:    () => sadData,
  sv:     () => svData,
  puvvnl: () => puvvnlData,
  dar:    () => batch1Data.dar,
  res:    () => batch1Data.res,
  bea:    () => batch1Data.bea,
  rte:    () => batch1Data.rte,
  nyv:    () => batch2Data.nyv,
  prj:    () => batch2Data.prj,
  kzp:    () => batch2Data.kzp,
  urc:    () => batch2Data.urc,
};

app.get('/library/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const book = req.query.book;
  if (!q) return res.json({ total: 0, results: [] });
  if (!book || !LIBRARY_DATA[book]) {
    return res.status(400).json({ error: 'valid book code required (fhb/sad/sv/puvvnl)' });
  }

  const terms = expandQuery(q).filter(t => t && t.length > 1);
  const data = LIBRARY_DATA[book]();
  const results = [];

  for (let idx = 0; idx < data.length; idx++) {
    const c = data[idx];
    const orig = c.content || '';
    const content = orig.toLowerCase();
    if (!content) continue;

    let bestIdx = -1, bestTerm = '';
    for (const term of terms) {
      const i = content.indexOf(term);
      if (i >= 0 && (bestIdx === -1 || i < bestIdx)) {
        bestIdx = i;
        bestTerm = term;
      }
    }
    if (bestIdx < 0) continue;

    const start = Math.max(0, bestIdx - 80);
    const end = Math.min(orig.length, bestIdx + bestTerm.length + 200);
    const snippet = (start > 0 ? '…' : '') + orig.substring(start, end) + (end < orig.length ? '…' : '');

    results.push({
      chapter_idx: idx,
      filename: c.filename || '',
      topic:    c.topic    || '',
      pages:    c.pages    || c.prastar || c.chapter || '',
      snippet,
      matched: bestTerm
    });
    if (results.length >= 20) break;
  }

  res.json({ total: results.length, results });
});
// ── DocGen endpoint ──────────────────────────────────────────────
app.post('/docgen', async (req, res) => {
  const { prompt, department } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const systemPrompt = `आप न्यायसहायक हैं — उत्तर प्रदेश शासन के लिए विशिष्ट AI कानूनी सहायक।
विभाग: ${department || 'सामान्य'}

मुख्य नियम:
1. हमेशा SEEDHA जवाब दो — पहले उत्तर, फिर विवरण। कभी clarification मत मांगो।
2. अगर प्रश्न अस्पष्ट हो तो भी सबसे संभावित अर्थ लेकर तुरंत जवाब दो।
3. citation अनिवार्य — exact GO number / FHB rule / Seva Vidhi section।
4. भाषा: शुद्ध सरकारी हिंदी।
5. अधिकतम 250 शब्द — concise और authoritative।
6. जवाब के अंत में: "संबंधित विषय:" — 2-3 related topics।

पैरावार टिप्पणी (जब मांगी जाए):
| पैरा सं० | पैरे का सार (1-2 वाक्य) | विधिक टिप्पणी (नियम/भारा संहित) |
|-----------|--------------------------|-----------------------------------|`
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(response);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nyaysahayak API on port ${PORT}`);
  console.log(`📚 Knowledge entries: ${knowledge.length}`);
});

// ── Vakeel360 CNR Search ──────────────────────────────
const VAKEEL_BASE = 'https://prod-api.vakeel360.com';
const VAKEEL_KEY = process.env.VAKEEL_API_KEY || 'vk_demo_dhriti_857b1fc4e305e8c5aa1a0273';

app.post('/api/v1/cases/search', async (req, res) => {
  try {
    const { cnr, court_type, reference_id, case_type, case_number, case_year } = req.body;
    let url, body;
    if (cnr) {
      const bench = reference_id && reference_id.includes('lucknow') ? 'lucknow' : 'allahabad';
      url = `${VAKEEL_BASE}/api/v1/allahabad-hc/case/cnr`;
      body = { cnr, bench };
    } else {
      const bench = reference_id && reference_id.includes('lucknow') ? 'lucknow' : 'allahabad';
      url = `${VAKEEL_BASE}/api/v1/allahabad-hc/case/search`;
      body = { court_type, reference_id, case_type, case_number, case_year, bench };
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'X-API-Key': VAKEEL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
