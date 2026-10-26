#!/usr/bin/env python3
"""Build data/exitpolls.json: TV exit polls (מדגמים) of the 21st-25th Knesset elections
vs. certified Central Elections Committee (CEC) results, with sources and metrics.

Source of truth = the tables in this file. Every seat figure inherits the sources of its
poll object (each poll lists >=1 source URL + retrieval date). Re-run:
    python3 tools/build_exitpolls.py   (writes data/exitpolls.json, prints metric summary)
Never delete rows; add. 2026 rows go in data/exitpolls.json -> y2026 (see NOTES.md).
"""
import json, os, datetime

RET = '2026-10-27'  # retrieval date of every source below
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'exitpolls.json')

def S(url, note=''):
    return {'url': url, 'retrieved': RET, 'note': note}

UZIT = 'https://www.uzit.co.il/inside_page_base.asp?categoryName={}&hebCategoryName=%D7%A1%D7%A7%D7%A8%D7%99%D7%9D'
WIKI = 'https://en.wikipedia.org/wiki/Opinion_polling_for_the_{}_Israeli_legislative_election'
LEAD = 'משמש כמוביל בלבד (ויקיפדיה), לא כמקור מאמת'

CAMPAIGNS = [
 {
  'id': '2019a', 'knesset': 21, 'date': '2019-04-09', 'label': 'אפריל 2019 (הכנסת ה-21)',
  'cec': S('https://votes21.bechirot.gov.il/nationalresults', 'תוצאות רשמיות של ועדת הבחירות המרכזית'),
  'lists': [  # id, Hebrew name, certified seats, % of valid votes (only where needed: near threshold)
    ('likud', 'הליכוד', 35, None), ('kl', 'כחול לבן', 35, None), ('shas', 'ש"ס', 8, None),
    ('utj', 'יהדות התורה', 8, None), ('ht', 'חד"ש-תע"ל', 6, None), ('labor', 'העבודה', 6, None),
    ('yb', 'ישראל ביתנו', 5, None), ('urwp', 'איחוד מפלגות הימין', 5, None), ('meretz', 'מרצ', 4, None),
    ('kulanu', 'כולנו', 4, None), ('rb', 'רע"מ-בל"ד', 4, 3.33), ('nr', 'הימין החדש', 0, 3.22),
    ('zehut', 'זהות', 0, 2.74), ('gesher', 'גשר', 0, 1.73)],
  'bloc': {'lists': ['likud', 'shas', 'utj', 'urwp', 'yb', 'kulanu'],
           'source': S('https://www.timesofisrael.com/president-officially-taps-netanyahu-to-form-next-government/',
                       'נתניהו קיבל המלצות של רשימות בנות 65 מושבים')},
  'polls': [
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '22:00', 'kind': 'initial',
    'seats': {'kl': 37, 'likud': 36, 'labor': 8, 'utj': 7, 'shas': 7, 'ht': 6, 'urwp': 5, 'kulanu': 5, 'meretz': 5, 'yb': 4},
    'sources': [S('https://news360.co.il/local/3999', 'פורסם 22:09'), S(UZIT.format('polls2019')),
                S(WIKI.format('April_2019'), LEAD)]},
   {'channel': 'c12', 'pollster': 'מדגם (מינה צמח ומנו גבע)', 'time': '22:00', 'kind': 'initial',
    'seats': {'kl': 37, 'likud': 33, 'utj': 7, 'ht': 6, 'rb': 6, 'labor': 6, 'shas': 6, 'meretz': 5, 'urwp': 5, 'yb': 5, 'kulanu': 4},
    'sources': [S('https://www.inn.co.il/news/398948', '22:01'), S('https://www.c14.co.il/article/223724'),
                S('https://news360.co.il/local/3999'), S(WIKI.format('April_2019'), LEAD)],
    'conflicts': [{'lists': ['ht', 'rb'], 'alt': {'ht': 7, 'rb': 5},
                   'sources': [S('https://www.maariv.co.il/elections2019/news/article-693573', 'מעריב 22:04: חד"ש-תע"ל 7, רע"מ-בל"ד 5'), S(UZIT.format('polls2019'))],
                   'note': 'ארבעה מקורות מוסרים 6 ו-6; מעריב ואתר עוזית מוסרים 7 ו-5. אין השפעה על מדדי הטעות: סכום הסטיות המוחלטות זהה (2) בשתי הגרסאות, וגם סכומי הגושים זהים.'}]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '22:00', 'kind': 'initial',
    'seats': {'kl': 36, 'likud': 36, 'labor': 7, 'shas': 7, 'ht': 7, 'utj': 7, 'urwp': 4, 'nr': 4, 'meretz': 4, 'kulanu': 4, 'yb': 4},
    'sources': [S('https://news360.co.il/local/3999'), S('https://www.maariv.co.il/elections2019/news/article-693573'),
                S(UZIT.format('polls2019')), S(WIKI.format('April_2019'), LEAD)]},
  ],
  'partial': [  # later updates found only as headline numbers (not used in list metrics)
   {'channels': ['c12', 'c13'], 'time': 'אחרי חצות', 'text': 'עדכוני ערוץ 12 וערוץ 13: הליכוד 35, כחול לבן 34, ש"ס 8, יהדות התורה 7; הימין החדש, זהות וגשר מתחת לאחוז החסימה. לפי אותו דיווח, גוש הימין 63 בערוץ 12 ו-65 בערוץ 13. פירוט מלא לכל רשימה לא נמצא.',
    'sources': [S('https://web.archive.org/web/20190413210901/https://www.timesofisrael.com/liveblog_entry/channel-12-exit-poll-has-gantz-leading-netanyahu-37-33/', 'Times of Israel, ארכיון')]}],
 },
 {
  'id': '2019b', 'knesset': 22, 'date': '2019-09-17', 'label': 'ספטמבר 2019 (הכנסת ה-22)',
  'cec': S('https://votes22.bechirot.gov.il/nationalresults', 'תוצאות רשמיות של ועדת הבחירות המרכזית'),
  'lists': [('kl', 'כחול לבן', 33, None), ('likud', 'הליכוד', 32, None), ('joint', 'הרשימה המשותפת', 13, None),
    ('shas', 'ש"ס', 9, None), ('yb', 'ישראל ביתנו', 8, None), ('utj', 'יהדות התורה', 7, None),
    ('yamina', 'ימינה', 7, None), ('lg', 'העבודה-גשר', 6, None), ('du', 'המחנה הדמוקרטי', 5, 4.34),
    ('otzma', 'עוצמה יהודית', 0, 1.88)],
  'bloc': {'lists': ['likud', 'shas', 'utj', 'yamina'],
           'source': S('https://www.jpost.com/Israel-News/Gantz-on-verge-of-getting-more-recommendations-602441', 'נתניהו 55 המלצות (הליכוד, ש"ס, יהדות התורה, ימינה)')},
  'polls': [
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 32, 'kl': 32, 'joint': 12, 'yb': 10, 'shas': 9, 'utj': 8, 'yamina': 7, 'du': 5, 'lg': 5},
    'sources': [S('https://www.timesofisrael.com/election-liveblog-september-17-2019/'), S(UZIT.format('polls2019_2')), S(WIKI.format('September_2019'), LEAD)]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '22:00', 'kind': 'initial',
    'seats': {'kl': 34, 'likud': 33, 'joint': 11, 'yb': 8, 'shas': 8, 'utj': 8, 'yamina': 8, 'lg': 5, 'du': 5},
    'sources': [S('https://www.timesofisrael.com/election-liveblog-september-17-2019/'), S(UZIT.format('polls2019_2')), S(WIKI.format('September_2019'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '22:00', 'kind': 'initial',
    'seats': {'kl': 33, 'likud': 31, 'joint': 13, 'shas': 9, 'yb': 8, 'utj': 8, 'yamina': 6, 'du': 6, 'lg': 6},
    'sources': [S('https://www.timesofisrael.com/election-liveblog-september-17-2019/'), S(UZIT.format('polls2019_2')), S(WIKI.format('September_2019'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '00:50', 'kind': 'update',
    'seats': {'kl': 32, 'likud': 30, 'joint': 15, 'shas': 9, 'yb': 8, 'utj': 8, 'yamina': 6, 'lg': 6, 'du': 6},
    'sources': [S(UZIT.format('polls2019_2'))], 'single': True},
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '01:30', 'kind': 'update',
    'seats': {'kl': 32, 'likud': 31, 'joint': 13, 'yb': 9, 'shas': 9, 'utj': 8, 'yamina': 7, 'lg': 6, 'du': 5},
    'sources': [S(UZIT.format('polls2019_2')), S('https://www.timesofisrael.com/election-liveblog-september-17-2019/')]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '02:10', 'kind': 'update',
    'seats': {'kl': 32, 'likud': 32, 'joint': 13, 'yb': 9, 'shas': 9, 'utj': 7, 'yamina': 7, 'lg': 6, 'du': 5},
    'sources': [S(UZIT.format('polls2019_2')), S('https://www.timesofisrael.com/updated-exit-polls-boost-center-left-joint-list-putting-likud-in-deeper-hole/', 'הכתבה מוסרת גוש של 54 ולא 55; ייתכן שמדובר בעדכון אחר')], 'single': True},
  ]},
 {
  'id': '2020', 'knesset': 23, 'date': '2020-03-02', 'label': 'מרץ 2020 (הכנסת ה-23)',
  'cec': S('https://votes23.bechirot.gov.il/nationalresults', 'תוצאות רשמיות של ועדת הבחירות המרכזית'),
  'lists': [('likud', 'הליכוד', 36, None), ('kl', 'כחול לבן', 33, None), ('joint', 'הרשימה המשותפת', 15, None),
    ('shas', 'ש"ס', 9, None), ('utj', 'יהדות התורה', 7, None), ('lgm', 'העבודה-גשר-מרצ', 7, None),
    ('yb', 'ישראל ביתנו', 7, None), ('yamina', 'ימינה', 6, 5.24)],
  'bloc': {'lists': ['likud', 'shas', 'utj', 'yamina'],
           'source': S('https://www.timesofisrael.com/with-libermans-nod-gantz-gets-61-backers-to-form-coalition-topping-netanyahu/', 'נתניהו 58 המלצות')},
  'polls': [
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 36, 'kl': 33, 'joint': 15, 'shas': 9, 'utj': 8, 'yamina': 7, 'lgm': 6, 'yb': 6},
    'sources': [S('https://www.emess.co.il/radio/595394'), S(UZIT.format('polls2020')), S(WIKI.format('2020'), LEAD)]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 37, 'kl': 33, 'joint': 14, 'shas': 9, 'lgm': 7, 'yamina': 7, 'utj': 7, 'yb': 6},
    'sources': [S('https://www.ynetnews.com/article/HkKqL1jVU'), S(UZIT.format('polls2020')), S(WIKI.format('2020'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 37, 'kl': 32, 'joint': 14, 'shas': 9, 'yb': 8, 'utj': 8, 'lgm': 6, 'yamina': 6},
    'sources': [S('https://13tv.co.il/item/news/politics/politics/voting-sample-1018501/'), S(WIKI.format('2020'), LEAD)],
    'conflicts': [{'lists': ['joint'], 'alt': {'joint': 15}, 'sources': [S(UZIT.format('polls2020'))],
                   'note': 'באתר עוזית מופיע 15 לרשימה המשותפת, אבל אז סכום העמודה 121. אתר חדשות 13 מוסר 14 (סכום 120).'}]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '00:50', 'kind': 'update',
    'seats': {'likud': 37, 'kl': 34, 'joint': 14, 'shas': 9, 'utj': 7, 'lgm': 7, 'yb': 6, 'yamina': 6},
    'sources': [S(UZIT.format('polls2020')), S('https://13tv.co.il/item/news/politics/politics/updated-sample-results-1018892/', 'כחול לבן 34, גוש 59')]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '01:10', 'kind': 'update',
    'seats': {'likud': 37, 'kl': 32, 'joint': 15, 'shas': 9, 'utj': 7, 'lgm': 7, 'yb': 7, 'yamina': 6},
    'sources': [S(UZIT.format('polls2020'))], 'single': True},
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '01:50', 'kind': 'update',
    'seats': {'likud': 36, 'kl': 33, 'joint': 15, 'shas': 9, 'utj': 8, 'lgm': 6, 'yb': 7, 'yamina': 6},
    'sources': [S(UZIT.format('polls2020'))], 'single': True},
  ]},
 {
  'id': '2021', 'knesset': 24, 'date': '2021-03-23', 'label': 'מרץ 2021 (הכנסת ה-24)',
  'cec': S('https://votes24.bechirot.gov.il/nationalresults', 'תוצאות רשמיות של ועדת הבחירות המרכזית'),
  'lists': [('likud', 'הליכוד', 30, None), ('ya', 'יש עתיד', 17, None), ('shas', 'ש"ס', 9, None),
    ('kl', 'כחול לבן', 8, None), ('yamina', 'ימינה', 7, None), ('labor', 'העבודה', 7, None),
    ('utj', 'יהדות התורה', 7, None), ('yb', 'ישראל ביתנו', 7, None), ('rz', 'הציונות הדתית', 6, None),
    ('joint', 'הרשימה המשותפת', 6, None), ('nh', 'תקווה חדשה', 6, None), ('meretz', 'מרצ', 6, None),
    ('raam', 'רע"מ', 4, 3.79)],
  'bloc': {'lists': ['likud', 'shas', 'utj', 'rz'],
           'source': S('https://www.timesofisrael.com/rivlin-reluctantly-taps-netanyahu-to-form-government-not-an-easy-moral-choice/', 'נתניהו 52 המלצות; ימינה (7) המליצה על בנט')},
  'polls': [
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 31, 'ya': 18, 'shas': 9, 'kl': 7, 'yamina': 7, 'utj': 7, 'yb': 7, 'labor': 7, 'joint': 8, 'meretz': 6, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S('https://en.globes.co.il/en/article-exit-polls-give-netanyahu-block-majority-1001365137'), S(UZIT.format('polls2021')), S(WIKI.format('2021'), LEAD)]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 31, 'ya': 18, 'shas': 9, 'kl': 7, 'yamina': 8, 'utj': 6, 'yb': 6, 'labor': 7, 'joint': 9, 'meretz': 6, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S('https://en.globes.co.il/en/article-exit-polls-give-netanyahu-block-majority-1001365137'), S(UZIT.format('polls2021')), S(WIKI.format('2021'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 33, 'ya': 16, 'shas': 8, 'kl': 8, 'yamina': 7, 'utj': 7, 'yb': 8, 'labor': 7, 'joint': 8, 'meretz': 7, 'rz': 6, 'nh': 5, 'raam': 0},
    'sources': [S('https://en.globes.co.il/en/article-exit-polls-give-netanyahu-block-majority-1001365137'), S(UZIT.format('polls2021')), S(WIKI.format('2021'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '23:00', 'kind': 'update',
    'seats': {'likud': 32, 'ya': 16, 'shas': 8, 'kl': 8, 'yamina': 7, 'utj': 7, 'yb': 8, 'labor': 7, 'joint': 8, 'meretz': 7, 'rz': 7, 'nh': 5, 'raam': 0},
    'sources': [S(UZIT.format('polls2021'))], 'single': True},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '24:00', 'kind': 'update',
    'seats': {'likud': 31, 'ya': 18, 'shas': 8, 'kl': 8, 'yamina': 8, 'utj': 6, 'yb': 5, 'labor': 7, 'joint': 9, 'meretz': 7, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S(UZIT.format('polls2021'))], 'single': True},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '00:45', 'kind': 'update',
    'seats': {'likud': 30, 'ya': 18, 'shas': 9, 'kl': 7, 'yamina': 7, 'utj': 6, 'yb': 6, 'labor': 7, 'joint': 10, 'meretz': 7, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S(UZIT.format('polls2021'))], 'single': True},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '01:00', 'kind': 'update',
    'seats': {'likud': 31, 'ya': 17, 'shas': 9, 'kl': 8, 'yamina': 7, 'utj': 7, 'yb': 7, 'labor': 7, 'joint': 8, 'meretz': 7, 'rz': 6, 'nh': 6, 'raam': 0},
    'sources': [S(UZIT.format('polls2021'))], 'single': True},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '01:15', 'kind': 'update',
    'seats': {'likud': 30, 'ya': 18, 'shas': 9, 'kl': 7, 'yamina': 7, 'utj': 6, 'yb': 7, 'labor': 8, 'joint': 9, 'meretz': 6, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S(UZIT.format('polls2021'))], 'single': True},
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '01:15', 'kind': 'update',
    'seats': {'likud': 30, 'ya': 18, 'shas': 9, 'kl': 8, 'yamina': 7, 'utj': 7, 'yb': 7, 'labor': 7, 'joint': 8, 'meretz': 6, 'rz': 7, 'nh': 6, 'raam': 0},
    'sources': [S(UZIT.format('polls2021')), S(WIKI.format('2021'), LEAD + '; מופיע שם כמדגם כאן')], 'single': True},
  ]},
 {
  'id': '2022', 'knesset': 25, 'date': '2022-11-01', 'label': 'נובמבר 2022 (הכנסת ה-25)',
  'cec': S('https://votes25.bechirot.gov.il/nationalresults', 'תוצאות רשמיות של ועדת הבחירות המרכזית'),
  'lists': [('likud', 'הליכוד', 32, None), ('ya', 'יש עתיד', 24, None), ('rz', 'הציונות הדתית', 14, None),
    ('nu', 'המחנה הממלכתי', 12, None), ('shas', 'ש"ס', 11, None), ('utj', 'יהדות התורה', 7, None),
    ('yb', 'ישראל ביתנו', 6, None), ('raam', 'רע"מ', 5, 4.07), ('ht', 'חד"ש-תע"ל', 5, 3.75),
    ('labor', 'העבודה', 4, 3.69), ('meretz', 'מרצ', 0, 3.16), ('balad', 'בל"ד', 0, 2.91), ('jh', 'הבית היהודי', 0, 1.19)],
  'bloc': {'lists': ['likud', 'rz', 'shas', 'utj'],
           'source': S('https://www.aljazeera.com/news/2022/11/11/netanyahu-mandated-to-form-new-israeli-government', 'נתניהו 64 המלצות')},
  'polls': [
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 30, 'ya': 22, 'rz': 15, 'nu': 13, 'shas': 10, 'utj': 7, 'yb': 5, 'labor': 5, 'raam': 5, 'meretz': 4, 'ht': 4},
    'sources': [S('https://elections.walla.co.il/item/3538090'), S('https://www.jdn.co.il/news/politics/1850443/'), S('https://hm-news.co.il/news-flash/320586/'), S(UZIT.format('polls2022'))]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 30, 'ya': 24, 'rz': 14, 'nu': 11, 'shas': 10, 'utj': 7, 'labor': 6, 'raam': 5, 'meretz': 5, 'yb': 4, 'ht': 4},
    'sources': [S(UZIT.format('polls2022')), S('https://www.jdn.co.il/news/politics/1850443/', 'הגרסה הראשונית משוחזרת מתיאור השינויים בכתבה (ישראל ביתנו +1 על חשבון מרצ; חד"ש +1 על חשבון העבודה)'), S(WIKI.format('2022'), LEAD)]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 31, 'ya': 24, 'rz': 14, 'nu': 12, 'shas': 10, 'utj': 7, 'labor': 5, 'raam': 5, 'yb': 4, 'meretz': 4, 'ht': 4},
    'sources': [S(UZIT.format('polls2022')), S('https://www.jdn.co.il/news/politics/1850443/', 'הגרסה הראשונית משוחזרת מתיאור השינויים בכתבה (בתחילת הערב יש עתיד 24, ישראל ביתנו 4)'), S(WIKI.format('2022'), LEAD)]},
   {'channel': 'c14', 'pollster': 'דיירקט פולס', 'time': '22:00', 'kind': 'initial',
    'seats': {'likud': 31, 'ya': 23, 'rz': 12, 'nu': 11, 'shas': 10, 'utj': 8, 'yb': 6, 'labor': 6, 'meretz': 5, 'ht': 4, 'raam': 4},
    'sources': [S('https://www.c14.co.il/article/709063'), S('https://elections.walla.co.il/item/3538090'), S('https://www.israelnationalnews.com/news/362084'), S(UZIT.format('polls2022'))]},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': 'עדכון ראשון (שעה לא צוינה)', 'kind': 'update',
    'seats': {'likud': 30, 'ya': 24, 'rz': 14, 'nu': 11, 'shas': 10, 'utj': 7, 'labor': 5, 'raam': 5, 'yb': 5, 'meretz': 4, 'ht': 5},
    'sources': [S('https://www.jdn.co.il/news/politics/1850443/')], 'single': True},
   {'channel': 'c12', 'pollster': 'מדגם', 'time': 'כ-02:00', 'kind': 'update',
    'seats': {'likud': 31, 'ya': 23, 'rz': 14, 'nu': 11, 'shas': 10, 'utj': 7, 'labor': 5, 'yb': 5, 'ht': 5, 'raam': 5, 'meretz': 4},
    'sources': [S('https://www.jdn.co.il/news/politics/1850443/'), S('https://www.israelnationalnews.com/news/362084', 'הכתבה עודכנה ב-05:06')]},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': 'עדכון ראשון (שעה לא צוינה)', 'kind': 'update',
    'seats': {'likud': 31, 'ya': 23, 'rz': 14, 'nu': 12, 'shas': 10, 'utj': 7, 'labor': 5, 'raam': 5, 'yb': 5, 'meretz': 4, 'ht': 4},
    'sources': [S('https://www.jdn.co.il/news/politics/1850443/')], 'single': True},
   {'channel': 'c13', 'pollster': 'קמיל פוקס', 'time': '01:00', 'kind': 'update',
    'seats': {'likud': 32, 'ya': 23, 'rz': 13, 'nu': 11, 'shas': 10, 'utj': 7, 'yb': 6, 'labor': 5, 'raam': 4, 'meretz': 4, 'ht': 5},
    'sources': [S('https://www.jdn.co.il/news/politics/1850443/'), S('https://www.israelnationalnews.com/news/362084'), S('https://elections.walla.co.il/item/3538090', 'מספר המושבים של ישראל ביתנו חסר בטקסט')]},
   {'channel': 'kan', 'pollster': 'קנטאר', 'time': 'עדכון (שעה לא צוינה)', 'kind': 'update',
    'seats': {'likud': 30, 'ya': 23, 'rz': 15, 'nu': 12, 'shas': 10, 'utj': 7, 'yb': 5, 'labor': 5, 'meretz': 4, 'raam': 5, 'ht': 4},
    'sources': [S('https://www.israelnationalnews.com/news/362084', 'הכתבה עודכנה ב-05:06')], 'single': True},
  ]},
]

CHANNELS = {'kan': 'כאן 11', 'c12': 'חדשות 12', 'c13': 'חדשות 13', 'c14': 'ערוץ 14'}
LARGE_MIN = 10  # rule: a list is "large" if its certified seats >= 10, else "small"

def metrics(lists, seats, bloc):
    act = {l[0]: l[2] for l in lists}
    diffs = {lid: seats.get(lid, 0) - act[lid] for lid in act}
    sabs = sum(abs(d) for d in diffs.values())
    big = [lid for lid in act if act[lid] >= LARGE_MIN]
    small = [lid for lid in act if act[lid] < LARGE_MIN]
    pb = sum(seats.get(x, 0) for x in bloc); ab = sum(act[x] for x in bloc)
    thr = [lid for lid in act if (seats.get(lid, 0) > 0) != (act[lid] > 0)]
    return {
        'diff': diffs, 'sumAbs': sabs, 'misallocated': sabs / 2,
        'within1': sum(1 for d in diffs.values() if abs(d) <= 1), 'n': len(diffs),
        'exact': sum(1 for d in diffs.values() if d == 0),
        'maeLarge': round(sum(abs(diffs[x]) for x in big) / len(big), 3),
        'maeSmall': round(sum(abs(diffs[x]) for x in small) / len(small), 3),
        'bloc': pb, 'blocActual': ab, 'blocErr': pb - ab, 'thresholdMisses': thr,
    }

def build():
    out = {'meta': {
        'title': 'מדגמי ערב הבחירות מול התוצאות הרשמיות, 2019–2022',
        'retrieved': RET, 'generated': datetime.date.today().isoformat(),
        'channels': CHANNELS, 'largeMin': LARGE_MIN,
        'rules': {
            'scope': 'מדגמי הטלוויזיה שפורסמו בשעה 22:00 בערב הבחירות לכנסות ה-21 עד ה-25 (כאן 11, חדשות 12, חדשות 13, ובנובמבר 2022 גם ערוץ 14). העדכונים שפורסמו במהלך הלילה מוצגים בנפרד ואינם נכללים במדדים הראשיים.',
            'absent': 'רשימה שלא הופיעה בפרסום של מדגם שסכומו 120 נרשמה כ-0 (לא עברה את אחוז החסימה לפי המדגם).',
            'lists': 'בטבלה מופיעות כל הרשימות שנכנסו לכנסת, וכן רשימות שלא נכנסו וקיבלו לפחות 1% מהקולות הכשרים.',
            'bloc': 'גוש = הרשימות שחבריהן המליצו לנשיא על בנימין נתניהו בסבב ההתייעצויות שאחרי אותן בחירות (כלל מכני, עם מקור לכל מערכת). אותו הרכב רשימות מוחל על המדגם ועל התוצאה.',
            'misallocated': 'מושבים שהוקצו לא נכון = חצי מסכום הסטיות המוחלטות בין המדגם לתוצאה (כל מושב שעודף לרשימה אחת חסר לאחרת, ולכן נספר פעמיים בסכום).',
            'large': 'רשימה "גדולה" = 10 מושבים או יותר בתוצאה הרשמית; אחרת "קטנה" (כולל רשימות שלא נכנסו).',
            'within1': 'שיעור התחזיות לרשימות בודדות שסטו לכל היותר במושב אחד מהתוצאה.',
        }},
        'campaigns': [], 'y2026': None}
    for c in CAMPAIGNS:
        lists = c['lists']; ids = [l[0] for l in lists]
        assert sum(l[2] for l in lists) == 120, c['id']
        polls = []
        for k, p in enumerate(c['polls']):
            assert set(p['seats']) <= set(ids), (c['id'], set(p['seats']) - set(ids))
            assert sum(p['seats'].values()) == 120, (c['id'], p['channel'], p['time'], sum(p['seats'].values()))
            assert p['sources'], 'every poll needs sources'
            full = {lid: p['seats'].get(lid, 0) for lid in ids}
            q = dict(p); q['seats'] = full
            q['id'] = c['id'] + '-' + p['channel'] + '-' + ('init' if p['kind'] == 'initial' else 'u%d' % k)
            q['status'] = 'single-source' if p.get('single') else ('conflict' if p.get('conflicts') else 'verified')
            q.pop('single', None)
            q['metrics'] = metrics(lists, full, c['bloc']['lists'])
            polls.append(q)
        bl = c['bloc']['lists']
        out['campaigns'].append({
            'id': c['id'], 'knesset': c['knesset'], 'date': c['date'], 'label': c['label'], 'threshold': 3.25,
            'cec': c['cec'],
            'lists': [{'id': l[0], 'name': l[1], 'seats': l[2], 'pct': l[3], 'inBloc': l[0] in bl} for l in lists],
            'bloc': dict(c['bloc'], seats=sum(l[2] for l in lists if l[0] in bl)),
            'polls': polls, 'partial': c.get('partial', [])})
    out['y2026'] = {
        'date': '2026-10-27', 'knesset': 26, 'label': 'אוקטובר 2026 (הכנסת ה-26)', 'threshold': 3.25,
        'status': 'awaiting', 'note': 'המדגמים יפורסמו לא לפני 22:00 ב-27.10.2026. השורות יתווספו כאן אחרי הפרסום, ולצדן התוצאות כשיפורסמו.',
        'lists': [], 'polls': [], 'results': None}
    # keep any 2026 rows already present (never delete)
    if os.path.exists(OUT):
        try:
            old = json.load(open(OUT, encoding='utf-8'))
            if old.get('y2026'): out['y2026'] = old['y2026']
        except Exception:
            pass
    # summary
    ini = [p for c in out['campaigns'] for p in c['polls'] if p['kind'] == 'initial']
    out['summary'] = {
        'nInitial': len(ini),
        'meanMisallocated': round(sum(p['metrics']['misallocated'] for p in ini) / len(ini), 3),
        'within1Share': round(sum(p['metrics']['within1'] for p in ini) / sum(p['metrics']['n'] for p in ini), 4),
        'byChannel': {}}
    for ch in CHANNELS:
        ps = [p for p in ini if p['channel'] == ch]
        out['summary']['byChannel'][ch] = {
            'n': len(ps), 'mean': round(sum(p['metrics']['misallocated'] for p in ps) / len(ps), 3),
            'min': min(p['metrics']['misallocated'] for p in ps), 'max': max(p['metrics']['misallocated'] for p in ps)}
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return out

if __name__ == '__main__':
    o = build()
    for c in o['campaigns']:
        for p in c['polls']:
            m = p['metrics']
            print(c['id'], p['channel'], p['time'], p['kind'][:4], 'mis', m['misallocated'], 'bloc', m['bloc'], '%+d' % m['blocErr'], 'w1', '%d/%d' % (m['within1'], m['n']), 'thr', m['thresholdMisses'], 'L/S', m['maeLarge'], m['maeSmall'])
    print(json.dumps(o['summary'], ensure_ascii=False))
