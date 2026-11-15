# Panel – lockpanelkalkylator

Svensk mobilanpassad React/TypeScript-app med Vite, lokal lagring och PWA. Appen beräknar väggar med valbara lock- eller bottenbrädor i vardera änden, centrerade lock, lika springor och valfria knutbrädor. Dörrar, fönster och valfria överbleck stöds med kontroll av lockens linjering.

## Kör lokalt

Node 22.12+ (Node 24 rekommenderas).

```
npm ci
npm run dev
```

Öppna den utskrivna adressen med `/panel_kalkylator/`. Beräkningarna görs lokalt; ingen inloggning behövs. Alternativ och påbörjade indata sparas under `panel-kalkylator:v1`. Skadad eller otillgänglig lagring hindrar inte beräkning.

## Kontrollera

```
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:pwa
```

PWA-testet kör produktionsbygget via preview på port 4173. Det kontrollerar offline-omladdning, lagring, repositorybas, knutexemplet, validering och mobilbredd. `npm run preview` startar byggd app manuellt. Service worker används i produktion, inte i dev-läge. Ny version visas med en uppdateringsknapp; giltiga mått finns kvar.

## Mått och beräkning

W är sträckan mellan ytterkanterna av valda ändbrädor, exempelvis mellan två foder. Start och slut kan väljas oberoende: botten–botten, lock–lock eller blandat. Ändlock är hela brädor inom sträckan och överlappar bottenbrädan inåt; inget stöd utanför sträckan modelleras. Knut kan endast väljas vid bottenavslut och stängs av när samma sida ändras till lock. W är hela väggbredden när knutar används. K är knutens faktiska täckning över denna vägg och Q dess överlapp över bottenbrädan. Nominell knutbredd kan skilja från K. Effektiv panelsträcka är `L = W − (KV−QV) − (KH−QH)`. Avstängd knut ger avdrag 0. Alla utsättningsmått mäts från väggens vänsterkant.

För två bottenavslut och n bottenbrädor med bredd B och lockbredd T blir springan `g=(L−nB)/(n−1)`, modulen `P=B+g` och överlappet `(T−g)/2`. Automatiken väljer minsta giltiga antal, vilket ger överlapp närmast önskat. Den tillåter inte knut/lock-kollisioner, överlappande lock eller ändrade virkesbredder. En enda bräda stöds när L=B. Beräkningen behåller full precision; presentationen avrundas. Hela millimeter avrundas från absoluta koordinater, inte genom att summera avrundade moduler. Högst 10 000 bottenbrädor stöds; ritning använder synligt utsnitt och tabell sidindelning.

Bildexemplet har W=13600, B=145, T=95 och effektiva ändavdrag 55 mm. Det ger 68 bottenbrädor och 67 lock med modul ca 199,1791 mm. Exempelknutarna K=95, Q=40 är ett uttryckligt modellval, inte en verifierad hörndetalj från bilden.

[TräGuiden](https://www.traguiden.se/konstruktion/konstruktionsexempel/vaggar/) anger minst 20 mm överlapp per sida för lockpanel. Verktyget är avsett för utsättning och ersätter inte monteringsanvisningar. Utan öppningar är fasadhöjden illustrativ. Med öppningar används angiven verklig vägghöjd. Brädtjockleken är schematisk; materialåtgång och konstruktionsdimensionering ingår inte. Referenssidan https://tidaapp.se/guider/lockpanel kunde inte läsas under researchen och dess algoritm är inte verifierad.

## GitHub Pages

Projektet publiceras med GitHub Actions. Varje push till `main` kör lint, beräkningstester, produktionsbygge och webbläsartester innan `dist` publiceras. Workflow kan också startas manuellt. Välj **Settings → Pages → Source: GitHub Actions** vid ny installation.

Basen är `/panel_kalkylator/` i `vite.config.ts`. Samma bas styr manifest, service worker och startadress. Ändra även testernas baseURL och scopeförväntan om basen ändras. Service workerns scope är begränsat till appen. Appen kan installeras som PWA via webbläsarens meny och fungerar offline efter första lyckade besöket.

Beräkningsmotorn i `src/geometry.ts` är fristående från React. `src/facade.ts` hanterar helväggar med öppningar och `src/range.ts` fria sträckor.

För valbara avslut: låt k vara antalet lockavslut (0, 1 eller 2). Då är antal lock `n−1+k` och `L=(n−1+k/2)P+B+k/2*(T−B)`. Överlappet blir `(B+T−P)/2`. Äldre sparade mått får automatiskt bottenavslut på båda sidor.

## Jämför alternativ

Under **Dina alternativ** växlar du mellan flera fristående beräkningar. **Lägg till alternativ** kopierar det aktiva alternativets alla mått och avslut. Ändra exempelvis bottenbredd från 145 till 120 mm i kopian och växla med flikarna för att jämföra samma vägg. Du kan lägga till fler än två, namnge dem och ta bort dem (sista alternativet behålls). Flikarna stöder piltangenter, Home och End.

Alla alternativ, aktiv flik och påbörjade indata sparas lokalt i lagringsformat version 4 under samma appspecifika nyckel. Tidigare sparad enkel beräkning migreras till Alternativ 1. Ogiltiga mått visas som fel i sitt eget alternativ och påverkar inte andra alternativ. Sparandet är lokalt för webbläsaren/enheten.


## Dörrar, fönster och plåt

Lägg till flera öppningar under **Dörrar & fönster**. Ange vägghöjd, vänsterläge x från väggens vänsterkant, underkant y från väggens nederkant samt hålets bredd och höjd, i mm. Dörrar har underkant 0. Foder modelleras inte. Öppningar måste rymmas i väggen, lämna panel på båda sidor och får inte överlappa varandra eller kollidera med knutbrädor. Högst 100 öppningar och 50 000 ritade bräddelar stöds per alternativ.

Valfri plåt ritas vid hålets överkant. Vänster och höger utstick anges från respektive hålkant. På vänster sida linjerar lockets högerkant med hålet, och närmaste lock utåt har sin högerkant vid plåtänden. Till höger används lockens vänsterkanter på motsvarande sätt. Detta innebär att varje plåtutstick måste motsvara exakt ett centrumavstånd i det berörda fältet. Plåten visas som en horisontell linje; plåtdjup, fall, montagespel och eventuella vertikala avstånd ingår inte i modellen.

- **Sammanhängande panellinjer:** en och samma fördelning måste passa väggens ändar, alla hålkanter och plåtändar. Lösaren söker även tätare fördelningar än grundförslaget. Brädorna skärs geometriskt vid hålen; delar över och under hålet behåller samma x-linjer.
- **Separata delsträckor:** horisontella band bildas vid öppningarnas över- och underkanter. Varje återstående panelområde får egen fördelning, med lockavslut vid hålens sidor. Närmaste lock utåt kontrolleras mot plåtänden. I fältet direkt ovanför plåten kontrolleras plåtändarna. Streckade gränser markerar var linjeringen kan bytas. Manuell brädantalstyrning är avstängd i detta läge. Skarv- och montageutförande är inte dimensionerat.

Om villkoren inte går ihop visas konflikten och uppmaning att testa andra brädbredder i ett jämförelsealternativ eller justera läge/utstick. Inga mått ändras automatiskt. Ofördelade områden visas utan panel, och utsättningstabellen döljs så länge någon konflikt återstår.

Giltiga resultat har en områdestabell med c/c, springa och överlapp samt en kopierbar tabell över bräddelarnas x- och y-gränser. Delantal är geometriska delar, inte inköpsmängd eller färdig kaplista. Öppningar är gemensamma för alternativen. Fördelningsläge, vald sträcka och virkesval sparas per alternativ. Lagringsformat 1 och 2 migreras med tom öppningslista.

Fungerande testexempel: vägg 2945 × 3000, botten 145, lock 95, överlapp 20, bottenavslut utan knut; fönster x=820, y=800, bredd=505, höjd=1200, plåtutstick 200 per sida. Det ger c/c 200 med giltig linjering i båda fördelningslägena.


## Enklare sträckberäkning vid öppningar (standard)

Det vanliga flödet med öppningar är nu **Vald sträcka – start och stopp**. Välj start- och stoppunkt vid väggkant, vänster/höger hålkant eller vänster/höger plåtkant. Därefter väljs botten- eller lockbräda i vardera änden, precis som för en vanlig sträcka. Den valda längden beräknas automatiskt från öppningarnas lägen. En översikt markerar sträckan. En fri sträcka får inte gå genom ett hål; välj i så fall dess kanter som start/stopp. Plåtkanter är enbart mätpunkter i detta läge och tvingar inte fram ett visst centrumavstånd.

Utsättningstabellen och detaljbilden använder vald startpunkt som x=0. Tabellen och den kopierade listan anger vilket mått som ska läggas till för att få koordinater på hela väggen. Knut kan bara användas vid en faktisk väggkant. Helväggsberäkningen finns kvar under **Hela väggen – avancerad linjering** för panel ovanför/under hål och kontroll av samtidig linjering.

Dörrar och fönster, deras positioner, hålmått, plåtutstick och vägghöjd är gemensamma: tillägg, ändring och borttagning gäller alla alternativ, även tidigare skapade. Start/stopp, avslut, virkesbredder och väggbredd kan skilja mellan alternativen. Nya alternativ kopierar de aktiva valen. Exempelknappar ändrar virkes-/väggexemplet men tar inte bort öppningarna. När en mätpunkt tas bort återställs berörda referenser så att inget alternativ pekar på en borttagen öppning.

Äldre lagring migreras till version 4. Distinkta öppnings-ID:n från gamla alternativ behålls i en gemensam lista; för samma kopierade ID används måtten från det aktiva alternativet. Befintliga beräkningar utan öppningar fortsätter som tidigare.

I sträckläget får ett fönster eller en dörr fortsätta utanför väggen. Exempel: väggsträcka 1200 mm, fönster börjar vid x=1000 och är 800 mm brett. Välj fönstrets vänsterkant som stopp för att beräkna 1000 mm panel, även om resten av fönstret ligger utanför. Negativt vänsterläge stöds också, exempelvis x=−300 och bredd 800 för en öppning som slutar vid x=500. Översikten klipper bilden vid vägggränsen; öppningens hela mått sparas. Vald fri sträcka måste fortfarande ligga inom väggen och får inte gå genom ett hål. Det avancerade helväggsläget kräver fortfarande att öppningarna ryms helt inom väggen.

I panelbilden för vald sträcka visas också hål- och plåtkanter: orange respektive blå referenslinjer. Under **Lockens läge mot hål & plåt** jämförs varje referens med närmaste relevanta lockkant (högerkant till vänster om ett hål, vänsterkant till höger). Exakt linjering eller förskjutning i mm visas. Klick på lockets nummer markerar samma bräda i bilden. Dessa mått beskriver den valda fördelningen och tvingar inte fram linjering i sträckläget.


## Spara och dela beräkningar

Under **Spara & dela beräkningar** finns:

- **Spara beräkning:** en namngiven ögonblicksbild på den aktuella enheten. Den löpande beräkningen autosparas separat.
- **Ladda ner JSON / Läs in JSON:** flytta eller säkerhetskopiera alla alternativ, öppningar och val som en `.panel.json`-fil.
- **Kopiera delningslänk:** en länk med hela beräkningen i URL-fragmentet. Ingen databas eller uppladdning används. Den som får länken kan läsa innehållet. Om beräkningen är för stor för länken används JSON-filen i stället.

En importerad fil/länk förhandsgranskas innan den ersätter den öppna beräkningen. Nuvarande alternativ sparas först som **Automatisk säkerhetskopia före inläsning**. Ogiltiga filer och okända formatversioner avvisas utan att ändra beräkningen. Vid avstängd eller full lokal lagring visas ett fel i stället för ett falskt sparbesked.

Lokal lagring är knuten till webbläsare och webbplatsadress. Data från localhost följer inte automatiskt med till GitHub Pages: exportera en JSON-fil eller använd en delningslänk. En lokal delningslänk måste ha den publicerade appens adress för att fungera hos andra; filimport fungerar oavsett ursprungsadress.
