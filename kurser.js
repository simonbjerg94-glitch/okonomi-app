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
