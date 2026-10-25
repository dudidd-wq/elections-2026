#!/usr/bin/env python3
"""Build data/coalition.json – the coding table behind the "בנה קואליציה" page (#/coalition).

Every placement of a list in a camp ("model") is copied from data/analysis.json (section "מחנות לפי סוגיה"),
and every placement carries a verbatim evidence string that MUST appear in that analysis text; the declared
constraints are verbatim substrings of the "declaredBloc" field in data/platforms.json. If any evidence string is
missing (because the research text changed), the script exits with an error and the previous coalition.json is kept –
the coding must then be reviewed by hand (that is deliberate: no silent re-coding).

Seat estimates are NOT stored here: the page reads them live from data/polls.json (computed.average), so the poll
routine (tools/update_polls.py) keeps feeding the page without touching this file.
Run: python3 tools/build_coalition.py   (also run, non-fatally, by build_data.py and update_polls.py)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(os.path.join(ROOT, 'data', 'platforms.json'), encoding='utf-8'))
A = json.load(open(os.path.join(ROOT, 'data', 'analysis.json'), encoding='utf-8'))
POLLS = json.load(open(os.path.join(ROOT, 'data', 'polls.json'), encoding='utf-8'))
LISTS = [l['id'] for l in P['lists']]
errors = []

# ---- scale types -------------------------------------------------------------------------------------------
# ordinal   – the analysis presents the models along one line (poles / middle path); distance = steps / (models-1)
# degree    – the analysis calls the dispute one of degree ("מחלוקות על מידה"); different models of two lists that are
#             both named in the issue's shared-goal statement = 0.5, otherwise 1
# principle – the analysis calls the dispute one of principle ("מחלוקות עיקרון") and the models are not ordered:
#             different model = 1
# U = uncoded (not counted): the analysis gives only a general position / no plan / no position found / a position on
#     a different question than the issue's axis.
ISSUES = [
 dict(id='security', scale='ordinal',
      basis=('principleVsDegree', 'מחלוקות עיקרון', '"היום שאחרי" בעזה (הגירה והתיישבות, מול גורם בינלאומי, מול הסדר מדיני)'),
      scope='המודלים ל"יום שאחרי" בעזה (הניתוח מציג אותם בין שני קטבים). העמדות על איראן ולבנון אינן חלק מהסולם.',
      camps=['בקוטב אחד הסדר מדיני וסיום הכיבוש', 'העברה לגורם אזורי או בינלאומי לצד פירוז', 'פירוק חמאס כתנאי לנסיגה',
             '"הגירה מרצון"', 'בקוטב השני כיבוש, ממשל צבאי והתיישבות'],
      code={'joint': ([0], 'הרשימה המשותפת.'),
            'raam': ([0], 'רע"ם*; קרוב לקוטב של הרשימה המשותפת'),
            'dems': ([1], 'הדמוקרטים, ישראל ביתנו'), 'yb': ([1], 'ישראל ביתנו (סיום האחריות הישראלית)'),
            'beyachad': ([1], 'וביחד (הוצאת טורקיה וקטאר'),
            'likud': ([2], 'הליכוד* וישר!.'), 'yashar': ([2], 'הליכוד* וישר!.'),
            'otzma': ([3], 'עוצמה יהודית, המילואימניקים והכלכלית ועמך ישראל'),
            'miluim': ([3], 'עוצמה יהודית, המילואימניקים והכלכלית ועמך ישראל'),
            'amcha': ([3], 'עוצמה יהודית, המילואימניקים והכלכלית ועמך ישראל'),
            'rzz': ([4], 'הציונות הדתית–זהות (צ"ד*; זהות: "כיבוש, גירוש והתיישבות")')},
      U={'shas': ('general', 'ש"ס* ויהדות התורה* הציגו עמדה כללית בלבד'),
         'utj': ('general', 'ש"ס* ויהדות התורה* הציגו עמדה כללית בלבד')}),
 dict(id='palestinian', scale='ordinal', basis=('camps', 'בלי מדינה, עם ריבונות חלקית', 'בלי מדינה, עם ריבונות מלאה או רחבה'),
      scope='חמשת המודלים, ממדינה בגבולות 1967 ועד ריבונות מלאה או רחבה, בסדר שבו הניתוח מציג אותם.',
      camps=['מדינה פלסטינית בגבולות 1967', 'היפרדות, מדינה מפורזת בעתיד, עצירת הסיפוח ופינוי מאחזים',
             'בלי מדינה ובלי סיפוח, עם חיזוק הגושים והבקעה', 'בלי מדינה, עם ריבונות חלקית (שטחי C, הבקעה או גוש התיישבות)',
             'בלי מדינה, עם ריבונות מלאה או רחבה'],
      code={'joint': ([0], 'הרשימה המשותפת.'), 'raam': ([0], 'מדינה פלסטינית בגבולות 1967 – גם רע"ם*, לצד הרשימה המשותפת'),
            'dems': ([1], 'הדמוקרטים.'), 'yashar': ([2], 'ישר!.'),
            'beyachad': ([3], 'ביחד, ישראל ביתנו (לצד הסדר עם ירדן)'), 'yb': ([3], 'ישראל ביתנו (לצד הסדר עם ירדן)'),
            'miluim': ([3], 'והמילואימניקים והכלכלית ("ריבונות דרך מעשים")'),
            'otzma': ([4], 'עוצמה יהודית (ופירוק הרש"פ)'), 'rzz': ([4], 'הציונות הדתית–זהות, עמך ישראל'),
            'amcha': ([4], 'הציונות הדתית–זהות, עמך ישראל'), 'utj': ([4], 'יהדות התורה* וש"ס* (הצעת הריבונות מ-2025)'),
            'shas': ([4], 'יהדות התורה* וש"ס* (הצעת הריבונות מ-2025)'),
            'likud': ([3, 4], 'הוא היה בין מגישי הצעת הריבונות ב-2025')},
      decisions={'likud': 'הניתוח לא משבץ את הליכוד* באחד המודלים: "לא תקום מדינה פלסטינית" והגשת הצעת הריבונות ב-2025, בלי היקף מוגדר. הוא מקודד בשני מודלי הריבונות (חלקית ומלאה) – אותו בסיס (הצעת 2025) שעליו שובצו ש"ס* ויהדות התורה*.'}),
 dict(id='draft', scale='ordinal', basis=('crossAxis', 'משרתים מול פטור', 'משרתים מול פטור'),
      scope='חמשת המודלים לגיוס חרדים, מחובה לכולם עם סנקציות ועד עיגון לימוד תורה. עמדות על שירות של צעירים ערבים הן על שאלה אחרת ואינן על הסולם.',
      camps=['חובת שירות לכולם עם סנקציות', 'חובה לכולם עם מסלול מוגבל ללומדי תורה', 'עמדת ביניים', 'נגד גיוס בכפייה',
             'עיגון לימוד תורה בלי מכסות וסנקציות כתנאי קואליציוני'],
      code={'beyachad': ([0], 'ביחד ("ללא פטורים, מכסות או יעדים")'), 'dems': ([0], 'הדמוקרטים, ישראל ביתנו'),
            'yb': ([0], 'ישראל ביתנו (כולל סנקציות פליליות לעריקים)'), 'miluim': ([0], 'והמילואימניקים והכלכלית (במצע המילואימניקים'),
            'yashar': ([1], 'ישר! (עד 3% דחייה)'), 'amcha': ([1], 'ועמך ישראל (מכסות לפי "פרמטרים אובייקטיביים")'),
            'likud': ([2], 'הליכוד* (יעדים וסנקציות לצד "שמירה על עולם התורה")'), 'rzz': ([2], 'והציונות הדתית–זהות (צ"ד דורשת חוק גיוס'),
            'otzma': ([3], 'עוצמה יהודית*.'), 'shas': ([4], 'ש"ס* ויהדות התורה*.'), 'utj': ([4], 'ש"ס* ויהדות התורה*.')},
      U={'joint': ('offaxis', 'נגד חובת שירות לצעירים ערבים'),
         'raam': ('offaxis', 'שירות אזרחי התנדבותי בחברה הערבית, בלי חובה – רע"ם* (עבאס; סגלוביץ\'). לא נמצאה עמדה של רע"ם על גיוס חרדים.')}),
 dict(id='judiciary', scale='ordinal', basis=('camps', 'מסלול שלישי', 'חוק יסוד: החקיקה כמו האופוזיציה, אבל גם התגברות'),
      scope='שלושה מודלים; "מסלול שלישי" באמצע, כי הניתוח מתאר אותו כמשלב רכיבים משני הצדדים.',
      camps=['ביטול החקיקה המשפטית של הכנסת ה-25 ועיגון היחסים בין הרשויות', 'מסלול שלישי', 'ריסון בית המשפט והיועמ"ש'],
      code={'yashar': ([0], 'ישר! (גם נגד פסקת התגברות)'), 'beyachad': ([0], 'ביחד, הדמוקרטים'), 'dems': ([0], 'הדמוקרטים (גם "אפס נאשמים בממשלה")'),
            'joint': ([0], 'והרשימה המשותפת (נגד "ההפיכה המשפטית"'),
            'raam': ([0], 'רע"ם*, באותו מחנה עם ישר!, ביחד, הדמוקרטים והרשימה המשותפת'),
            'yb': ([1], 'ישראל ביתנו (חוקה במשאל עם ובית משפט לחוקה)'), 'miluim': ([1], 'והמילואימניקים והכלכלית (חוק יסוד: החקיקה'),
            'likud': ([2], 'הליכוד* (קרעי: בית משפט לחוקה שתבחר הכנסת)'), 'otzma': ([2], 'עוצמה יהודית*, ש"ס*, יהדות התורה*'),
            'shas': ([2], 'עוצמה יהודית*, ש"ס*, יהדות התורה*'), 'utj': ([2], 'עוצמה יהודית*, ש"ס*, יהדות התורה*'),
            'rzz': ([2], 'הציונות הדתית–זהות (זהות: בחירה ישירה של שופטי העליון)'), 'amcha': ([2], 'ועמך ישראל (ערכאת ערעור על בג"ץ)')}),
 dict(id='inquiry', scale='principle', basis=('principleVsDegree', 'מחלוקות עיקרון', 'ועדת חקירה (מי ממנה)'),
      scope='חמישה מודלים ועוד אמירה של מועמד בתוך רשימה משותפת. הניתוח מגדיר את המחלוקת "מחלוקת עיקרון" (מי ממנה), ולכן מודלים שונים = מרחק מלא.',
      camps=['ועדת חקירה ממלכתית', 'ועדה שחבריה ימונו בידי הקואליציה והאופוזיציה', 'גוף "עצמאי" שהיו"ר שלו ייבחר בהצבעה חשאית בכנסת',
             'ועדה כתנאי לממשלה, בלי פירוט המתכונת', 'בלי עמדה רשמית, והצביעו נגד ועדה ממלכתית', '"אין טעם בוועדת חקירה" (פייגלין, זהות)'],
      campRefs={5: 'פייגלין (זהות)*: "אין טעם בוועדת חקירה".'},
      code={'yashar': ([0], 'ישר!, ביחד, הדמוקרטים'), 'beyachad': ([0], 'ישר!, ביחד, הדמוקרטים'), 'dems': ([0], 'ישר!, ביחד, הדמוקרטים'),
            'yb': ([0], 'ישראל ביתנו והרשימה המשותפת*'), 'joint': ([0], 'והרשימה המשותפת* (עם מנדט רחב יותר)'),
            'raam': ([0], 'ועדת חקירה ממלכתית – גם רע"ם*'),
            'likud': ([1], 'הליכוד* וצ"ד*.'), 'rzz': ([1, 5], ['הליכוד* וצ"ד*.', 'פייגלין (זהות)*: "אין טעם בוועדת חקירה".']), 'amcha': ([2], 'עמך ישראל.'),
            'miluim': ([3], 'המילואימניקים והכלכלית.'), 'otzma': ([4], 'עוצמה יהודית*, ש"ס* ויהדות התורה*.'),
            'shas': ([4], 'עוצמה יהודית*, ש"ס* ויהדות התורה*.'), 'utj': ([4], 'עוצמה יהודית*, ש"ס* ויהדות התורה*.')}),
 dict(id='economy', scale='degree', basis=('principleVsDegree', 'מחלוקות על מידה', 'יוקר המחיה (כמעט כולן בעד תחרות'),
      consensus=('consensusPartial', 'הגברת התחרות, הסרת חסמי יבוא ופירוק מונופולים',
                 ['yashar', 'beyachad', 'dems', 'shas', 'yb', 'rzz', 'miluim', 'amcha', 'likud'],
                 '9 רשימות – ישר!, ביחד, הדמוקרטים, ש"ס, ישראל ביתנו, הציונות הדתית–זהות, המילואימניקים והכלכלית, עמך ישראל והליכוד*'),
      scope='ארבעה מודלים. הניתוח מגדיר את המחלוקת "מחלוקת על מידה", ולכן שתי רשימות במודלים שונים ששתיהן נמנות בהסכמה על הגברת התחרות = מרחק חלקי (חצי).',
      camps=['שוק ותחרות (הסרת חסמי יבוא, פירוק מונופולים, הפחתת רגולציה)', 'מעורבות מדינה', 'הפחתת מסים חדה', 'ריסון תקציבי'],
      code={'yashar': ([0], 'ישר!, ביחד, ש"ס'), 'beyachad': ([0], 'ישר!, ביחד, ש"ס'), 'shas': ([0], 'ישר!, ביחד, ש"ס'),
            'yb': ([0], 'ש"ס, ישראל ביתנו, הציונות הדתית–זהות'), 'rzz': ([0, 2], ['ישראל ביתנו, הציונות הדתית–זהות', 'וזהות (מס שטוח)']),
            'miluim': ([0, 2], ['הציונות הדתית–זהות, המילואימניקים והכלכלית, עמך ישראל', 'המילואימניקים והכלכלית (מע"מ 12%)']), 'amcha': ([0], 'המילואימניקים והכלכלית, עמך ישראל'),
            'likud': ([0], 'וגם הליכוד* ("קו של שוק חופשי")'), 'dems': ([1], 'הדמוקרטים (פיקוח מחירים'),
            'joint': ([1], 'והרשימה המשותפת* (שכר מינימום'), 'utj': ([3], 'יהדות התורה*.')},
      U={'otzma': ('notfound', 'בלי תוכנית כלכלית'),
         'raam': ('noplan', 'וחזון מוצהר של "שוק חופשי ותחרותי" – רע"ם*; בלי תוכנית כוללת.')}),
 dict(id='housing', scale='degree', basis=('principleVsDegree', 'מחלוקות על מידה', 'דיור (כולן בעד יותר היצע'),
      consensus=('consensusBroad', 'הגדלת היצע הדיור, הוזלת קרקע והאצת תכנון',
                 ['likud', 'yashar', 'beyachad', 'dems', 'otzma', 'shas', 'yb', 'utj', 'rzz', 'miluim', 'amcha'],
                 'לכל 11 הרשימות שהציגו עמדה מעשית על היצע הדיור יש עמדה בכיוון הזה'),
      scope='שני מודלים. "מחלוקת על מידה" לפי הניתוח: שתי רשימות במודלים שונים ששתיהן נמנות בהסכמה על הגדלת ההיצע = מרחק חלקי.',
      camps=['המדינה כשחקן מרכזי ודיור ציבורי', 'היצע, קרקע ותכנון'],
      code={'dems': ([0], 'הדמוקרטים, ש"ס*'), 'shas': ([0], 'ש"ס* (7% מכל בנייה חדשה)'), 'miluim': ([0], 'המילואימניקים והכלכלית (חיזוק הדיור הציבורי)'),
            'likud': ([1], 'הליכוד*, ישר!, ביחד'), 'yashar': ([1], 'הליכוד*, ישר!, ביחד'), 'beyachad': ([1], 'ביחד (שכירות ארוכת טווח)'),
            'yb': ([1], 'ישראל ביתנו, יהדות התורה'), 'utj': ([1], 'ישראל ביתנו, יהדות התורה'), 'rzz': ([1], 'הציונות הדתית–זהות (זהות: פירוק רמ"י)'),
            'otzma': ([1], 'עוצמה יהודית* (נגב וגליל)'), 'amcha': ([1], 'ועמך ישראל (התחדשות עירונית)')},
      U={'raam': ('noplan', 'רע"ם*; בלי תוכנית דיור כללית.'),
         'joint': ('general', 'והרשימה המשותפת* (עמדה כללית)')}),
 dict(id='religion', scale='ordinal', basis=('principleVsDegree', 'מחלוקות על מידה', 'תחבורה בשבת (מסלול ביניים של הכרעה מקומית)'),
      scope='שלושה מודלים; "הכרעה מקומית" באמצע, כי הניתוח מגדיר אותה "מסלול ביניים".',
      camps=['שינוי הסטטוס קוו (נישואים אזרחיים או תחבורה ציבורית בשבת ברמה ארצית)', 'הכרעה מקומית על שבת', 'שמירת הסטטוס קוו'],
      code={'dems': ([0], 'הדמוקרטים, ישראל ביתנו, הרשימה המשותפת'), 'joint': ([0], 'הרשימה המשותפת (מק"י: הפרדת הדת מהמדינה)'),
            'yb': ([0, 1], ['הדמוקרטים, ישראל ביתנו, הרשימה המשותפת', 'ישר!, ביחד (בנט), ישראל ביתנו']), 'beyachad': ([0, 1], ['ויש עתיד בתוך ביחד ("ברית הזוגיות")', 'ישר!, ביחד (בנט)']),
            'yashar': ([1], 'ישר!, ביחד (בנט)'), 'rzz': ([1, 2], ['זהות (ברמת הקהילה)', 'ש"ס*, יהדות התורה* וצ"ד']), 'amcha': ([1], 'ועמך ישראל*.'),
            'likud': ([2], 'הליכוד (תחבורה בימי חול בלבד)'), 'shas': ([2], 'ש"ס*, יהדות התורה* וצ"ד'), 'utj': ([2], 'ש"ס*, יהדות התורה* וצ"ד'),
            'otzma': ([2], 'עוצמה יהודית* מדברת על הטמעת המשפט העברי')},
      decisions={'rzz': 'רשימה משותפת: זהות ב"הכרעה מקומית" וצ"ד ב"שמירת הסטטוס קוו" – שני המודלים נספרים (ראו "רשימה במשבצת יותר ממודל אחד").',
                 'otzma': 'הניתוח מזכיר את עוצמה יהודית* בתוך משבצת "שמירת הסטטוס קוו" (הטמעת המשפט העברי), והיא מקודדת שם.'},
      U={'miluim': ('notfound', 'לא נמצאה עמדה'), 'raam': ('notfound', 'לא נמצאה עמדה של רע"ם על שבת ונישואים אזרחיים')}),
 dict(id='crime', scale='degree', basis=('principleVsDegree', 'מחלוקות על מידה', 'פשיעה (כולן בעד מאבק'),
      consensus=('consensusBroad', 'מאבק נחרץ יותר בפשיעה המאורגנת ובאלימות בחברה הערבית',
                 [x for x in LISTS if x != 'utj'], 'ל-12 מתוך 13 הרשימות יש עמדה בנושא. החריגה היחידה היא יהדות התורה'),
      scope='חמישה מודלים (הניתוח מציג את החמישי בנפרד). "מחלוקת על מידה" לפי הניתוח: מודלים שונים = מרחק חלקי.',
      camps=['מסגור ביטחוני (שב"כ, צה"ל, "טרור", "איום ביטחוני")', 'מצב חירום וקבינט לאומי', 'חימוש אזרחים',
             'אכיפה לצד תקציבי פיתוח לחברה הערבית', '"בעיה של המדינה", יעדים ומשאבים, ועדת חקירה ממלכתית לטיפול בפשיעה, שינוי חוק השב"כ והחמרת הענישה על ירי'],
      campRefs={4: '"בעיה של המדינה", יעדים ומשאבים, ועדת חקירה ממלכתית לטיפול בפשיעה, שינוי חוק השב"כ והחמרת הענישה על ירי – רע"ם*.'},
      code={'beyachad': ([0], 'ביחד, הציונות הדתית–זהות'), 'rzz': ([0, 2], ['ביחד, הציונות הדתית–זהות', 'עוצמה יהודית* וזהות (רישיון נשק ליוצאי צבא)']),
            'miluim': ([0], 'המילואימניקים והכלכלית ועמך ישראל;'), 'amcha': ([0], 'המילואימניקים והכלכלית ועמך ישראל;'),
            'yb': ([0], 'ישראל ביתנו מציעה מעצרים מנהליים ורוגלות'), 'yashar': ([1], 'ישר! והדמוקרטים.'), 'dems': ([1], 'ישר! והדמוקרטים.'),
            'otzma': ([2], 'עוצמה יהודית* וזהות (רישיון נשק ליוצאי צבא)'), 'joint': ([3], 'הרשימה המשותפת*.'),
            'raam': ([4], 'החמרת הענישה על ירי – רע"ם*.')},
      decisions={'rzz': 'רשימה משותפת: "מסגור ביטחוני" (הציונות הדתית–זהות) ו"חימוש אזרחים" (זהות) – שני המודלים נספרים.'},
      U={'likud': ('general', 'הליכוד* וש"ס*.'), 'shas': ('general', 'הליכוד* וש"ס*.'), 'utj': ('notfound', 'יהדות התורה.')}),
 dict(id='education', scale='principle', basis=('principleVsDegree', 'מחלוקות עיקרון', 'התניית תקצוב החינוך החרדי בלימודי ליבה'),
      scope='ארבעה מודלים להתניית התקצוב בלימודי ליבה. הניתוח מגדיר את המחלוקת "מחלוקת עיקרון", ולכן מודלים שונים = מרחק מלא.',
      camps=['תקצוב מותנה בלימודי ליבה', 'תקצוב מותנה בשירות', 'ליבה לכולם בלי התחייבות להתנות בה תקצוב', 'נגד סנקציות וקיצוץ בחינוך החרדי'],
      code={'yashar': ([0], 'ישר!, ביחד, הדמוקרטים וישראל ביתנו.'), 'beyachad': ([0], 'ישר!, ביחד, הדמוקרטים וישראל ביתנו.'),
            'dems': ([0], 'ישר!, ביחד, הדמוקרטים וישראל ביתנו.'), 'yb': ([0], 'ישר!, ביחד, הדמוקרטים וישראל ביתנו.'),
            'miluim': ([1], 'המילואימניקים והכלכלית.'), 'amcha': ([2], 'עמך ישראל והליכוד*'), 'likud': ([2], 'עמך ישראל והליכוד*'),
            'shas': ([3], 'ש"ס* ויהדות התורה*.'), 'utj': ([3], 'ש"ס* ויהדות התורה*.')},
      U={'otzma': ('noposition', 'עוצמה יהודית, הרשימה המשותפת והציונות הדתית–זהות'),
         'joint': ('noposition', 'עוצמה יהודית, הרשימה המשותפת והציונות הדתית–זהות'),
         'rzz': ('noposition', 'עוצמה יהודית, הרשימה המשותפת והציונות הדתית–זהות (זהות: שוברי חינוך)'),
         'raam': ('noposition', 'תקצוב שווה לכל ילד, כולל במוכר שאינו רשמי, בלי עמדה על התניה בליבה – רע"ם*.')}),
]

REASONS = {'general': 'עמדה כללית בלבד', 'noplan': 'בלי תוכנית כוללת בסוגיה', 'notfound': 'לא נמצאה עמדה',
           'offaxis': 'עמדה על שאלה אחרת מזו שבסולם', 'noposition': 'בלי עמדה על השאלה שבמחלוקת'}

# ---- declared constraints: only explicit "will not sit with <named list / named leader>" are mapped -----------
LEADER = {l['id']: l.get('leader', '') for l in P['lists']}
# Declared refusals. Two sources, both shown verbatim with the list they touch:
#  1. DECL: the "גוש / שותפויות מוצהרות" field of the list profile (platforms.json). Mapped when it names a list,
#     a list's leader, or one of the two groups defined in GROUPS below; anything needing inference
#     (e.g. "parties that support the draft exemption") is shown without mapping.
#  2. DECL_SRC: explicit, unconditional campaign statements by the list's leader that name another list or its
#     leader (or a GROUPS group), each with date + source URL. Conditional statements ("only if they accept …")
#     are not included. Not a complete record: the UI says so.
# Same rule for every list. Tuple: (verbatim text, refused ids, via) – via = ('list', leader) / ('group', key) / None.
GROUPS = {'arab': (['joint', 'raam'], 'מפלגות ערביות = הרשימה המשותפת ורע"ם, לפי סיווג הגושים באתר'),
          'haredi': (['shas', 'utj'], 'מפלגות חרדיות = ש"ס ויהדות התורה')}
DECL = {
 'yashar': [('איזנקוט הצהיר שלא ישב עם סמוטריץ\'', ['rzz'], ('list', 'rzz', 'בצלאל סמוטריץ\''))],
 'yb': [('שולל קואליציה עם ש"ס ויהדות התורה', ['shas', 'utj'], None),
        ('ועם מפלגות ערביות', ['joint', 'raam'], ('group', 'arab'))],
 'miluim': [('בלי מפלגות חרדיות', ['shas', 'utj'], ('group', 'haredi')),
            ('או ערביות', ['joint', 'raam'], ('group', 'arab'))],
 'amcha': [('שוללת ממשלה עם איזנקוט', ['yashar'], ('list', 'yashar', 'גדי איזנקוט'))],
}
DECL_SRC = [
 dict(by='yb', date='2026-10-15', who='אביגדור ליברמן',
      quote='בלי רע״מ, בלי המשותפת, בלי ש״ס ובלי יהדות התורה. הליכוד בלי נתניהו יכול להיות שותף משמעותי. עם נתניהו - שיתהפך העולם לא נשב בשום מצב.',
      refs=[(['raam', 'joint', 'shas', 'utj'], None), (['likud'], ('list', 'likud', 'בנימין נתניהו'))],
      src=('ישראל היום, 15.10.2026 (ציוץ ליברמן)', 'https://www.israelhayom.co.il/news/politics/article/21633398')),
 dict(by='yashar', date='2026-10-21', who='גדי איזנקוט',
      quote='לא אשב תחת נתניהו, גם לא ברוטציה. אם זה קורה – אני אתפטר תוך שעה',
      refs=[(['likud'], ('list', 'likud', 'בנימין נתניהו'))],
      src=('ישראל היום, 21.10.2026 (ראיון ב-103FM)', 'https://www.israelhayom.co.il/news/politics/article/21675460')),
 dict(by='beyachad', date='2026-10-11', who='נפתלי בנט',
      quote='נתניהו נושא באחריות ישירה ואישית לטבח 7 באוקטובר ולכן עליו ללכת הביתה. לא נשב איתו בשום קונסטלציה.',
      refs=[(['likud'], ('list', 'likud', 'בנימין נתניהו'))],
      src=('ynet, 11.10.2026 (פוסט של בנט)', 'https://www.ynet.co.il/news/article/hyhofwyomx')),
 dict(by='dems', date='2026-10-15', who='יאיר גולן',
      quote='אנחנו לא נשב עם נתניהו, לא עם הליכוד ולא עם אף מפלגה מקואליציית החורבן',
      refs=[(['likud'], None)],
      src=('News1, 15.10.2026', 'https://www.news1.co.il/Archive/001-D-525182-00.html')),
 dict(by='miluim', date='2026-10-13', who='יועז הנדל',
      quote='אני לא אשב עם מפלגות חרדיות וגם לא אשב עם מפלגות ערביות',
      refs=[(['shas', 'utj'], ('group', 'haredi')), (['joint', 'raam'], ('group', 'arab'))],
      src=('ynet, 13.10.2026 (ועידת "האנשים של המדינה")', 'https://www.ynet.co.il/news/elections2026/article/sywy11bjize')),
]

def seg_text(s):
    return ((s.get('label') or '') + ' ' + (s.get('who') or '')).strip()

out_issues = []
camps_by_issue = {c['issue']: c for c in A['camps']}
issue_meta = {i['id']: i for i in P['issues']}
for spec in ISSUES:
    iid = spec['id']
    c = camps_by_issue.get(iid)
    if not c:
        errors.append('no camps for ' + iid); continue
    segs = c['segments']
    labels = [s.get('label') for s in segs]
    camp_seg = []
    for k, lab in enumerate(spec['camps']):
        if k in spec.get('campRefs', {}):
            ref = spec['campRefs'][k]
            hit = [s for s in segs if ref in seg_text(s)]
        else:
            hit = [s for s in segs if s.get('label') == lab]
        if not hit: errors.append('%s: camp not found: %s' % (iid, lab)); camp_seg.append(None)
        else: camp_seg.append(hit[0])
    lists = {}
    for lid, (cs, ev) in spec['code'].items():
        evs = ev if isinstance(ev, list) else [ev] * len(cs)
        if len(evs) != len(cs): errors.append('%s/%s: evidence count != camp count' % (iid, lid))
        for k, ev in zip(cs, evs):
            s = camp_seg[k] if k < len(camp_seg) else None
            if s is None: continue
            pool = [s] + [x for x in segs if not x.get('label')]
            if not any(ev in seg_text(x) for x in pool):
                errors.append('%s/%s: evidence not found in camp "%s": %s' % (iid, lid, spec['camps'][k], ev))
        pos = P['positions'][lid][iid]
        lists[lid] = {'camps': cs, 'ev': list(dict.fromkeys(evs)), 'star': bool(pos.get('star'))}
        if spec.get('decisions', {}).get(lid): lists[lid]['decision'] = spec['decisions'][lid]
    unc = {}
    for lid, (why, ev) in spec.get('U', {}).items():
        if not any(ev in seg_text(x) for x in segs):
            errors.append('%s/%s: uncoded evidence not found: %s' % (iid, lid, ev))
        unc[lid] = {'reason': why, 'ev': ev, 'star': bool(P['positions'][lid][iid].get('star')),
                    'notFound': bool(P['positions'][lid][iid].get('notFound'))}
    missing = [l for l in LISTS if l not in lists and l not in unc]
    both = [l for l in LISTS if l in lists and l in unc]
    if missing: errors.append('%s: lists not accounted for: %s' % (iid, missing))
    if both: errors.append('%s: lists both coded and uncoded: %s' % (iid, both))
    for lid, u in unc.items():
        if P['positions'][lid][iid].get('notFound') and u['reason'] != 'notfound':
            errors.append('%s/%s: platforms.json says notFound but coded as %s' % (iid, lid, u['reason']))
    for lid in lists:
        if P['positions'][lid][iid].get('notFound'):
            errors.append('%s/%s: coded although platforms.json says notFound' % (iid, lid))
    # basis quote
    bsec, blabel, bquote = spec['basis']
    if bsec == 'camps':
        ok = bquote in c.get('text', '') or any(bquote in seg_text(s) for s in segs) or any(bquote in x.get('text', '') for x in A.get('principleVsDegree', []))
    elif bsec == 'crossAxis':
        ok = any(bquote in (x.get('label', '') + x.get('text', '')) for x in A.get('crossAxis', []))
    else:
        ok = any(x['label'].startswith(blabel) and bquote in x['text'] for x in A.get(bsec, []))
    if not ok: errors.append('%s: basis quote not found (%s): %s' % (iid, bsec, bquote))
    cons = None
    if spec.get('consensus'):
        sec, lab, members, ev = spec['consensus']
        hit = [x for x in A.get(sec, []) if x['label'] == lab]
        if not hit or ev not in hit[0]['text']: errors.append('%s: consensus not found: %s' % (iid, lab))
        cons = {'label': lab, 'members': members, 'ev': ev}
    out_issues.append({'id': iid, 'title': issue_meta[iid]['title'], 'short': issue_meta[iid].get('short', ''),
                       'scale': spec['scale'], 'basis': bquote, 'scope': spec['scope'], 'camps': spec['camps'],
                       'consensus': cons, 'lists': lists, 'uncoded': unc})

def via_obj(via, lid):
    if not via: return None
    if via[0] == 'list':
        if via[2] not in LEADER.get(via[1], ''): errors.append('declared %s: leader mapping not found: %s' % (lid, via))
        return {'list': via[1], 'leader': via[2]}
    if via[0] == 'group':
        if via[1] not in GROUPS: errors.append('declared %s: unknown group %s' % (lid, via[1]))
        return {'group': via[1], 'note': GROUPS[via[1]][1]}
    errors.append('declared %s: bad via %s' % (lid, via))

ID_SET = set(l['id'] for l in P['lists'])
decl = {}
for l in P['lists']:
    text = l.get('declaredBloc', '') or ''
    items = []
    for ev, refuses, via in DECL.get(l['id'], []):
        if ev not in text: errors.append('declared %s: text not found: %s' % (l['id'], ev))
        if via and via[0] == 'group' and sorted(refuses) != sorted(GROUPS[via[1]][0]): errors.append('declared %s: group ids mismatch' % l['id'])
        items.append({'ev': ev, 'refuses': refuses, 'via': via_obj(via, l['id'])})
    decl[l['id']] = {'text': text, 'refuses': items, 'statements': []}
for d in DECL_SRC:
    if d['by'] not in decl: errors.append('declared statement: unknown list ' + d['by']); continue
    if d['who'] not in LEADER.get(d['by'], ''): errors.append('declared statement %s: speaker is not the list leader: %s' % (d['by'], d['who']))
    refs = []
    for ids, via in d['refs']:
        if not set(ids) <= ID_SET or d['by'] in ids: errors.append('declared statement %s: bad ids %s' % (d['by'], ids))
        if via and via[0] == 'group' and sorted(ids) != sorted(GROUPS[via[1]][0]): errors.append('declared statement %s: group ids mismatch' % d['by'])
        refs.append({'refuses': ids, 'via': via_obj(via, d['by'])})
    decl[d['by']]['statements'].append({'who': d['who'], 'date': d['date'], 'quote': d['quote'], 'refs': refs,
                                        'src': {'title': d['src'][0], 'url': d['src'][1]}})

avg = POLLS.get('computed', {}).get('average', {})
for lid in LISTS:
    if lid not in avg: errors.append('polls.json computed.average has no estimate for ' + lid)

if errors:
    print('build_coalition: ERROR – coalition.json NOT updated (review the coding by hand):', file=sys.stderr)
    for e in errors: print('  - ' + e, file=sys.stderr)
    sys.exit(1)

out = {'note': 'Generated by tools/build_coalition.py from analysis.json + platforms.json. Do not edit by hand.',
       'generatedFrom': {'analysis': A.get('meta', {}).get('updated') or '', 'platforms': P.get('meta', {}).get('updated') or ''},
       'reasons': REASONS, 'starWeight': 0.5, 'issues': out_issues, 'declared': decl}
path = os.path.join(ROOT, 'data', 'coalition.json')
json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
n_coded = sum(len(i['lists']) for i in out_issues); n_unc = sum(len(i['uncoded']) for i in out_issues)
print('ok: coalition.json – issues %d, coded cells %d, uncoded %d' % (len(out_issues), n_coded, n_unc))
