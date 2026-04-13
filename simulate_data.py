"""
Simulation data generator.
Produces realistic aggregate data for Balkan media discourse analysis.
All data is topic-aggregate — no individual user tracking or profiling.
"""

import uuid
import random
import math
from datetime import datetime, timedelta, date
import duckdb
from database import initialize_database, get_connection, DB_PATH


# ─── SOURCE REGISTRY ──────────────────────────────────────────────────────────

SOURCES = [
    ("src_01", "Nezavisne Novine",       "news",   "Republika Srpska"),
    ("src_02", "Glas Srpske",            "news",   "Republika Srpska"),
    ("src_03", "RTRS Portal",            "news",   "Republika Srpska"),
    ("src_04", "Klix.ba",                "portal", "BiH"),
    ("src_05", "Vijesti.ba",             "portal", "BiH"),
    ("src_06", "N1 Info BiH",            "news",   "BiH"),
    ("src_07", "Slobodna Bosna",         "news",   "BiH"),
    ("src_08", "Forum Republika",        "forum",  "Republika Srpska"),
    ("src_09", "Diskusija.ba",           "forum",  "BiH"),
    ("src_10", "Hayat Portal",           "portal", "FBiH"),
]

# ─── TOPIC REGISTRY ──────────────────────────────────────────────────────────

TOPICS = [
    ("top_econ",  "Ekonomska Nestabilnost",    "ekonomija",    "#E05C5C",
     "Inflacija, plate, cijena energije i životni standard"),
    ("top_poli",  "Politička Polarizacija",    "politika",     "#5C8EE0",
     "Međuentitetski odnosi, institucije, stranački sukobi"),
    ("top_euro",  "EU Integracije",            "eu-put",       "#5CE09C",
     "Perspektiva europskih integracija, usklađivanje zakona"),
    ("top_dijk",  "Dijaspora i Odljev Mozgova","dijaspora",    "#E0B45C",
     "Emigracija mladih, povratak dijaspore, demografija"),
    ("top_infra", "Infrastruktura i Razvoj",   "infrastruktura","#A05CE0",
     "Putevi, autoceste, energetska infrastruktura"),
    ("top_korr",  "Korupcija i Vladavina Prava","korupcija",   "#E07A5C",
     "Procesuiranje korupcije, nezavisnost sudstva"),
    ("top_medi",  "Medijska Sloboda",          "mediji",       "#5CD4E0",
     "Pritisci na novinare, vlasništvo medija, cenzura"),
    ("top_etno",  "Etnopolitički Narativ",     "etnopolitika", "#C05CE0",
     "Identitetska politika, historijski revizionizam"),
    ("top_ener",  "Energetska Politika",       "energija",     "#E0D45C",
     "Struja, plin, obnovljivi izvori, ruska energija"),
    ("top_soci",  "Socijalna Prava",           "socijala",     "#5CE0B4",
     "Zdravstvo, penzije, socijalna zaštita"),
]

TOPIC_IDS = [t[0] for t in TOPICS]

# ─── REALISTIC TEXT SAMPLES (Serbian/Bosnian Ijekavica) ──────────────────────

TEXT_SAMPLES_BY_TOPIC = {
    "top_econ": [
        "Cijene u prodavnicama su porasle za skoro 30% u posljednjih godinu dana. Plate ostaju iste, a životni troškovi rastu svakim danom.",
        "Inflacija je pojela sve uštedine. Prosječna porodica ne može više da priušti normalan život od jedne plate.",
        "Energetska kriza direktno utiče na industriju. Mnoga mala preduzeća razmišljaju o zatvaranju zbog visokih troškova struje.",
        "Minimalna plata u Republici Srpskoj i dalje ne prati rast cijena. Radnici zahtijevaju hitno povećanje.",
        "Uvoz je porastao, domaća proizvodnja stagnira. Ekonomska politika mora se hitno revidirati.",
        "Mladi nemaju perspektivu ovdje. Ko može, odlazi u Njemačku ili Sloveniju gdje su plate tri puta veće.",
        "Stambeni krediti su sada dostupni samo privilegovanima. Kamatne stope su porasle, a plate nisu.",
        "Maloprodajni sektor bilježi pad. Kupovna moć građana se smanjuje iz kvartala u kvartal.",
    ],
    "top_poli": [
        "Institucije Bosne i Hercegovine su u potpunoj blokadi. Nijedna strana nije voljna na kompromis.",
        "Prijedorski slučaj pokazuje koliko su duboke podjele u političkom sistemu ove zemlje.",
        "Entitetsko glasanje blokira svaki napredak u parlamentu. Reforma izbornog zakona je neophodna.",
        "Vladajuće stranke koriste etničku retoriku da bi odvratile pažnju od ekonomskih problema.",
        "Opozicija nema koherentnu alternativu. Bez ozbiljnih reformi unutar stranaka, ne možemo očekivati promjenu.",
        "Politička scena u RS-u postaje sve homogenija. Glasovi kritike se marginalizuju.",
        "Međunarodna zajednica gubi strpljenje sa lokalnim političarima koji sabotiraju napredak.",
        "Dodik i vlast u Sarajevu igraju istu igru — blokadom sistema obje strane profitiraju.",
    ],
    "top_euro": [
        "Kandidatski status je važan korak, ali bez implementacije reformi ostaje prazna simbolika.",
        "EU integracije znače vladavinu prava, borbu protiv korupcije i slobodu medija — to je prava vrijednost.",
        "Mladi gledaju prema Evropi ne iz romantičnih razloga, nego jer žele normalan život.",
        "Usklađivanje zakonodavstva sa EU normama je jedini put ka ekonomskom oporavku.",
        "Europska unija mora biti jasna u zahtjevima. Dvostruki standardi samo jačaju euroskeptike.",
        "Bez vizne liberalizacije i slobode kretanja, EU perspektiva ostaje apstraktna za prosječnog građanina.",
        "Izvještaj EK jasno pokazuje gdje smo: korupcija, zavisnost sudstva i sloboda medija — sve loše ocjene.",
        "Ako Srbija ubrzava EU put, BiH ostaje sve više na margini. To je politički i ekonomski poraz.",
    ],
    "top_dijk": [
        "Svake godine 20.000 mladih napusti BiH. Za deset godina, ko će raditi u bolnicama i školama?",
        "Dijaspora šalje novac kući, ali ne može zamijeniti institucije koje ne funkcionišu.",
        "Program povratka dijaspore je na papiru. U praksi, nema ni posla ni kuće ni perspektive za povratnike.",
        "Demografska katastrofa se odvija pred našim očima, a vlada govori o statistici, ne o uzrocima.",
        "Ljekari, inženjeri, IT stručnjaci — svi odlaze. Ostaju samo oni koji ne mogu otići.",
        "Moja sestra je doktor medicine, radi u Beču. Kaže da ne planira povratak sve dok se ništa ne promijeni.",
        "Odljev mozgova je simptom, ne uzrok. Uzrok je nefunkcionalna država i sveprisutna korupcija.",
        "Mlada generacija glasuje nogama. To je najjasnije glasanje o stanju u ovoj zemlji.",
    ],
    "top_infra": [
        "Autoput Banja Luka — Zagreb je geopolitički i ekonomski prioritet za čitav region.",
        "Energetska infrastruktura je zastarjela. Investicije u obnovljive izvore su kasne deceniju.",
        "Putevi u ruralnim područjima su u katastrofalnom stanju. Lokalne zajednice su izolovane.",
        "Projekt Koridora 5c je primjer kako se može raditi — kada postoji politička volja i EU novac.",
        "Digitalna infrastruktura zaostaje. Brzi internet u manjim gradovima je luksuz, ne standard.",
        "Vodni sistemi su zastarjeli u cijeloj regiji. Gubici vode su enormni, a investicija nema.",
        "Tuzlanska termoelektrana mora biti modernizovana ili zatvorena. To je i ekološki i ekonomski imperativ.",
        "Željeznica u BiH je relikt prošlosti. Vozovi voze sporije nego prije 50 godina.",
    ],
    "top_korr": [
        "Tužilaštvo BiH je pokrenulo istragu, ali optužnice nikada ne dolaze. Ko štiti ove ljude?",
        "Javne nabavke su u sjenokradu stranaka. Svaki tendar je politički dogovor.",
        "Antikorupcijske agencije nemaju ni resurse ni nezavisnost da rade posao.",
        "Sudstvo je taoc politike. Dok sudije imenuju stranke, nema vladavine prava.",
        "GRECO izvještaj je jasan: BiH ne implementira ni minimalne preporuke za borbu protiv korupcije.",
        "Carinska uprava je hronično korumpirana. To koštata ekonomiju stotine miliona KM godišnje.",
        "Kada bogataš koji je opljačkao firmu šeta slobodan, a radnik koji je ukrao hleb ide u zatvor — to je simptom sistema.",
        "Lokalni nivo vlasti je najkorumpiraniji. Ondje nema medija, nema kontrole, nema odgovornosti.",
    ],
    "top_medi": [
        "RTRS je državna televizija koja funkcioniše kao strančički megafon. To nije javni servis.",
        "Novinari koji istražuju korupciju dobijaju prijetnje. Nema sistemske zaštite zviždača.",
        "Koncentracija medijskog vlasništva je alarmantan trend. Nekoliko tajkuna kontroliše informacijski prostor.",
        "Internet portali rastu jer tradicionalni mediji gube povjerenje. Ali i portali su često stranački.",
        "RSE i N1 ostaju relevantni jer su nezavisni od lokalnih vlasničkih struktura.",
        "Medijska pismenost je niska. Dezinformacije se šire brže nego ispravke.",
        "Novinarstvo u manjim gradovima je skoro nestalo. Lokalna vlast radi u informativnom vakuumu.",
        "Presscut i sličine baze pokazuju: 70% medijskog sadržaja potiče od svega pet vlasnika.",
    ],
    "top_etno": [
        "Historijski narativ se instrumentalizuje pred svake izbore. To je stara igra nove generacije političara.",
        "Mladi sve manje prihvataju etnička određenja kao primarni identitet. Generacijski pomak je vidljiv.",
        "Komemoracije postaju politička scena umjesto mjesta sjećanja. To vrijeđa i žrtve i preživjele.",
        "Revizionizam u udžbenicima je sistemski problem. Djeca uče tri različite historije iste ratne prošlosti.",
        "Dijaloški procesi postoje na papiru. U praksi, lideri nemaju interes za pomirenje koje smanjuje njihovu bazu.",
        "Transnacionalni identiteti rastu — bošnjaštvo, srpstvo, bosanstvo — sve su labave kategorije za mlađu generaciju.",
        "Miloradovićeva retorika o secesiji je legalna prijetnja ustavu i miru. Međunarodna zajednica reaguje prekasno.",
        "Rat nije bio etički simetričan. Faktografija postoji. Problem je politička volja da se prizna.",
    ],
    "top_ener": [
        "Uvozna zavisnost od ruskog gasa je strateška ranjivost koja se mora adresirati.",
        "Solarna energija u BiH je drastično podiskorišćena. Potencijal je ogroman, investicija nema.",
        "Toplifikacija Banje Luke je ovisna o gasu. Zimska kriza 2022. pokazala je koliko smo ranjivi.",
        "Hidroenergija je lokalni adut, ali ekološke implikacije izgradnje malih HE su zanemarivane.",
        "Ugalj i lignit su politička tema, ne samo energetska. Zatvaranje rudnika znači socijalna trvenja.",
        "Regionalna energetska berza (SEEPEX) je korak naprijed, ali integracija traje predugo.",
        "Prosječni domaćinstvo troši 30% budžeta na energiju. To je neodrživo na dugi rok.",
        "Zelena tranzicija nije ideološki izbor — to je ekonomski imperativ ako hoćemo EU tržišta.",
    ],
    "top_soci": [
        "Zdravstveni sistem je pred kolapsom. Čekanje na operaciju traje godinama, a privatne klinike su skupe.",
        "Penzioneri sa 600 KM penzije ne mogu da plate kiriju i lijek. Sistem je nepravedan.",
        "Dječiji dodaci nisu usklađeni sa inflacijom od 2018. godine. Porodice s djecom su na udaru.",
        "Javne škole nemaju ni osnovna nastavna sredstva. Roditelji finansiraju ono što država treba da obezbijedi.",
        "Čekaonice u domovima zdravlja su pokazatelj sistema koji je kolapsirao. Reforme su urgentne.",
        "Socijalna zaštita mora biti pravo, ne milost. Sada zavisi od stranačke podobnosti u opštini.",
        "Mladi s invaliditetom nemaju pristup radnom tržištu zbog nedostatka podrške i infrastrukture.",
        "Stopa siromaštva raste. Pričamo o ekonomskom rastu, a zanemarujemo distribuciju tog rasta.",
    ],
}

EMOTIONS = ["frustracija", "nada", "ljutnja", "strah", "cinizam", "optimizam", "rezignacija", "indignacija"]

KEYWORDS_BY_TOPIC = {
    "top_econ":  ["inflacija", "plate", "cijene", "životni_standard", "energija", "kriza", "uvoz"],
    "top_poli":  ["blokada", "institucije", "reforme", "izbori", "stranke", "kompromis", "polarizacija"],
    "top_euro":  ["EU", "integracije", "reforme", "kandidatski_status", "vladavina_prava", "usklađivanje"],
    "top_dijk":  ["dijaspora", "emigracija", "odljev_mozgova", "mladi", "povratak", "demografija"],
    "top_infra": ["autoput", "putevi", "energetika", "digitalizacija", "investicije", "razvoj"],
    "top_korr":  ["korupcija", "sudstvo", "tužilaštvo", "nabavke", "odgovornost", "vladavina_prava"],
    "top_medi":  ["mediji", "novinarstvo", "cenzura", "dezinformacije", "vlasništvo", "sloboda"],
    "top_etno":  ["identitet", "historija", "pomirenje", "narativ", "revizionizam", "dijalog"],
    "top_ener":  ["gas", "struja", "solarna", "ugalj", "tranzicija", "obnovljivi", "hidroenergija"],
    "top_soci":  ["zdravstvo", "penzije", "obrazovanje", "siromaštvo", "socijalna_zaštita", "reforma"],
}


def random_id():
    return str(uuid.uuid4())


def generate_sentiment_curve(days: int, base: float, volatility: float, trend: float, events: list) -> list:
    """Generate a realistic time-series sentiment curve with events injected."""
    scores = []
    current = base
    for i in range(days):
        # Trend drift
        current += trend * 0.002
        # Random walk
        current += random.gauss(0, volatility * 0.05)
        # Event spikes
        for ev_day, ev_magnitude in events:
            distance = abs(i - ev_day)
            if distance < 14:
                decay = math.exp(-distance / 4)
                current += ev_magnitude * decay * 0.3
        # Clamp
        current = max(-0.95, min(0.95, current))
        scores.append(round(current, 4))
    return scores


def populate_database():
    initialize_database()
    con = get_connection()

    print("[SIM] Inserting sources...")
    for src in SOURCES:
        con.execute("""
            INSERT OR REPLACE INTO sources (source_id, source_name, source_type, region)
            VALUES (?, ?, ?, ?)
        """, src)

    print("[SIM] Inserting topics...")
    for t in TOPICS:
        con.execute("""
            INSERT OR REPLACE INTO topics
                (topic_id, topic_label, topic_slug, description, color_hex)
            VALUES (?, ?, ?, ?, ?)
        """, t)

    # ─── GENERATE 180 DAYS OF TIME-SERIES DATA ────────────────────────────────

    end_date = date.today()
    start_date = end_date - timedelta(days=179)

    # Sentiment profiles: (base, volatility, trend, [(event_day, magnitude)])
    SENTIMENT_PROFILES = {
        "top_econ":  (-0.45, 0.15, -0.3, [(30, -0.4), (90, -0.3), (150, -0.25)]),
        "top_poli":  (-0.35, 0.20, -0.1, [(45, -0.5), (120, 0.2), (160, -0.3)]),
        "top_euro":  (0.15,  0.12,  0.2, [(60, 0.4), (130, 0.3)]),
        "top_dijk":  (-0.30, 0.10, -0.2, [(70, -0.3), (140, -0.2)]),
        "top_infra": (0.05,  0.15,  0.1, [(50, 0.3), (100, -0.2), (155, 0.35)]),
        "top_korr":  (-0.55, 0.18, -0.1, [(25, -0.5), (85, -0.4), (145, -0.3)]),
        "top_medi":  (-0.40, 0.14, -0.2, [(40, -0.4), (110, -0.35)]),
        "top_etno":  (-0.20, 0.25,  0.0, [(55, -0.6), (115, 0.1), (165, -0.4)]),
        "top_ener":  (-0.25, 0.20, -0.1, [(35, -0.5), (95, 0.2), (150, -0.3)]),
        "top_soci":  (-0.38, 0.13, -0.2, [(65, -0.4), (125, -0.3)]),
    }

    INTENSITY_PROFILES = {
        "top_econ":  (0.72, 0.10),
        "top_poli":  (0.68, 0.15),
        "top_euro":  (0.45, 0.12),
        "top_dijk":  (0.38, 0.08),
        "top_infra": (0.42, 0.09),
        "top_korr":  (0.55, 0.12),
        "top_medi":  (0.35, 0.08),
        "top_etno":  (0.50, 0.18),
        "top_ener":  (0.48, 0.14),
        "top_soci":  (0.52, 0.11),
    }

    print("[SIM] Generating 180-day sentiment time series...")
    snapshot_rows = []

    for topic_id, (base, vol, trend, events) in SENTIMENT_PROFILES.items():
        sentiments = generate_sentiment_curve(180, base, vol, trend, events)
        int_base, int_vol = INTENSITY_PROFILES[topic_id]

        for day_idx in range(180):
            current_date = start_date + timedelta(days=day_idx)
            sentiment = sentiments[day_idx]
            intensity = max(0.05, min(1.0, int_base + random.gauss(0, int_vol)))

            # Pick dominant emotion based on sentiment
            if sentiment < -0.5:
                emotion = random.choice(["ljutnja", "frustracija", "indignacija"])
            elif sentiment < -0.2:
                emotion = random.choice(["frustracija", "cinizam", "rezignacija"])
            elif sentiment < 0.1:
                emotion = random.choice(["cinizam", "rezignacija", "strah"])
            elif sentiment < 0.4:
                emotion = random.choice(["nada", "optimizam"])
            else:
                emotion = "optimizam"

            keywords = random.sample(KEYWORDS_BY_TOPIC[topic_id], min(4, len(KEYWORDS_BY_TOPIC[topic_id])))
            sample_count = int(intensity * 200 + random.randint(-20, 40))
            source_id = random.choice([s[0] for s in SOURCES])

            snapshot_rows.append((
                random_id(), topic_id, source_id, current_date,
                sentiment, intensity, sample_count, emotion, keywords
            ))

    con.executemany("""
        INSERT INTO sentiment_snapshots
            (snapshot_id, topic_id, source_id, snapshot_date,
             sentiment_score, intensity, sample_count, dominant_emotion, keywords)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, snapshot_rows)

    # ─── TOPIC RELATIONS ──────────────────────────────────────────────────────

    print("[SIM] Computing topic relations...")
    relations = [
        ("top_econ",  "top_dijk",  "co-occurs", 0.82),
        ("top_econ",  "top_soci",  "co-occurs", 0.75),
        ("top_econ",  "top_korr",  "co-occurs", 0.68),
        ("top_poli",  "top_etno",  "co-occurs", 0.79),
        ("top_poli",  "top_korr",  "co-occurs", 0.71),
        ("top_poli",  "top_medi",  "co-occurs", 0.65),
        ("top_euro",  "top_korr",  "opposes",   0.60),
        ("top_euro",  "top_poli",  "opposes",   0.55),
        ("top_euro",  "top_infra", "co-occurs", 0.72),
        ("top_ener",  "top_econ",  "precedes",  0.70),
        ("top_ener",  "top_infra", "co-occurs", 0.66),
        ("top_medi",  "top_etno",  "co-occurs", 0.58),
        ("top_medi",  "top_korr",  "co-occurs", 0.63),
        ("top_dijk",  "top_soci",  "co-occurs", 0.69),
        ("top_infra", "top_econ",  "co-occurs", 0.61),
    ]
    for a, b, rtype, strength in relations:
        con.execute("""
            INSERT INTO topic_relations
                (relation_id, topic_a_id, topic_b_id, relation_type, strength, observed_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (random_id(), a, b, rtype, strength, end_date))

    # ─── NARRATIVE EVENTS ─────────────────────────────────────────────────────

    print("[SIM] Inserting narrative events...")
    events = [
        (end_date - timedelta(days=160), "Povećanje cijena goriva za 18%",
         "spike", "top_econ", 0.85,
         "Iznenadni rast cijena goriva izazvao val reakcija i zahtjeva za regulacijom."),
        (end_date - timedelta(days=145), "Zakon o nepokretnoj imovini - inicijativa RS",
         "spike", "top_poli", 0.90,
         "Prijedlog zakona pokrenuo oštre reakcije u FBiH i međunarodnoj zajednici."),
        (end_date - timedelta(days=130), "BiH dobija kandidatski status za EU",
         "emergence", "top_euro", 0.95,
         "Historijski trenutak: EU odobrila kandidatski status — mediji u cijeloj regiji."),
        (end_date - timedelta(days=110), "Novi val emigracije — rekordni odlazak ljekara",
         "spike", "top_dijk", 0.78,
         "Statistike pokazuju rekordni odlazak medicinskog osoblja u zapadnu Evropu."),
        (end_date - timedelta(days=95), "Otvorena dionica autoputa Banja Luka—Doboj",
         "emergence", "top_infra", 0.72,
         "Infrastrukturni projekat završen uz veliku ceremoniju i medijsku pokrivenost."),
        (end_date - timedelta(days=75), "Hapšenje direktora javnog preduzeća - korupcija",
         "spike", "top_korr", 0.88,
         "Tužilaštvo podiglo optužnicu za zloupotrebu položaja i pranje novca."),
        (end_date - timedelta(days=58), "Napad na novinara istraživača",
         "spike", "top_medi", 0.80,
         "Fizički napad na novinara izazvao osudu međunarodnih organizacija za slobodu medija."),
        (end_date - timedelta(days=40), "Komemoracija—politički incident",
         "spike", "top_etno", 0.92,
         "Politički govori na komemoraciji izazvali diplomatske reakcije i medijsku buru."),
        (end_date - timedelta(days=25), "Winterska energetska kriza — nestanci struje",
         "spike", "top_ener", 0.87,
         "Višesat nestanci električne energije u više gradova pokrenuli raspravu o infrastrukturi."),
        (end_date - timedelta(days=12), "Protest penzionera ispred Skupštine",
         "spike", "top_soci", 0.75,
         "Hiljade penzionera protestovalo zahtijevajući usklađivanje penzija sa inflacijom."),
        (end_date - timedelta(days=5), "Novi IMF izvještaj: usporavanje rasta",
         "shift", "top_econ", 0.70,
         "IMF objavio procjenu: ekonomski rast usporava, inflacija ostaje visoka."),
    ]

    for ev_date, label, ev_type, topic_id, magnitude, desc in events:
        con.execute("""
            INSERT INTO narrative_events
                (event_id, event_date, event_label, event_type, topic_id, magnitude, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (random_id(), ev_date, label, ev_type, topic_id, magnitude, desc))

    # ─── TREND METRICS ────────────────────────────────────────────────────────

    print("[SIM] Computing trend metrics...")
    for topic_id in TOPIC_IDS:
        for days_ago in range(30):
            metric_date = end_date - timedelta(days=days_ago)
            velocity = random.gauss(0, 0.08)
            acceleration = random.gauss(0, 0.03)
            spread = random.uniform(0.3, 0.9)
            predicted = random.uniform(0.2, 0.8)
            con.execute("""
                INSERT INTO trend_metrics
                    (metric_id, topic_id, metric_date, velocity, acceleration,
                     cross_source_spread, predicted_intensity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (random_id(), topic_id, metric_date, velocity, acceleration, spread, predicted))

    con.close()
    print("[SIM] ✓ Database populated with 180 days of realistic simulation data.")


if __name__ == "__main__":
    populate_database()
