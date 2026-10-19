/* Minikurser i Økonomiskolen – korte forløb med trin, quiz og badges.
   Generel undervisning, ikke personlig rådgivning. Tal med årstal er markeret og kan ændre sig. */
const COURSE_TRACKS = [
  { id: 'grundlag', e: '🧱', name: 'Grundlag', desc: 'Budget, løn og gæld' },
  { id: 'livsfaser', e: '🧭', name: 'Livsfaser', desc: 'Bolig, studie, familie og arbejdsliv' },
  { id: 'invest', e: '📈', name: 'Investering & pension', desc: 'Få pengene til at arbejde' },
  { id: 'selvst', e: '🧾', name: 'Selvstændig', desc: 'Bijob, B-indkomst og egen virksomhed' },
  { id: 'hjem', e: '🏡', name: 'Hjem & hverdag', desc: 'Sikkerhed, bil, energi og børn' }
];
const COURSES = [
{ id: 'budget', track: 'grundlag', e: '🧮', t: 'Byg dit første budget', desc: 'Fra kaos til en plan på 10 minutter', badge: { e: '🧮', n: 'Budgetbygger' },
  app: ['#/budget', '🎯 Lav dit budget i appen'],
  steps: [
    { t: 'Hvorfor et budget?', b: 'Et budget er ikke et forbud – det er en plan for, hvad dine penge skal lave, <i>før</i> de er brugt. Det giver ro i maven, fordi du på forhånd ved, at regningerne er dækket, og at der er plads til både opsparing og sjov.', h: 'Et budget er en beslutning, ikke en straf.' },
    { t: 'Hvad kommer ind?', b: 'Start med din udbetalte løn – det beløb, der faktisk lander på kontoen efter skat og pension. Har du flere job eller en sideindkomst, så læg dem til. Svinger indtægten, så brug et forsigtigt gennemsnit af de seneste måneder.', h: 'Budgettér med udbetalt løn, ikke bruttoløn.' },
    { t: 'Faste udgifter', b: 'Skriv alle faste udgifter op: husleje, el, internet, forsikringer, transport, abonnementer og afdrag. Del årlige regninger med 12, så de også får en plads hver måned. Kig dit kontoudtog igennem for de abonnementer, du har glemt.', h: 'Årlige regninger ÷ 12 = månedens andel.' },
    { t: 'Betal dig selv først', b: 'Beslut et fast beløb til opsparing og overfør det automatisk lige efter lønningsdag. Byg først en buffer – mange bruger en tommelfingerregel om 1–3 måneders faste udgifter – så en uventet regning ikke ender på kreditkortet.', h: 'Opsparing først – forbrug af resten.' },
    { t: 'Rådighedsbeløb og opfølgning', b: 'Det, der er tilbage, er dit rådighedsbeløb til mad, tøj, fritid og alt det løse. Mange bruger 50/30/20 som en grov start: ca. 50 % til nødvendigheder, 30 % til ønsker og 20 % til opsparing/gæld. Tjek budgettet én gang om måneden og justér – et budget, du følger, er bedre end et perfekt, du ikke bruger.', h: 'Følg op hver måned – 10 minutter er nok.' }
  ],
  quiz: [
    { q: 'Hvilket beløb bør du som udgangspunkt budgettere ud fra?', o: ['Bruttoløn før skat', 'Udbetalt løn efter skat', 'Den løn, du håber at få næste år'], a: 1, x: 'Det er kun den udbetalte løn, du kan bruge. Bruttolønnen indeholder skat, AM-bidrag og pension.' },
    { q: 'Du betaler bilforsikring på 3.600 kr. én gang om året. Hvad skal stå i månedsbudgettet?', o: ['0 kr. – den betales jo kun én gang', '300 kr.', '3.600 kr.'], a: 1, x: '3.600 ÷ 12 = 300 kr. Sæt beløbet til side hver måned, så regningen ikke kommer bag på dig.' },
    { q: 'Hvad betyder "betal dig selv først"?', o: ['At købe noget til dig selv på lønningsdagen', 'At overføre opsparingen automatisk, lige når lønnen kommer', 'At betale regningerne sidst'], a: 1, x: 'Når opsparingen ryger først og automatisk, kræver det ingen viljestyrke resten af måneden.' },
    { q: 'Hvad er en buffer?', o: ['En opsparing til uforudsete udgifter', 'Et lån i banken', 'Et kreditkort med høj ramme'], a: 0, x: 'En buffer er dine egne penge til uventede regninger, så du undgår dyre lån.' }
  ] },
{ id: 'loenseddel', track: 'grundlag', e: '🧾', t: 'Forstå din lønseddel', desc: 'Fra bruttoløn til udbetalt – linje for linje', badge: { e: '🧾', n: 'Lønseddel-læser' },
  src: [['https://skat.dk/borger/loen-og-personalegoder', 'skat.dk: Løn']],
  steps: [
    { t: 'Fra brutto til netto', b: 'Lønsedlen følger næsten altid samme rækkefølge: <b>bruttoløn</b> → minus pension og ATP → minus <b>AM-bidrag</b> → minus <b>A-skat</b> → <b>udbetalt løn</b>. Forstår du den rækkefølge, kan du læse næsten enhver lønseddel.', h: 'Brutto → pension/ATP → AM-bidrag → A-skat → netto.' },
    { t: 'Pension og ATP', b: 'Har du en arbejdsmarkedspension, står din egen andel som et fradrag, og arbejdsgiverens andel står ofte også på sedlen. ATP er et lille fast bidrag til en livslang tillægspension. Begge dele er dine penge – de bliver bare sparet op til senere.', h: 'Arbejdsgiverens pensionsbidrag er en del af din løn.' },
    { t: 'AM-bidrag', b: 'Arbejdsmarkedsbidraget er 8 % (2026) og trækkes, før der beregnes A-skat. Fra 2026 betaler man først AM-bidrag fra det år, man fylder 18. AM-bidraget kan ikke trækkes fra.', h: 'AM-bidrag: 8 % (2026, skat.dk).' },
    { t: 'Skattekort og fradrag', b: 'Dit <b>hovedkort</b> bruges hos din hovedarbejdsgiver og indeholder dit personfradrag og andre fradrag. Har du flere job, bruges <b>bikort</b> hos de andre – her er der ingen fradrag, så skatten pr. krone er højere. Tallene kommer fra din forskudsopgørelse på skat.dk.', h: 'Hovedkortet skal ligge, hvor du tjener mest.' },
    { t: 'Ferie og tjek af sedlen', b: 'Efter ferieloven optjener du 2,08 feriedage pr. måned. Funktionærer holder typisk ferie med løn og får et ferietillæg, mens andre får feriepenge (12,5 %) indbetalt. Tjek hver måned: timer, sats, tillæg og skatteprocent – fejl opdages hurtigst, når du kigger med det samme.', h: 'Gem dine lønsedler – de er dokumentation.' }
  ],
  quiz: [
    { q: 'Hvad trækkes først fra din bruttoløn?', o: ['A-skat', 'Pension og ATP', 'Kirkeskat'], a: 1, x: 'Din egen pension og ATP trækkes typisk før AM-bidrag og A-skat.' },
    { q: 'Hvor stor er AM-bidraget i 2026?', o: ['8 %', '12 %', '37 %'], a: 0, x: 'AM-bidraget er 8 % (skat.dk, 2026).' },
    { q: 'Hvad er forskellen på hovedkort og bikort?', o: ['Der er ingen forskel', 'Hovedkortet har dine fradrag, bikortet har ingen', 'Bikortet giver lavere skat'], a: 1, x: 'Bikort har ingen fradrag. Derfor skal hovedkortet bruges, hvor du tjener mest.' },
    { q: 'Hvor mange feriedage optjener du pr. måned efter ferieloven?', o: ['1,5', '2,08', '3'], a: 1, x: '2,08 dage pr. måned svarer til 25 feriedage om året.' }
  ] },
{ id: 'gaeldsfri', track: 'grundlag', e: '⛓️', t: 'Gældsfri plan', desc: 'Få overblik og en rækkefølge, der virker', badge: { e: '🕊️', n: 'Gældsknuser' },
  src: [['https://www.forbrug.dk/', 'forbrug.dk']],
  steps: [
    { t: 'Skriv al gæld op', b: 'Lav en liste over al gæld: kreditkort, forbrugslån, afbetaling, billån, SU-lån og lån fra familie. Skriv restgæld, rente/ÅOP og månedlig ydelse for hvert lån. Det gør ondt at se samlet – men det er første skridt til at få styr på det.', h: 'Du kan ikke lægge en plan for gæld, du ikke kender.' },
    { t: 'ÅOP afslører prisen', b: 'ÅOP (årlige omkostninger i procent) samler rente og gebyrer i ét tal, så lån kan sammenlignes. For forbrugslån gælder et loft på 35 % i ÅOP, og de samlede kreditomkostninger må ikke overstige lånebeløbet. Selv inden for loftet er dyre lån meget dyre.', h: 'Sammenlign altid lån på ÅOP – ikke kun på månedlig ydelse.' },
    { t: 'Lavine eller snebold?', b: '<b>Lavinemetoden</b>: betal minimum på alt og læg alle ekstra kroner på lånet med højest rente – det er billigst. <b>Sneboldmetoden</b>: betal det mindste lån først for hurtige sejre og motivation. Begge virker, hvis du holder fast. Når et lån er væk, rykker dets ydelse videre til det næste.', h: 'Højeste rente først er billigst – mindste først motiverer.' },
    { t: 'Stop hullet i spanden', b: 'Mens du afvikler, så undgå ny gæld: fjern gemte kort fra webshops, slå "køb nu – betal senere" fra, og byg en lille buffer, så næste uventede regning ikke kommer på kortet. Overvej om dyre lån kan samles i ét billigere lån – men kun hvis det samlet bliver billigere.', h: 'Ny gæld under afvikling æder fremskridtet.' },
    { t: 'Hvis det er for meget', b: 'Kan du ikke betale, så kontakt kreditorerne tidligt – det er nemmere at aftale en ordning før rykkere og inkasso. Der findes gratis og anonym gældsrådgivning, fx hos frivillige organisationer. Ignorér aldrig post fra Gældsstyrelsen eller fogedretten.', h: 'Søg hjælp tidligt – det er gratis og forpligter ikke.' }
  ],
  quiz: [
    { q: 'Hvad er ÅOP?', o: ['Kun renten', 'Rente og gebyrer samlet i ét årligt procenttal', 'Den månedlige ydelse'], a: 1, x: 'ÅOP gør det muligt at sammenligne lån på tværs af rente og gebyrer.' },
    { q: 'Hvilken metode er billigst rent matematisk?', o: ['Lavinemetoden – højeste rente først', 'Sneboldmetoden – mindste lån først', 'At betale lige meget på alle lån'], a: 0, x: 'Ved at betale dyreste lån først sparer du flest rentekroner.' },
    { q: 'Hvad er loftet for ÅOP på forbrugslån?', o: ['10 %', '35 %', 'Der er intet loft'], a: 1, x: 'Kreditaftaleloven har et loft på 35 % i ÅOP for forbrugslån.' },
    { q: 'Du kan ikke betale en regning. Hvad er bedst?', o: ['Vente og se, om det går over', 'Kontakte kreditor tidligt og aftale en ordning', 'Tage et kviklån'], a: 1, x: 'Tidlig kontakt giver flest muligheder og færrest gebyrer.' }
  ] },
{ id: 'investere', track: 'invest', e: '📈', t: 'Kom i gang med at investere', desc: 'Risiko, spredning, omkostninger og skat', badge: { e: '🌱', n: 'Investor-spire' },
  app: ['#/renter', '🧮 Prøv renters rente-beregneren'], src: [['https://skat.dk/borger/aktier-og-andre-vaerdipapirer/aktiesparekonto', 'skat.dk: Aktiesparekonto']],
  steps: [
    { t: 'Først buffer, så investering', b: 'Investér kun penge, du ikke skal bruge de næste mange år. Aktier kan falde meget på kort sigt. Har du dyr gæld eller ingen buffer, er det som regel klogere at starte der – at betale et lån med 15 % rente af er et sikkert afkast.', h: 'Kort tidshorisont = ikke aktier.' },
    { t: 'Risiko og tid', b: 'Højere forventet afkast følger med højere risiko. Over lang tid har aktier historisk givet mere end en bankkonto, men med store udsving undervejs. Jo længere tidshorisont, jo bedre kan du sidde udsving af. Historisk afkast er ingen garanti for fremtiden.', h: 'Udsving er prisen for det højere forventede afkast.' },
    { t: 'Spred dig – og hold omkostningerne nede', b: 'Med en bred indeksfond ejer du små bidder af hundreder eller tusinder af selskaber på én gang. Omkostninger på fx 1–2 % om året lyder af lidt, men æder en stor del af afkastet over 20–30 år. Kig på ÅOP for fonde.', h: 'Bred spredning og lave omkostninger er noget af det få, du selv styrer.' },
    { t: 'Aktiesparekonto', b: 'På en aktiesparekonto beskattes afkastet med 17 % lagerbeskatning – også af gevinster, du ikke har solgt. Indskudsloftet er 174.200 kr. (2026), og man kan kun have én konto pr. person. Uden for kontoen beskattes aktieindkomst med 27 % op til 79.400 kr. og 42 % derover (2026).', h: 'ASK: 17 % lager · loft 174.200 kr. (2026, skat.dk).' },
    { t: 'Fast beløb og is i maven', b: 'Mange investerer et fast beløb hver måned. Så køber du automatisk både når kurserne er høje og lave og undgår at skulle "ramme" det rigtige tidspunkt. Den største fejl er ofte at sælge i panik, når markedet falder.', h: 'Tid i markedet slår timing af markedet.' }
  ],
  quiz: [
    { q: 'Hvad bør typisk være på plads, før du investerer?', o: ['En buffer og styr på dyr gæld', 'En ny bil', 'Et kreditkort'], a: 0, x: 'Investeringer kan falde, når du mindst har brug for det. Buffer og lav gæld giver ro til at sidde udsving af.' },
    { q: 'Hvorfor betyder omkostninger så meget?', o: ['Det gør de ikke', 'De trækkes hvert år og vokser med renters rente', 'De betales kun én gang'], a: 1, x: 'Små årlige omkostninger bliver til store beløb over mange år.' },
    { q: 'Hvordan beskattes en aktiesparekonto?', o: ['17 % lagerbeskatning', '27/42 % ved salg', 'Den er skattefri'], a: 0, x: 'ASK beskattes med 17 % af årets værdiændring – lagerbeskatning (skat.dk).' },
    { q: 'Hvad er fordelen ved at investere et fast beløb hver måned?', o: ['Du rammer altid bunden', 'Du undgår at skulle time markedet', 'Det fjerner al risiko'], a: 1, x: 'Faste indskud spreder dine køb over tid. Risikoen forsvinder ikke, men du undgår timing.' }
  ] },
{ id: 'pension', track: 'invest', e: '🧓', t: 'Pension på 10 minutter', desc: 'Søjlerne, fradraget og det du bør tjekke', badge: { e: '🏖️', n: 'Pensionsklar' },
  src: [['https://www.pensionsinfo.dk/', 'PensionsInfo'], ['https://skat.dk/borger/pension-og-efterloen/fradrag-for-indbetalinger-til-pension', 'skat.dk: Pensionsfradrag']],
  steps: [
    { t: 'Tre søjler', b: 'Dansk pension hviler på tre søjler: <b>folkepension</b> fra staten, <b>arbejdsmarkedspension</b> via dit job og <b>privat opsparing</b>. Folkepensionen består af et grundbeløb og et pensionstillæg, og tillægget afhænger af din øvrige indkomst.', h: 'Folkepension alene giver et beskedent rådighedsbeløb.' },
    { t: 'Hvornår kan du gå på pension?', b: 'Folkepensionsalderen afhænger af, hvornår du er født, og den hæves i takt med levealderen. Se din egen alder på borger.dk. Din private pension kan typisk udbetales nogle år før folkepensionsalderen.', h: 'Find din pensionsalder på borger.dk.' },
    { t: 'Ratepension, livrente og aldersopsparing', b: '<b>Livrente</b> udbetales, så længe du lever. <b>Ratepension</b> udbetales over 10–30 år. Begge giver fradrag ved indbetaling og beskattes ved udbetaling. Ratepension har et loft på 68.700 kr. (2026). <b>Aldersopsparing</b> giver ikke fradrag, men udbetales skattefrit og har et lavt loft.', h: 'Ratepension-loft: 68.700 kr. (2026, skat.dk).' },
    { t: 'Ekstra pensionsfradrag', b: 'Ud over det almindelige fradrag giver indbetalinger til livrente og ratepension et ekstra fradrag: 12 % hvis du har mere end 15 år til folkepension og 32 % hvis du har 15 år eller mindre – af højst 87.800 kr. (2026). Det beregnes automatisk.', h: 'Ekstra fradrag 12 %/32 % (2026, skat.dk).' },
    { t: 'Tjek PensionsInfo én gang om året', b: 'På pensionsinfo.dk ser du alle dine ordninger samlet: forventet udbetaling, forsikringer og omkostninger. Tjek om du har gamle ordninger fra tidligere job med høje omkostninger, om dine forsikringer passer til dit liv, og om du har den rigtige begunstigelse.', h: 'Små omkostninger og glemte ordninger kan koste mange penge.' }
  ],
  quiz: [
    { q: 'Hvilke tre søjler består dansk pension af?', o: ['Folkepension, arbejdsmarkedspension og privat opsparing', 'SU, dagpenge og efterløn', 'Bank, realkredit og forsikring'], a: 0, x: 'Folkepension (staten), arbejdsmarkedspension (job) og privat opsparing.' },
    { q: 'Hvad kendetegner aldersopsparing?', o: ['Fradrag ved indbetaling', 'Intet fradrag, men skattefri udbetaling', 'Udbetales livsvarigt'], a: 1, x: 'Aldersopsparing er beskattet ved indbetaling og udbetales skattefrit.' },
    { q: 'Hvor ser du alle dine pensioner samlet?', o: ['På pensionsinfo.dk', 'På lønsedlen', 'I netbanken'], a: 0, x: 'PensionsInfo samler ordninger fra pensionsselskaber og banker.' },
    { q: 'Hvad afhænger din folkepensionsalder af?', o: ['Din indkomst', 'Dit fødselsår', 'Dit pensionsselskab'], a: 1, x: 'Folkepensionsalderen afhænger af, hvornår du er født (borger.dk).' }
  ] },
{ id: 'selvskat', track: 'selvst', e: '🧾', t: 'Styr på skatten som selvstændig/bijob', desc: 'B-indkomst, forskudsopgørelse og moms', badge: { e: '🧾', n: 'Skatteklar' },
  app: ['#/jobs', '💼 Se skattereserve pr. job'], src: [['https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-registrerer-du-din-virksomhed-for-moms', 'skat.dk: Momsregistrering']],
  steps: [
    { t: 'A- og B-indkomst', b: 'Ved <b>A-indkomst</b> (løn) trækker arbejdsgiveren skatten for dig. Ved <b>B-indkomst</b> – fx honorarer, freelance, privat træning eller udlejning – bliver der ikke trukket noget. Så er det dit ansvar at betale skatten, typisk via forskudsopgørelsen.', h: 'B-indkomst = ingen skat trukket – du skal selv sørge for den.' },
    { t: 'Ret forskudsopgørelsen', b: 'Skriv din forventede B-indkomst (og udgifter) på forskudsopgørelsen i TastSelv. Så beregner Skattestyrelsen en løbende betaling (B-skat), eller den indregnes i dit skattekort. Retter du løbende, når indkomsten ændrer sig, undgår du en stor restskat.', h: 'Ret forskudsopgørelsen, så snart tallene ændrer sig.' },
    { t: 'Læg til side – hver gang', b: 'En enkel vane: Læg en fast procentdel af hver B-indtægt på en separat skattekonto med det samme. Hvor stor procenten skal være, afhænger af din samlede indkomst og fradrag – mange bruger 35–45 % som en forsigtig start. Restskat for 2025 koster renter og tillæg (skat.dk).', h: 'Skattepenge er ikke dine penge – flyt dem med det samme.' },
    { t: 'Moms og 50.000 kr.-grænsen', b: 'Sælger du momspligtige varer eller ydelser for mere end 50.000 kr. inden for et kalenderår, skal du momsregistreres (skat.dk, 2026). Under grænsen er registrering frivillig. Nogle ydelser er helt fritaget for moms – fx visse sundhedsydelser – så tjek reglerne for netop din ydelse.', h: 'Moms: over 50.000 kr. pr. kalenderår (skat.dk).' },
    { t: 'Fradrag og dokumentation', b: 'Udgifter, der er nødvendige for at tjene indkomsten, kan ofte trækkes fra – fx udstyr og kurser. Gem bilag og kvitteringer (også digitalt), og hold private og forretningsmæssige udgifter adskilt. Platforme som fx udlejningstjenester indberetter i dag ofte dine indtægter direkte til Skattestyrelsen.', h: 'Ingen bilag – intet fradrag.' }
  ],
  quiz: [
    { q: 'Hvad kendetegner B-indkomst?', o: ['Skatten trækkes automatisk', 'Der trækkes ikke skat – du skal selv sørge for den', 'Den er skattefri'], a: 1, x: 'B-indkomst er skattepligtig, men der trækkes ikke skat ved udbetalingen.' },
    { q: 'Hvordan undgår du bedst en stor restskat?', o: ['Ved at rette forskudsopgørelsen løbende', 'Ved at vente på årsopgørelsen', 'Ved at bruge bikort'], a: 0, x: 'Når forskudsopgørelsen passer, betaler du skatten løbende.' },
    { q: 'Hvornår skal du momsregistreres (2026)?', o: ['Fra første krone', 'Når momspligtigt salg overstiger 50.000 kr. i et kalenderår', 'Over 500.000 kr.'], a: 1, x: 'Grænsen er 50.000 kr. inden for et kalenderår (skat.dk).' },
    { q: 'Hvad er en god vane ved hver B-indtægt?', o: ['At bruge pengene, før skatten opdager dem', 'At flytte en fast procentdel til en skattekonto', 'At hæve kontant'], a: 1, x: 'Så står pengene klar, når skatten skal betales.' }
  ] },
{ id: 'bolig', track: 'livsfaser', e: '🏠', t: 'Køb din første bolig', desc: 'Udbetaling, lån, omkostninger og fortrydelsesret', badge: { e: '🔑', n: 'Boligklar' },
  src: [['https://www.forbrug.dk/', 'forbrug.dk'], ['https://skat.dk/borger/ejendom-og-grundskyld', 'skat.dk: Boligskat']],
  steps: [
    { t: 'Udbetaling og finansiering', b: 'Typisk skal du selv betale mindst 5 % af købesummen i udbetaling. Realkreditlånet kan dække op til 80 % af værdien (op til 30 år), og resten finansieres med et dyrere banklån. Banken vurderer også dit rådighedsbeløb, altså hvad du har tilbage hver måned.', h: '5 % udbetaling · op til 80 % realkredit · resten banklån.' },
    { t: 'Fast eller variabel rente', b: 'Et fastforrentet lån giver samme ydelse hele vejen og kan ofte indfris til kurs 100, hvis renten falder. Variabel rente er typisk billigere i starten, men ydelsen kan stige. Afdragsfrihed sænker ydelsen nu, men gælden falder ikke. Spørg: Kan jeg klare ydelsen, hvis renten stiger?', h: 'Vælg et lån, du kan sove på – også hvis renten stiger.' },
    { t: 'Alle de skjulte omkostninger', b: 'Ud over prisen kommer tinglysningsafgift, lånegebyrer, kurtage, evt. rådgiver/advokat, ejerskifteforsikring og flytning. Hver måned: boligskat (ejendomsværdiskat og grundskyld), fællesudgifter, forsikring, vedligehold og forbrug. Læg en buffer til vedligehold ind fra dag ét.', h: 'Regn med mere end købsprisen – og en vedligeholdelsesbuffer.' },
    { t: 'Tilstandsrapport og fortrydelsesret', b: 'Læs tilstandsrapport, elinstallationsrapport og energimærke grundigt. Som privat køber har du fortrydelsesret i 6 hverdage, mod at betale 1 % af købesummen til sælger. Et advokatforbehold giver ofte mulighed for at træde tilbage uden den betaling.', h: 'Skriv aldrig under uden forbehold eller rådgiver.' },
    { t: 'Få styr på det før fremvisningen', b: 'Få en forhåndsgodkendelse i banken, så du kender dit maksimum. Lav et realistisk boligbudget med alle månedlige udgifter og sammenlign med din nuværende husleje. Og husk: Det maksimale beløb, banken vil låne dig, er ikke nødvendigvis det beløb, du har det godt med.', h: 'Du bestemmer loftet – ikke banken.' }
  ],
  quiz: [
    { q: 'Hvor stor en del kan realkredit typisk finansiere af en ejerbolig?', o: ['Op til 50 %', 'Op til 80 %', '100 %'], a: 1, x: 'Realkredit kan låne op til 80 % af værdien for ejerboliger. Resten er udbetaling og banklån.' },
    { q: 'Hvad koster det at bruge fortrydelsesretten ved et boligkøb?', o: ['Intet', '1 % af købesummen', '10 % af købesummen'], a: 1, x: 'Fortrydelsesretten gælder i 6 hverdage mod betaling af 1 % af købesummen.' },
    { q: 'Hvad betyder afdragsfrihed?', o: ['At lånet er gratis', 'At du kun betaler rente og bidrag – gælden falder ikke', 'At du slipper for boligskat'], a: 1, x: 'Afdragsfrihed sænker ydelsen nu, men du betaler ikke af på gælden.' },
    { q: 'Hvilken udgift kommer typisk hver måned som boligejer?', o: ['Boligskat', 'Tinglysningsafgift', 'Kurtage'], a: 0, x: 'Ejendomsværdiskat og grundskyld betales løbende. Tinglysning og kurtage betales ved handlen.' }
  ] },
{ id: 'svindel', track: 'hjem', e: '🛡️', t: 'Spot svindel', desc: 'Genkend tricks og vid, hvad du gør', badge: { e: '🛡️', n: 'Svindel-vagt' },
  src: [['https://www.finanstilsynet.dk/', 'Finanstilsynet'], ['https://politi.dk/', 'politi.dk']],
  steps: [
    { t: 'Svindlerens tre greb', b: 'Næsten al svindel bruger de samme greb: <b>hast</b> ("din konto bliver lukket nu"), <b>autoritet</b> (de udgiver sig for at være banken, politiet eller Skattestyrelsen) og <b>følelser</b> (frygt, kærlighed eller grådighed). Når du mærker pres, så stop op.', h: 'Pres og hast er et faresignal i sig selv.' },
    { t: 'MitID og koder', b: 'Del aldrig MitID-koder, og godkend aldrig noget i MitID-appen, som du ikke selv har sat i gang. Banken, politiet eller Skattestyrelsen beder dig aldrig om at oplyse koder eller flytte penge til en "sikker konto".', h: 'Godkend kun det, du selv har startet.' },
    { t: 'Falske opkald og beskeder', b: 'Svindlere kan få et rigtigt telefonnummer eller afsendernavn til at stå i displayet (spoofing). Læg på, og ring selv tilbage på det nummer, du finder på bankens hjemmeside. Klik ikke på links i sms\'er om pakker, bøder eller refusion – gå selv ind via appen eller hjemmesiden.', h: 'Læg på – ring selv op på et nummer, du har fundet.' },
    { t: 'Investeringssvindel', b: '"Garanteret høj gevinst", kryptoeventyr med kendte ansigter og "rådgivere", der kontakter dig på sociale medier – det er klassisk svindel. Tjek altid i Finanstilsynets virksomhedsregister, om firmaet har tilladelse, og se tilsynets advarselsliste.', h: 'For godt til at være sandt = ikke sandt.' },
    { t: 'Hvis uheldet er ude', b: 'Handl hurtigt: Ring til din bank og spær kort og netbank, skift adgangskoder, og anmeld forholdet til politiet. Jo hurtigere banken hører fra dig, jo bedre er chancen for at stoppe overførslen. Det er ikke pinligt – svindlerne er professionelle.', h: 'Ring til banken straks – tid er alt.' }
  ],
  quiz: [
    { q: 'En "bankmedarbejder" ringer og beder dig godkende i MitID for at stoppe svindel. Hvad gør du?', o: ['Godkender hurtigt', 'Lægger på og ringer selv til banken', 'Giver dem din kode i stedet'], a: 1, x: 'Banken beder dig aldrig om at godkende noget, du ikke selv har startet. Læg på og ring selv op.' },
    { q: 'Hvad er spoofing?', o: ['Når svindlere får et falsk nummer eller navn til at ligne et rigtigt', 'En type virus', 'En sikker betalingsmetode'], a: 0, x: 'Et nummer eller afsendernavn i displayet er ikke et bevis for, hvem der kontakter dig.' },
    { q: 'Hvor tjekker du, om et investeringsfirma har tilladelse?', o: ['På firmaets egen hjemmeside', 'I Finanstilsynets virksomhedsregister', 'I kommentarerne på sociale medier'], a: 1, x: 'Finanstilsynet har et register over firmaer med tilladelse og en advarselsliste.' },
    { q: 'Du har overført penge til en svindler. Hvad er det første, du gør?', o: ['Venter til mandag', 'Ringer til banken med det samme', 'Skriver til svindleren'], a: 1, x: 'Jo hurtigere banken reagerer, jo større er chancen for at stoppe pengene.' }
  ] }
];
COURSES.push(
{ id: 'su', track: 'livsfaser', e: '🎓', t: 'SU og studielån', desc: 'Klip, fribeløb og hvad lånet koster', badge: { e: '📘', n: 'Studieøkonom' },
  src: [['https://www.su.dk/', 'su.dk'], ['https://www.su.dk/su-laan/naar-du-skal-betale-laan-tilbage/renter-paa-dit-su-laan', 'su.dk: Renter på SU-lån']],
  steps: [
    { t: 'Klip er en begrænset ressource', b: 'På en videregående uddannelse har du SU svarende til uddannelsens normerede tid plus 12 måneder ekstra. Hver måned med SU bruger ét klip. Bruger du klip på en uddannelse, du stopper på, mangler de senere – så tænk dig om, før du skifter.', h: 'Klip brugt er klip væk – også ved studieskift.' },
    { t: 'Fribeløbet', b: 'Du må tjene et vist beløb ved siden af SU – dit fribeløb. Tjener du mere, skal du betale for meget modtaget SU tilbage med et tillæg. Du kan fravælge SU i måneder, hvor du tjener meget, så hæves dit fribeløb for resten af året. Se dit fribeløb på su.dk.', h: 'Hold øje med fribeløbet – og fravælg SU i travle arbejdsmåneder.' },
    { t: 'SU-lån: billigt, men ikke gratis', b: 'Mens du studerer, er renten på SU-lån 4 % om året. Efter uddannelsen er renten diskontoen plus et tillæg på højst 1 % – fra 1. oktober 2026 er den 3,10 % (su.dk). Renterne lægges til gælden og vokser med renters rente.', h: 'SU-lån: 4 % under uddannelse (su.dk, 2026).' },
    { t: 'Tilbagebetaling', b: 'Du begynder at betale tilbage den 1. januar, når der er gået et år efter udgangen af det år, du blev færdig. Lånet skal typisk være betalt over 7–15 år. Kan du ikke betale en periode, kan du søge om nedsat ydelse eller henstand – men renterne løber.', h: 'Sæt tilbagebetalingen ind i dit første "rigtige" budget.' },
    { t: 'Lån kun det, du skal bruge', b: 'Lav et studiebudget: husleje, mad, transport, bøger og telefon. Lån kun til det, der mangler. Hver 1.000 kr. du låner som studerende, skal betales tilbage med renter, når du starter dit arbejdsliv – samtidig med fx første bolig.', h: 'Lån med et formål – ikke "fordi man kan".' }
  ],
  quiz: [
    { q: 'Hvad er renten på SU-lån, mens du studerer?', o: ['0 %', '4 %', '10 %'], a: 1, x: 'Under uddannelsen er renten fast 4 % om året (su.dk).' },
    { q: 'Hvad sker der, hvis du tjener mere end dit fribeløb?', o: ['Intet', 'Du skal betale for meget modtaget SU tilbage med et tillæg', 'Du mister alle dine klip'], a: 1, x: 'Overskrider du fribeløbet, skal du betale SU tilbage – med tillæg.' },
    { q: 'Hvordan kan du få et højere fribeløb resten af året?', o: ['Ved at fravælge SU i nogle måneder', 'Ved at tage et SU-lån', 'Ved at skifte bank'], a: 0, x: 'Måneder uden SU øger dit fribeløb.' },
    { q: 'Hvor længe har du typisk til at betale SU-lånet tilbage?', o: ['1–2 år', '7–15 år', '40 år'], a: 1, x: 'Tilbagebetalingen strækker sig typisk over 7–15 år.' }
  ] },
{ id: 'lejebolig', track: 'livsfaser', e: '🏢', t: 'Din første lejebolig', desc: 'Depositum, syn, boligstøtte og dine rettigheder', badge: { e: '🗝️', n: 'Lejer med styr' },
  src: [['https://www.borger.dk/bolig-og-flytning/Lejebolig', 'borger.dk: Lejebolig'], ['https://www.borger.dk/bolig-og-flytning/boligstoette', 'borger.dk: Boligstøtte']],
  steps: [
    { t: 'Hvad koster det at flytte ind?', b: 'Ved indflytning kan udlejer kræve <b>depositum</b> på højst 3 måneders leje og <b>forudbetalt leje</b> for højst 3 måneder (lejeloven). Dertil kommer første måneds husleje. Så du kan skulle betale op til 7 måneders leje på én gang – plus flytning.', h: 'Op til 3 mdr. depositum + 3 mdr. forudbetalt leje (lejeloven).' },
    { t: 'Læs kontrakten', b: 'Tjek husleje, a conto-beløb til varme/vand, opsigelsesvarsel, husorden, og om der står noget om istandsættelse ved fraflytning. Er lejemålet tidsbegrænset, skal der være en god grund. Er du i tvivl, så spørg en lejerforening, før du skriver under.', h: 'Skriv aldrig under på noget, du ikke forstår.' },
    { t: 'Indflytningssyn – dit bevis', b: 'Gå boligen grundigt igennem ved indflytning, og tag billeder med dato af alt: ridser, pletter, huller og fejl. Udlejere med flere lejemål skal holde et indflytningssyn og lave en rapport. Mangler, du opdager senere, skal du typisk påtale skriftligt inden for 14 dage.', h: 'Billeder ved indflytning sparer penge ved fraflytning.' },
    { t: 'Boligstøtte', b: 'Du kan måske få boligstøtte til huslejen. Det afhænger af husstandens indkomst, formue, huslejen, boligens størrelse og hvor mange I bor. Du søger på borger.dk, og Udbetaling Danmark udbetaler. Prøv beregneren, før du siger nej tak.', h: 'Søg boligstøtte via borger.dk – det tager få minutter.' },
    { t: 'Hvis I bliver uenige', b: 'Er du uenig om husleje, a conto-regnskab eller istandsættelse, kan du klage til huslejenævnet i din kommune. Gem al kommunikation skriftligt. Ved fraflytning: Opsig skriftligt efter kontraktens varsel, og vær med til fraflytningssynet.', h: 'Huslejenævnet kan hjælpe – det er billigt og tilgængeligt.' }
  ],
  quiz: [
    { q: 'Hvor meget depositum kan udlejer højst kræve?', o: ['1 måneds leje', '3 måneders leje', '6 måneders leje'], a: 1, x: 'Efter lejeloven højst 3 måneders leje.' },
    { q: 'Hvorfor er billeder ved indflytning vigtige?', o: ['De er pæne at have', 'De dokumenterer boligens stand, så du ikke betaler for andres skader', 'De er et krav fra Skattestyrelsen'], a: 1, x: 'Billeder med dato er dit bevis ved fraflytningssynet.' },
    { q: 'Hvor søger du boligstøtte?', o: ['Hos udlejer', 'På borger.dk', 'I banken'], a: 1, x: 'Du søger på borger.dk, og Udbetaling Danmark behandler sagen.' },
    { q: 'Hvem kan du klage til, hvis du er uenig med udlejer om fx husleje?', o: ['Huslejenævnet', 'Forbrugerombudsmanden', 'Skattestyrelsen'], a: 0, x: 'Huslejenævnet i kommunen behandler mange typer lejesager.' }
  ] },
{ id: 'samliv', track: 'livsfaser', e: '💑', t: 'Flytte sammen – eller gå fra hinanden', desc: 'Fælles økonomi, særeje og samejeaftale', badge: { e: '🤝', n: 'Fair fordeling' },
  src: [['https://www.familieretshuset.dk/', 'Familieretshuset'], ['https://www.borger.dk/familie-og-boern/Samliv-aegteskab-og-registreret-partnerskab', 'borger.dk: Samliv']],
  steps: [
    { t: 'Tre måder at dele på', b: '<b>Alt fælles</b>: al indkomst i én pulje. <b>Fælles konto efter indkomst</b>: hver betaler den samme procentdel af sin indkomst til faste udgifter. <b>Alt separat</b>: hver betaler sit, og I deler regningerne. Der er ingen rigtig model – det vigtige er, at I har talt om det og begge synes, det er fair.', h: 'Talt om økonomi = færre konflikter senere.' },
    { t: 'Ugift samlevende: loven beskytter ikke', b: 'Som ugifte samlevende har I ingen automatisk arveret efter hinanden og ingen ret til en del af den andens formue ved et brud. Vil I sikre hinanden, kræver det testamente og at I indsætter hinanden som begunstiget på pension og livsforsikring.', h: 'Samlevende arver ikke hinanden uden testamente.' },
    { t: 'Samejeaftale', b: 'Køber I bolig eller noget dyrt sammen uden at være gift, så lav en samejeaftale: Hvem har betalt hvad, hvem ejer hvor stor en del, og hvad sker der, hvis I går fra hinanden – hvem kan blive boende, og hvordan værdien opgøres.', h: 'Lav aftalen, mens I er gode venner.' },
    { t: 'Gift: delingsformue og særeje', b: 'Gifte har som udgangspunkt <b>delingsformue</b>: ved skilsmisse deles nettoformuen som hovedregel ligeligt. Med en <b>ægtepagt</b> kan I aftale særeje for noget eller det hele. Ægtepagten skal tinglyses for at være gyldig. Gæld er som udgangspunkt personlig – men har I fælles lån, hæfter I begge for hele beløbet.', h: 'Fælles lån = I hæfter begge for det hele.' },
    { t: 'Hvis I går fra hinanden', b: 'Lav et overblik over fælles konti, lån, abonnementer og ting. Luk eller fordel fælles konti og kort, og ret adresse og forskudsopgørelse. Separation og skilsmisse søges via Familieretshuset, som også hjælper med aftaler om børn.', h: 'Overblik først – så aftaler.' }
  ],
  quiz: [
    { q: 'Arver ugifte samlevende automatisk hinanden?', o: ['Ja, efter 2 år', 'Nej – det kræver testamente', 'Ja, hvis de har børn'], a: 1, x: 'Ugifte samlevende har ingen arveret efter loven. Testamente er nødvendigt.' },
    { q: 'Hvad er en samejeaftale?', o: ['En aftale om, hvem der ejer hvad af noget, I ejer sammen', 'En ægtepagt', 'Et lån'], a: 0, x: 'Den beskriver ejerandele og hvad der sker ved et brud.' },
    { q: 'Hvad er udgangspunktet for gifte i Danmark?', o: ['Særeje', 'Delingsformue', 'Ingen fælles formue'], a: 1, x: 'Delingsformue er udgangspunktet. Særeje kræver en tinglyst ægtepagt.' },
    { q: 'I har et fælles lån og går fra hinanden. Hvem hæfter?', o: ['Den, der tjener mest', 'I hæfter begge for hele lånet', 'Ingen'], a: 1, x: 'Ved fælles lån hæfter begge for hele gælden over for banken.' }
  ] },
{ id: 'boern', track: 'livsfaser', e: '👶', t: 'Økonomi når I får børn', desc: 'Barsel, børne- og ungeydelse og opsparing', badge: { e: '🍼', n: 'Familieøkonom' },
  src: [['https://www.borger.dk/familie-og-boern/Familieydelser-oversigt/Boerne-ungeydelse', 'borger.dk: Børne- og ungeydelse'], ['https://www.borger.dk/familie-og-boern/barsel-oversigt', 'borger.dk: Barsel']],
  steps: [
    { t: 'Barsel i grove træk', b: 'Bor forældrene sammen ved fødslen, har hver som udgangspunkt ret til 24 ugers orlov med barselsdagpenge efter fødslen. Som lønmodtager er 11 af ugerne øremærket (de kan ikke overdrages), og resten kan overdrages. Mor har desuden ret til graviditetsorlov før fødslen. Tjek din overenskomst – mange har løn under dele af barslen.', h: '24 uger hver – 11 øremærket (borger.dk).' },
    { t: 'Indkomsten falder – planlæg det', b: 'Barselsdagpenge er ofte lavere end din løn. Regn ud, hvad I får udbetalt i hver periode af barslen, og læg et budget for hele orloven. Spar op på forhånd, hvis I kan, og tal om, hvordan I fordeler orloven og økonomien.', h: 'Lav et barselsbudget måned for måned.' },
    { t: 'Børne- og ungeydelse', b: 'I 2026 er hele ydelsen pr. barn: 0–2 år 5.370 kr. pr. kvartal, 3–6 år 4.248 kr. pr. kvartal, 7–14 år 3.342 kr. pr. kvartal og 15–17 år 1.114 kr. pr. måned (borger.dk). Bor forældrene sammen, får hver halvdelen. Ydelsen nedsættes ved høj indkomst.', h: 'Ydelsen kommer automatisk – tjek den på borger.dk.' },
    { t: 'Børneopsparing', b: 'På en børneopsparing må der i alt indskydes 6.000 kr. om året og højst 72.000 kr. i alt (2026). Afkastet er skattefrit, og pengene er bundet i mindst 7 år. Der kan kun være én pr. barn. Investerer man pengene, er der risiko, men også større forventet afkast over mange år.', h: 'Børneopsparing: 6.000 kr./år, 72.000 kr. i alt (2026, skat.dk).' },
    { t: 'De nye faste udgifter', b: 'Børn koster bl.a. daginstitution, mad, tøj, udstyr og fritid. Undersøg om I kan få økonomisk fripladstilskud til daginstitution – det afhænger af husstandens indkomst. Tjek også forsikringer, testamente og begunstigelser, når familien vokser.', h: 'Nyt barn = opdater budget, forsikring og testamente.' }
  ],
  quiz: [
    { q: 'Hvor mange ugers orlov efter fødslen har hver forælder som udgangspunkt?', o: ['12', '24', '52'], a: 1, x: 'Hver forælder har som udgangspunkt 24 uger (borger.dk).' },
    { q: 'Hvad betyder "øremærket" orlov?', o: ['Den kan ikke overdrages til den anden forælder', 'Den er ulønnet', 'Den skal holdes før fødslen'], a: 0, x: 'Øremærkede uger bortfalder, hvis forælderen ikke selv holder dem.' },
    { q: 'Hvor meget må der højst indskydes på en børneopsparing om året (2026)?', o: ['3.000 kr.', '6.000 kr.', '20.000 kr.'], a: 1, x: '6.000 kr. om året og 72.000 kr. i alt.' },
    { q: 'Hvordan udbetales ydelsen for 15–17-årige?', o: ['Månedligt', 'Kvartalsvis', 'Én gang om året'], a: 0, x: 'Ungeydelsen for 15–17-årige udbetales hver måned.' }
  ] },
{ id: 'arv', track: 'livsfaser', e: '📜', t: 'Arv og testamente', desc: 'Hvem arver, tvangsarv og boafgift', badge: { e: '📜', n: 'Arveklog' },
  src: [['https://skat.dk/borger/skatter-og-afgifter-ved-doedsfald', 'skat.dk: Skat ved dødsfald'], ['https://www.borger.dk/familie-og-boern/Arv-og-testamente', 'borger.dk: Arv og testamente']],
  steps: [
    { t: 'Hvem arver uden testamente?', b: 'Uden testamente følger arven loven: Er du gift og har børn, arver ægtefællen halvdelen og børnene deles om den anden halvdel. Har du ingen ægtefælle, arver børnene alt. Ugifte samlevende arver <b>intet</b> efter loven.', h: 'Ingen testamente = loven bestemmer.' },
    { t: 'Tvangsarv', b: 'En fjerdedel af det, ægtefællen og børn (livsarvinger) skulle have arvet efter loven, er tvangsarv – den kan du ikke testamentere væk. Resten kan du frit bestemme over i et testamente, fx til en samlever, venner eller velgørenhed.', h: 'Tvangsarv: 1/4 af den lovbestemte arv.' },
    { t: 'Sådan laver du et testamente', b: 'Et testamente oprettes typisk for en notar (notartestamente) eller med to vitterlighedsvidner. Notartestamentet opbevares centralt, så det ikke bliver væk. Testamentet er især vigtigt for samlevende, sammenbragte familier og hvis du vil skævdele.', h: 'Samlevende? Testamente er nærmest et must.' },
    { t: 'Boafgift', b: 'Arv til børn, børnebørn, forældre og samlevende, der har boet sammen med afdøde i mindst 2 år, beskattes med 15 % boafgift af det, der overstiger bundfradraget på 392.300 kr. (2026). Ægtefæller betaler ingen boafgift. Andre arvinger betaler desuden tillægsboafgift.', h: 'Boafgift: 15 % over 392.300 kr. (2026, skat.dk).' },
    { t: 'Tjek begunstigelsen', b: 'Udbetalinger fra pension og livsforsikring følger ofte ikke testamentet, men den begunstigelse, du har indsat hos pensionsselskabet. Tjek på PensionsInfo, hvem der står som begunstiget – især hvis du er samlevende, er blevet skilt eller har fået børn.', h: 'Pension følger begunstigelsen – ikke nødvendigvis testamentet.' }
  ],
  quiz: [
    { q: 'Hvad arver en ugift samlever uden testamente?', o: ['Halvdelen', 'En fjerdedel', 'Intet'], a: 2, x: 'Samlevende har ingen arveret efter loven.' },
    { q: 'Hvor stor er tvangsarven?', o: ['1/4 af den lovbestemte arv', 'Halvdelen', 'Det hele'], a: 0, x: 'En fjerdedel er tvangsarv – resten kan du testamentere frit.' },
    { q: 'Hvilken boafgift betaler en ægtefælle?', o: ['0 %', '15 %', '36,25 %'], a: 0, x: 'Ægtefæller betaler ikke boafgift (skat.dk).' },
    { q: 'Hvad bestemmer, hvem der får udbetalt din pension ved død?', o: ['Altid testamentet', 'Typisk begunstigelsen hos pensionsselskabet', 'Kommunen'], a: 1, x: 'Pension og livsforsikring følger begunstigelsen. Tjek den på PensionsInfo.' }
  ] },
{ id: 'akasse', track: 'livsfaser', e: '🛟', t: 'A-kasse og hvis du mister jobbet', desc: 'Dagpenge, krav og de første skridt', badge: { e: '🛟', n: 'Sikkerhedsnet' },
  src: [['https://www.borger.dk/arbejde-dagpenge-ferie/Dagpenge-kontanthjaelp-og-sygedagpenge/Arbejdsloeshedsdagpenge', 'borger.dk: Dagpenge'], ['https://bm.dk/satser/satser-for-2026/dagpenge', 'bm.dk: Satser 2026']],
  steps: [
    { t: 'Hvad er en a-kasse?', b: 'En a-kasse er en arbejdsløshedsforsikring. Er du medlem og bliver ledig, kan du få dagpenge. A-kasse og fagforening er to forskellige ting – du kan være medlem af den ene uden den anden. Kontingentet til a-kassen kan trækkes fra i skat uden loft.', h: 'A-kasse ≠ fagforening.' },
    { t: 'Hvad kan du få?', b: 'Dagpenge udgør 90 % af din tidligere indkomst (efter AM-bidrag), dog højst 22.041 kr. om måneden før skat for fuldtidsforsikrede (2026). I de første 3 måneder kan der være et beskæftigelsestillæg. Har du en høj løn, falder din indkomst altså markant ved ledighed.', h: 'Maks. 22.041 kr./md. før skat (2026, bm.dk).' },
    { t: 'Krav for at få dagpenge', b: 'Du skal bl.a. have været medlem i mindst ét år, have haft en vis indkomst de seneste 3 år (286.632 kr. for fuldtidsforsikrede i 2026), være tilmeldt som arbejdssøgende fra første ledige dag og stå til rådighed for arbejdsmarkedet (borger.dk).', h: 'Meld dig ledig på jobnet.dk første dag.' },
    { t: 'Efterlønsbidrag', b: 'Gennem a-kassen kan du betale efterlønsbidrag. Det giver mulighed for at gå på efterløn nogle år før folkepensionsalderen, hvis du opfylder kravene. Beslutningen har betydning for mange år frem – se kurset om efterløn.', h: 'Efterlønsbidrag betales via a-kassen.' },
    { t: 'Hvis du bliver opsagt', b: 'Kontakt a-kassen og evt. fagforeningen med det samme. Tjek dit opsigelsesvarsel og om du har ret til fratrædelsesgodtgørelse. Tilpas budgettet til dagpengeniveau, og brug din buffer frem for dyre lån. Mange kan også tegne en lønsikring for ekstra dækning.', h: 'Ring til a-kassen dag ét – ikke dag 30.' }
  ],
  quiz: [
    { q: 'Hvor meget kan dagpenge højst udgøre for fuldtidsforsikrede i 2026 (uden tillæg)?', o: ['15.000 kr./md.', '22.041 kr./md.', '35.000 kr./md.'], a: 1, x: 'Maksimum er 22.041 kr. om måneden før skat (bm.dk, 2026).' },
    { q: 'Hvor stor en del af din tidligere indkomst kan dagpenge udgøre?', o: ['50 %', '90 %, op til et loft', '100 %'], a: 1, x: '90 % af indkomsten efter AM-bidrag – dog højst satsen.' },
    { q: 'Hvornår skal du melde dig ledig?', o: ['Første ledige dag', 'Efter en måned', 'Når opsparingen er brugt'], a: 0, x: 'Du skal være tilmeldt som arbejdssøgende fra første ledige dag.' },
    { q: 'Er a-kasse og fagforening det samme?', o: ['Ja', 'Nej'], a: 1, x: 'A-kassen er en forsikring. Fagforeningen arbejder for dine løn- og arbejdsforhold.' }
  ] },
{ id: 'efterloen', track: 'invest', e: '⏳', t: 'Efterløn og pensionsalder', desc: 'Hvornår kan du stoppe – og hvad kræver det?', badge: { e: '⏳', n: 'Tidsplanlægger' },
  src: [['https://www.borger.dk/pension-og-efterloen/Efterloen-fleksydelse-delpension/efterloen/foer-du-gaar-paa-efterloen', 'borger.dk: Efterløn'], ['https://www.borger.dk/pension-og-efterloen', 'borger.dk: Pension']],
  steps: [
    { t: 'Din folkepensionsalder', b: 'Folkepensionsalderen afhænger af dit fødselsår og følger levealderen. Ifølge borger.dk er den fx 69 år for personer født 1967–1970 og vejledende 70 år for personer født 1971 eller senere – den kan blive forhøjet yderligere.', h: 'Født 1971 eller senere: vejledende 70 år (borger.dk).' },
    { t: 'Hvad er efterløn?', b: 'Efterløn er en mulighed for at trække sig tilbage op til 3 år før folkepensionsalderen. Det kræver, at du er medlem af en a-kasse og har betalt efterlønsbidrag i mange år (typisk 30 år), og at du opfylder en række krav, når du går på efterløn.', h: 'Efterløn = op til 3 år før folkepension.' },
    { t: 'Hvor meget og modregning', b: 'Den højeste efterlønssats svarer til den maksimale dagpengesats (22.041 kr. om måneden før skat i 2026, 91 %-satsen er 20.057 kr.). Din private pension kan blive modregnet i efterlønnen, så regn på det, før du beslutter dig.', h: 'Pension kan modregnes i efterlønnen.' },
    { t: 'Bliv ved og få en præmie', b: 'Opfylder du betingelserne for efterløn, men bliver ved med at arbejde, kan du optjene en skattefri præmie. Det kan betale sig at få et efterlønsbevis, så du kender dine muligheder.', h: 'Spørg a-kassen om efterlønsbevis og skattefri præmie.' },
    { t: 'Skal du betale efterlønsbidrag?', b: 'Bidraget koster hvert år og binder dig i mange år, men kan give frihed til at stoppe tidligere. Har du et fysisk hårdt job, kan det være mere værd. Tænk også på alternativer som seniorpension og tidlig pension.', h: 'Regn på det – og tal med din a-kasse.' }
  ],
  quiz: [
    { q: 'Hvor mange år før folkepensionsalderen kan du højst gå på efterløn?', o: ['1 år', '3 år', '10 år'], a: 1, x: 'Efterløn kan som udgangspunkt fås i op til 3 år (borger.dk).' },
    { q: 'Hvad er den vejledende folkepensionsalder for personer født 1971 eller senere?', o: ['65 år', '67 år', '70 år'], a: 2, x: 'Vejledende 70 år ifølge borger.dk – og den kan stige.' },
    { q: 'Hvad kan påvirke størrelsen på din efterløn?', o: ['Din private pension kan blive modregnet', 'Din boligs størrelse', 'Antallet af dine bankkonti'], a: 0, x: 'Pensionsformue og -udbetalinger kan blive modregnet.' },
    { q: 'Hvor betaler du efterlønsbidrag?', o: ['Via a-kassen', 'Via banken', 'Via kommunen'], a: 0, x: 'Efterlønsbidraget betales gennem din a-kasse.' }
  ] },
{ id: 'virksomhed', track: 'selvst', e: '🚀', t: 'Start en lille virksomhed', desc: 'CVR, moms og enkeltmandsvirksomhed', badge: { e: '🚀', n: 'Iværksætter' },
  app: ['#/jobs', '💼 Opret jobbet i appen'], src: [['https://virk.dk/', 'virk.dk'], ['https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-registrerer-du-din-virksomhed-for-moms', 'skat.dk: Momsregistrering']],
  steps: [
    { t: 'Hobby, B-indkomst eller virksomhed?', b: 'Sælger du en gang imellem ydelser som privatperson, kan indtægten være <b>B-indkomst</b>, som du selv skriver på forskudsopgørelsen. Driver du det regelmæssigt med det formål at tjene penge, er det typisk <b>selvstændig virksomhed</b> – så kan du trække udgifter fra, men har også flere pligter.', h: 'Formålet og omfanget afgør, om det er en virksomhed.' },
    { t: 'CVR og virksomhedsform', b: 'Du opretter en virksomhed og får et CVR-nummer på virk.dk. Den simpleste form er en <b>enkeltmandsvirksomhed</b>: den er nem at starte, men du hæfter personligt for al gæld, og overskuddet beskattes som din personlige indkomst. Et selskab (fx ApS) adskiller din og virksomhedens økonomi, men kræver kapital og mere administration.', h: 'Enkeltmandsvirksomhed = du hæfter personligt.' },
    { t: 'Moms', b: 'Overstiger dit momspligtige salg 50.000 kr. inden for et kalenderår, skal du momsregistreres (skat.dk, 2026). Så skal du lægge 25 % moms på dine priser og indberette moms til tiden – også "nulindberetninger". Nogle ydelser er momsfritaget, fx visse sundhedsydelser.', h: 'Moms over 50.000 kr. pr. kalenderår.' },
    { t: 'Bogføring og bilag', b: 'Hold virksomhedens og dit private forbrug adskilt – gerne med en separat konto. Gem alle bilag, og bogfør løbende. Bogføringsloven stiller krav, og der er regler om digital bogføring for mange virksomheder – tjek hvad der gælder for dig hos Erhvervsstyrelsen.', h: 'Separat konto + løbende bogføring = ro i maven.' },
    { t: 'Skat, forsikring og sikkerhedsnet', b: 'Læg en fast andel af overskuddet til side til skat, og ret forskudsopgørelsen. Overvej en erhvervsansvarsforsikring, og husk at du som selvstændig selv skal sørge for pension og evt. a-kasse. Spørg en revisor ved større beslutninger som virksomhedsordningen.', h: 'Som selvstændig er du også din egen pensionsordning.' }
  ],
  quiz: [
    { q: 'Hvor opretter du et CVR-nummer?', o: ['På virk.dk', 'På borger.dk', 'I banken'], a: 0, x: 'Virksomheder registreres på virk.dk.' },
    { q: 'Hvad gælder for en enkeltmandsvirksomhed?', o: ['Du hæfter personligt for gælden', 'Ejeren hæfter ikke', 'Den kræver 50.000 kr. i kapital'], a: 0, x: 'I en enkeltmandsvirksomhed er der ingen adskillelse mellem dig og virksomheden.' },
    { q: 'Hvornår skal du momsregistreres (2026)?', o: ['Ved salg over 50.000 kr. i et kalenderår', 'Ved salg over 300.000 kr.', 'Aldrig som lille virksomhed'], a: 0, x: 'Grænsen er 50.000 kr. momspligtigt salg inden for et kalenderår.' },
    { q: 'Hvad er en god vane fra dag ét?', o: ['At blande privat og firma på samme konto', 'At have en separat konto og gemme alle bilag', 'At bogføre én gang om året'], a: 1, x: 'Adskillelse og bilag gør regnskab og skat langt nemmere.' }
  ] },
{ id: 'bil', track: 'hjem', e: '🚗', t: 'Bil eller ingen bil', desc: 'De samlede ejeromkostninger – og alternativerne', badge: { e: '🚲', n: 'Transportkalkulator' },
  app: ['#/hvadnu', '🔮 Prøv "Hvad nu hvis" med en ny fast udgift'], src: [['https://fdm.dk/', 'FDM']],
  steps: [
    { t: 'Prisen er meget mere end købet', b: 'En bil koster hver måned: <b>værditab</b>, finansiering, forsikring, grøn ejerafgift, brændstof eller strøm, service, dæk, reparationer, vask og parkering. Værditabet er ofte den største post – og den, man glemmer, fordi den ikke står på en regning.', h: 'Værditab er en udgift, selvom den er usynlig.' },
    { t: 'Regn pris pr. måned og pr. km', b: 'Læg alle årlige udgifter sammen, og del med 12. Del også med de km, du kører om året – så kan du sammenligne med tog, bus, delebil og taxa. FDM og andre har beregnere for samlede bilomkostninger.', h: 'Samlede årlige udgifter ÷ km = din reelle km-pris.' },
    { t: 'Køb, lån eller leasing?', b: '<b>Kontant køb</b> er billigst, hvis du har pengene. <b>Billån</b> koster renter og gebyrer – sammenlign ÅOP. <b>Privatleasing</b> giver en fast månedlig pris, men tjek km-grænse, udbetaling og regler for skader ved aflevering. Du ejer ikke bilen bagefter.', h: 'Sammenlign den samlede pris – ikke kun månedsydelsen.' },
    { t: 'Alternativerne', b: 'Cykel/elcykel, kollektiv trafik, delebil og lejlighedsvis billeje kan samlet være meget billigere, hvis du ikke kører dagligt. Mange kombinerer: cykel i hverdagen og lejebil til ferien.', h: 'Hvad koster det at lade være med at eje en bil?' },
    { t: 'Hvis du vælger bil', b: 'Vælg en bil, der passer til dit faktiske behov, ikke dit drømmescenarie. Indhent forsikringstilbud, før du køber, tjek afgift og forbrug, og læg penge til side hver måned til service og reparationer.', h: 'Budget til bil = alle posterne + en reparationsbuffer.' }
  ],
  quiz: [
    { q: 'Hvilken udgift glemmes ofte, fordi den ikke kommer som en regning?', o: ['Forsikring', 'Værditab', 'Brændstof'], a: 1, x: 'Værditabet er ofte den største post.' },
    { q: 'Hvordan sammenligner du bil med andre transportformer?', o: ['Ved at se på købsprisen', 'Ved at beregne samlede omkostninger pr. km', 'Ved at se på farven'], a: 1, x: 'Samlede årlige omkostninger ÷ antal km giver en reel sammenligning.' },
    { q: 'Hvad skal du især tjekke ved privatleasing?', o: ['Km-grænse og regler for skader ved aflevering', 'Bilens farve', 'Om radioen virker'], a: 0, x: 'Overskredne km og skader ved aflevering kan blive dyre.' },
    { q: 'Hvad er typisk billigst, hvis man har pengene?', o: ['Kontant køb', 'Dyrt billån', 'Kassekredit'], a: 0, x: 'Uden lån slipper du for renter og gebyrer.' }
  ] },
{ id: 'groen', track: 'hjem', e: '🌱', t: 'Grøn økonomi i hjemmet', desc: 'Spar energi, forstå elprisen og find tilskud', badge: { e: '🌍', n: 'Energisparer' },
  src: [['https://elpris.dk/', 'elpris.dk (Forsyningstilsynet)'], ['https://sparenergi.dk/', 'SparEnergi.dk (Energistyrelsen)']],
  steps: [
    { t: 'Hvad består elprisen af?', b: 'Din elpris består af selve strømmen (som ofte skifter time for time), nettarif til netselskabet, afgifter og moms. Elafgiften er midlertidigt nedsat til næsten ingenting i 2026 og 2027 (skat.dk). Resten af prisen kan stadig variere meget over døgnet.', h: 'Elpris = strøm + nettarif + afgifter + moms.' },
    { t: 'Flyt forbruget', b: 'Har du en aftale med timepris, kan det betale sig at køre opvask, vaskemaskine og opladning af elbil, når strømmen er billig – typisk om natten og midt på dagen. Nettariffen er ofte højest i spidstimerne om eftermiddagen og aftenen.', h: 'Undgå de dyre spidstimer, når du kan.' },
    { t: 'Sammenlign elaftaler', b: 'På elpris.dk, som drives af Forsyningstilsynet, kan du sammenligne elaftaler. Kig efter faste månedsgebyrer og tillæg pr. kWh – de betyder ofte mere end reklamens "billigste strøm".', h: 'Tjek abonnement og tillæg – ikke kun spotprisen.' },
    { t: 'Små vaner, der virker', b: 'Skru en grad ned for varmen, luk for standby, brug lågen på gryden, vask ved lavere temperatur og tjek tætningslister ved vinduer og døre. Energistyrelsens SparEnergi.dk har gode råd og beregnere for både bolig og apparater.', h: 'Én grad lavere giver typisk en mærkbar besparelse på varmen.' },
    { t: 'Større investeringer og tilskud', b: 'Efterisolering, varmepumpe og nye vinduer koster, men kan tjene sig hjem. Energistyrelsen administrerer tilskudspuljer, som åbner og lukker – tjek de aktuelle på deres hjemmeside. Håndværkerfradraget dækker visse grønne ydelser (op til 9.000 kr. i 2026, skat.dk).', h: 'Regn tilbagebetalingstid, og tjek tilskud før du bestiller.' }
  ],
  quiz: [
    { q: 'Hvornår er strømmen ofte dyrest for husholdninger?', o: ['Om natten', 'I spidstimerne om eftermiddagen/aftenen', 'Kl. 12 om middagen'], a: 1, x: 'Spotpris og nettarif er typisk højest i spidstimerne.' },
    { q: 'Hvem driver elpris.dk?', o: ['Forsyningstilsynet', 'Et elselskab', 'Banken'], a: 0, x: 'elpris.dk drives af Forsyningstilsynet.' },
    { q: 'Hvad er vigtigt at sammenligne på en elaftale?', o: ['Kun reklamen', 'Abonnement og tillæg pr. kWh', 'Logoet'], a: 1, x: 'Faste gebyrer og tillæg afgør ofte, hvad du betaler i alt.' },
    { q: 'Hvor finder du aktuelle tilskudspuljer til energiforbedringer?', o: ['Hos Energistyrelsen', 'På sociale medier', 'Hos naboen'], a: 0, x: 'Energistyrelsen administrerer puljerne. De åbner og lukker.' }
  ] },
{ id: 'boernpenge', track: 'hjem', e: '🧒', t: 'Snak med børn om penge', desc: 'Lommepenge, vaner og digitale fælder', badge: { e: '🐷', n: 'Pengeforælder' },
  steps: [
    { t: 'Start tidligt – og konkret', b: 'Børn lærer mest af det, de ser. Tag dem med på indkøb, sammenlign priser højt, og forklar, at penge på kortet også er rigtige penge. Små børn forstår mønter og sparegrise bedre end tal på en skærm.', h: 'Gør penge synlige – især når de er digitale.' },
    { t: 'Lommepenge som træning', b: 'Faste lommepenge giver børn noget at øve sig på. Aftal, hvad de selv skal betale for. Lad dem lave fejl med små beløb – at have brugt alle pengene på slik i går er en billig og effektiv lektion.', h: 'Små fejl nu sparer store fejl senere.' },
    { t: 'Brug – gem – giv', b: 'En enkel model: Del lommepengene i tre bunker eller konti – én til at bruge, én til at spare op til noget større, og evt. én til at give. Det lærer, at penge kan have forskellige formål, og at det kræver tålmodighed at nå et mål.', h: 'Et sparemål med billede motiverer.' },
    { t: 'Digitale fælder', b: 'Spil med køb i appen, loot boxes og abonnementer er designet til at få børn til at bruge penge. Slå køb fra eller kræv godkendelse, og tal om, hvordan spillene tjener penge. Lær dem også aldrig at dele koder eller billeder af kort.', h: 'Slå køb i apps fra – og forklar hvorfor.' },
    { t: 'Teenagere og første job', b: 'Hjælp med første lønseddel, skattekort og frikort, og tal om opsparing og forbrugslån. Lad dem have egen konto og kort med grænser. Fortæl også ærligt om jeres egne fejl – det gør penge til noget, man kan tale om.', h: 'Gør penge til et normalt samtaleemne derhjemme.' }
  ],
  quiz: [
    { q: 'Hvorfor er det godt at lade børn lave små pengefejl?', o: ['Det er det ikke', 'Det er billig og effektiv læring', 'Så de mister lysten til at spare'], a: 1, x: 'Små fejl med små beløb lærer mere end mange formaninger.' },
    { q: 'Hvad står "brug – gem – giv" for?', o: ['Tre formål med pengene', 'Tre banker', 'Tre typer lån'], a: 0, x: 'Pengene deles efter formål: forbrug, opsparing og at give.' },
    { q: 'Hvad er en god idé med børns spil på mobilen?', o: ['At gemme dit kort i spillet', 'At slå køb fra eller kræve godkendelse', 'At give dem din kode'], a: 1, x: 'Køb i spil er designet til at være lette. Slå dem fra.' },
    { q: 'Hvad bør du hjælpe med ved første job?', o: ['Skattekort/frikort og lønseddel', 'Et forbrugslån', 'Ingenting'], a: 0, x: 'Første lønseddel og skattekort er en god anledning til at lære om skat.' }
  ] }
);
