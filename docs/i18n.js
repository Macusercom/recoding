// UI strings for all pages, and the DE/EN switch.
//
// Same module contract as the LUFSly web app it is adapted from: $NAME$
// placeholders are filled positionally, the language is remembered in
// localStorage, and applyLang() rewrites every [data-i18n*] element.

const LANG_KEY = 'recoding-lang';

const EN = {
  appName: 'ReCoding',
  tagline: 'Convert audio to MP3, AAC, Opus, FLAC, ALAC, WAV or AIFF — right in your browser.',
  privacyNote: 'Your files never leave your device. No upload, no account, no tracking.',

  // ---- engine ----
  engineLoading: 'Loading the converter engine — about 32 MB, once per browser…',
  engineFailed: 'The converter engine could not be loaded. Check your connection and reload.',

  // ---- drop zone ----
  dropTitle: 'Drop an audio file here',
  dropSub: 'or click to choose one',
  dropFormats: 'MP3, WAV, FLAC, M4A, OGG, Opus, AIFF and anything else FFmpeg can read.',
  dropOverlay: 'Drop the file to load it',

  // ---- source ----
  sourceTitle: 'Source file',
  sourceHint: 'Convert it as often as you like — every result is kept below.',
  probing: 'Reading the file…',
  probeError: 'This file could not be read as audio.',
  srcFormat: 'Format',
  srcSampleRate: 'Sample rate',
  srcChannels: 'Channels',
  srcBitDepth: 'Bit depth',
  srcBitrate: 'Bitrate',
  srcDuration: 'Duration',
  srcSize: 'Size',
  sourceLarge: 'This file is large. Converting it in the browser may need more memory than the tab has — if it fails, try a shorter excerpt.',
  chooseOther: 'Choose another file',

  // ---- settings ----
  settingsTitle: 'Output settings',
  settingsHint: 'Options that the chosen codec cannot do are disabled — hover one to see why.',
  fieldFormat: 'Format',
  fieldRateMode: 'Bitrate mode',
  fieldBitrate: 'Bitrate',
  fieldQuality: 'VBR quality',
  fieldSampleRate: 'Sample rate',
  fieldBitDepth: 'Bit depth',
  fieldChannels: 'Channels',
  fieldFlacCompression: 'Compression level',
  fieldOpusApplication: 'Optimize for',
  fieldOpusCompression: 'Encoding effort',
  fieldAacCoder: 'Coding algorithm',
  fieldMp3Reservoir: 'Bit reservoir',
  advancedTitle: 'Advanced options',

  keep: 'Keep original',
  rateCbr: 'Constant (CBR)',
  rateAbr: 'Average (ABR)',
  rateVbr: 'Variable (VBR)',
  rateVbrOpus: 'Variable (VBR)',
  rateConstrained: 'Constrained VBR',
  chMono: 'Mono',
  chStereo: 'Stereo',
  chJoint: 'Joint stereo',
  appAudio: 'Music and general audio',
  appVoip: 'Speech',
  appLowdelay: 'Lowest latency',
  coderTwoloop: 'Two-loop search (better)',
  coderFast: 'Fast search',
  on: 'On',
  off: 'Off',
  qualityBest: 'V$N$ — best',
  qualitySmallest: 'V$N$ — smallest',

  naBitDepth: 'Bit depth applies to lossless formats only. $CODEC$ is a lossy codec and stores no fixed bit depth.',
  naJointOpus: 'Opus decides mid/side coding per frame on its own and offers no switch for it.',
  naJointAlac: 'ALAC makes its own per-frame decision about the stereo pair and offers no switch for it.',
  naJointPcm: 'PCM stores every channel in full, side by side. There is nothing to join — that is what uncompressed means.',
  naBitrateFlac: 'FLAC is lossless, so the bitrate follows from the audio. Use the compression level to trade encoding time against file size.',
  naBitrateAlac: 'ALAC is lossless, so the bitrate follows from the audio. Sample rate, bit depth and channel count are the only dials.',
  naBitratePcm: 'PCM is uncompressed, so the bitrate is simply sample rate × bit depth × channels. Change those and the bitrate follows.',
  naRateMode: '$CODEC$ offers only one bitrate mode.',
  naSampleRate: '$CODEC$ always codes and decodes at $RATE$. Lower rates are resampled away, so the file would still play at $RATE$ — the choice would not mean what it says.',
  aacNote: 'HE-AAC and HE-AAC v2 need the patent-encumbered libfdk_aac encoder, which cannot legally be shipped in a browser app — AAC here is AAC-LC. FFmpeg\'s own AAC encoder also has a narrower usable bitrate range than the format allows, and it rewrites anything outside that range without saying so, so only the values it really delivers at the chosen sample rate and channel count are offered.',
  alacNote: 'Apple Lossless holds bit-for-bit the same audio as FLAC, in an MP4 container that Apple software plays natively. FLAC files are usually a few percent smaller.',
  wavNote: 'Uncompressed PCM — the bytes every editor reads, and by far the largest files here: about 10 MB per minute at 44.1 kHz, 16-bit, stereo.',
  aiffNote: 'Uncompressed PCM like WAV, but big-endian — the Mac and pro-audio side of the same idea. Safari and QuickTime play it; most other browsers do not.',

  infoFormat: 'MP3, AAC and Opus are lossy: they discard detail to save space, and what is gone cannot be brought back. FLAC and ALAC pack the audio smaller without altering a single sample. WAV and AIFF store it raw. Converting a lossy file into a lossless format restores nothing — it only stops the next generation of losses.',
  infoRateMode: 'Constant spends the same bits on every second, so the file size is predictable. Average aims for a target across the whole file. Variable gives quiet passages fewer bits and dense ones more, which is usually the best quality per megabyte — at a size you cannot know in advance.',
  infoSampleRate: 'How many times per second the waveform was measured. It sets the highest frequency the file can carry — about half the rate, so 44.1 kHz reaches roughly 22 kHz, past the top of human hearing. Choosing more than the source has adds no detail, only bytes.',
  infoChannels: 'Mono folds both sides into one channel and roughly halves the data. Stereo keeps them apart. Joint stereo stores what the two sides have in common once and only their difference twice, which buys quality at low bitrates at almost no cost.',
  infoBitDepth: 'How finely each individual measurement is stored. 16-bit is the CD standard and is transparent to listen to; 24-bit leaves headroom for further editing. 32-bit float cannot clip, which is why editors work in it — an interchange format, not a better-sounding one.',
  infoAacCoder: 'Two-loop searches harder for the best way to spend the bits it is given; fast search takes the first good answer. Two-loop is slower and holds up better at low bitrates — from about 192 kbps the difference is hard to hear.',
  infoOpusApplication: 'Music keeps the full frequency range. Speech switches Opus to its voice model, which is far clearer for talking at low bitrates and wrong for music. Lowest latency shortens the delay for live use and costs a little quality.',
  infoBitrate: 'The lowest and highest values each format actually allows are offered, and the list follows the sample rate and channel count because the legal range does too. The number is the bitrate of the whole file, not of one channel — mono at 128 kbps therefore gives each channel twice what stereo at 128 kbps does.',
  infoCompression: 'Higher means slower encoding and a smaller file. The audio is identical either way — FLAC is lossless.',
  infoEffort: 'Higher means the encoder works harder for the same bitrate. It affects encoding time, not the bitrate.',
  infoReservoir: 'Lets a difficult passage borrow bits from easier neighbouring frames. Turning it off makes frames strictly independent, at some cost in quality.',

  playerPlay: 'Play',
  playerPause: 'Pause',
  playerSeek: 'Jump to a position',
  playerClose: 'Close the player',

  convert: 'Convert',
  converting: 'Converting… $PCT$ %',
  convertQueued: '$N$ more queued',
  convertError: 'Conversion failed: $MSG$',

  // ---- results ----
  resultsTitle: 'Converted files',
  resultsHint: 'Every conversion is kept, so you can compare settings side by side.',
  clearAll: 'Clear all',
  removeResult: 'Remove',
  download: 'Download',
  showCommand: 'FFmpeg command',
  noPlayback: 'This browser cannot play $FORMAT$ — the file is fine, download it to play it elsewhere.',
  sizeDelta: '$PCT$ % of the source',
  fromSource: 'from $NAME$',

  noteSampleRate: '$FROM$ is not supported by $CODEC$ — used $TO$ instead.',
  noteBitrate: '$FROM$ kbps is out of range here — used $TO$ kbps instead.',
  noteNoJoint: '$CODEC$ has no joint stereo switch — used ordinary stereo.',
  noteJointMonoSource: 'The source is mono, so there is no stereo image to join.',

  // ---- how it works ----
  howTitle: 'How it works',
  howStep1: 'Drop an audio file onto the page, or click the box to pick one.',
  howStep2: 'The converter engine — FFmpeg compiled to WebAssembly — loads once, then stays cached in your browser.',
  howStep3: 'Choose a format and its settings, then hit Convert. Change the settings and convert again to compare.',
  howStep4: 'Play each result in place, or download it. Nothing is uploaded and nothing is deleted until you clear the list.',
  engineNote: 'Conversion runs entirely on your machine, in a Web Worker, using <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank" rel="noopener">ffmpeg.wasm</a> — FFmpeg 5.1.4 compiled to WebAssembly. See <a href="licenses.html">licenses</a> for the full attribution.',

  // ---- chrome ----
  footerSource: 'Source code',
  footerLicenses: 'Licenses',
  footerPrivacy: 'Privacy Policy',
  footerImprint: 'Imprint',
  footerCopyright: '© 2026 Macusercom',
  backToApp: '← Back to the app',
  backToReCoding: '← Back to ReCoding',
  imprintTitle: 'Legal Notice',
  privacyTitle: 'Privacy Policy',
  licensesTitle: 'Licenses & Attribution',
  indexPageTitle: 'ReCoding – Convert audio in your browser',
  imprintPageTitle: 'Imprint – ReCoding',
  privacyPageTitle: 'Privacy – ReCoding',
  licensesPageTitle: 'Licenses – ReCoding',

  chipCompression: 'Level $N$',
  chipBitDepth: '$N$-bit',
  chipBitDepthFloat: '32-bit float',
};

const DE = {
  appName: 'ReCoding',
  tagline: 'Audio in MP3, AAC, Opus, FLAC, ALAC, WAV oder AIFF umwandeln — direkt im Browser.',
  privacyNote: 'Deine Dateien verlassen dein Gerät nicht. Kein Upload, kein Konto, kein Tracking.',

  engineLoading: 'Konverter-Engine wird geladen — etwa 32 MB, einmal pro Browser…',
  engineFailed: 'Die Konverter-Engine konnte nicht geladen werden. Prüfe deine Verbindung und lade die Seite neu.',

  dropTitle: 'Audiodatei hierher ziehen',
  dropSub: 'oder klicken, um eine auszuwählen',
  dropFormats: 'MP3, WAV, FLAC, M4A, OGG, Opus, AIFF und alles andere, was FFmpeg lesen kann.',
  dropOverlay: 'Datei loslassen, um sie zu laden',

  sourceTitle: 'Quelldatei',
  sourceHint: 'Wandle sie so oft um, wie du magst — jedes Ergebnis bleibt unten erhalten.',
  probing: 'Datei wird gelesen…',
  probeError: 'Diese Datei konnte nicht als Audio gelesen werden.',
  srcFormat: 'Format',
  srcSampleRate: 'Abtastrate',
  srcChannels: 'Kanäle',
  srcBitDepth: 'Bittiefe',
  srcBitrate: 'Bitrate',
  srcDuration: 'Dauer',
  srcSize: 'Größe',
  sourceLarge: 'Diese Datei ist groß. Die Umwandlung im Browser braucht unter Umständen mehr Speicher, als der Tab hat — wenn sie fehlschlägt, versuche einen kürzeren Ausschnitt.',
  chooseOther: 'Andere Datei wählen',

  settingsTitle: 'Ausgabe-Einstellungen',
  settingsHint: 'Optionen, die der gewählte Codec nicht kann, sind deaktiviert — fahre darüber, um zu sehen warum.',
  fieldFormat: 'Format',
  fieldRateMode: 'Bitratenmodus',
  fieldBitrate: 'Bitrate',
  fieldQuality: 'VBR-Qualität',
  fieldSampleRate: 'Abtastrate',
  fieldBitDepth: 'Bittiefe',
  fieldChannels: 'Kanäle',
  fieldFlacCompression: 'Kompressionsstufe',
  fieldOpusApplication: 'Optimieren für',
  fieldOpusCompression: 'Encoding-Aufwand',
  fieldAacCoder: 'Kodierungsalgorithmus',
  fieldMp3Reservoir: 'Bit-Reservoir',
  advancedTitle: 'Erweiterte Optionen',

  keep: 'Original beibehalten',
  rateCbr: 'Konstant (CBR)',
  rateAbr: 'Durchschnittlich (ABR)',
  rateVbr: 'Variabel (VBR)',
  rateVbrOpus: 'Variabel (VBR)',
  rateConstrained: 'Begrenztes VBR',
  chMono: 'Mono',
  chStereo: 'Stereo',
  chJoint: 'Joint Stereo',
  appAudio: 'Musik und allgemeines Audio',
  appVoip: 'Sprache',
  appLowdelay: 'Geringste Latenz',
  coderTwoloop: 'Two-Loop-Suche (besser)',
  coderFast: 'Schnelle Suche',
  on: 'Ein',
  off: 'Aus',
  qualityBest: 'V$N$ — beste',
  qualitySmallest: 'V$N$ — kleinste',

  naBitDepth: 'Bittiefe gilt nur für verlustfreie Formate. $CODEC$ ist ein verlustbehafteter Codec und speichert keine feste Bittiefe.',
  naJointOpus: 'Opus entscheidet die Mid/Side-Kodierung selbst pro Frame und bietet dafür keinen Schalter.',
  naJointAlac: 'ALAC entscheidet pro Frame selbst über das Stereopaar und bietet dafür keinen Schalter.',
  naJointPcm: 'PCM speichert jeden Kanal vollständig nebeneinander. Es gibt nichts zusammenzufassen — genau das heißt unkomprimiert.',
  naBitrateFlac: 'FLAC ist verlustfrei, die Bitrate ergibt sich also aus dem Audiomaterial. Über die Kompressionsstufe tauschst du Rechenzeit gegen Dateigröße.',
  naBitrateAlac: 'ALAC ist verlustfrei, die Bitrate ergibt sich also aus dem Audiomaterial. Abtastrate, Bittiefe und Kanalzahl sind die einzigen Stellschrauben.',
  naBitratePcm: 'PCM ist unkomprimiert, die Bitrate ist also schlicht Abtastrate × Bittiefe × Kanalzahl. Ändere diese Werte, und die Bitrate folgt.',
  naRateMode: '$CODEC$ bietet nur einen Bitratenmodus.',
  naSampleRate: '$CODEC$ kodiert und dekodiert immer mit $RATE$. Niedrigere Raten werden wegresampelt, die Datei liefe also weiterhin mit $RATE$ — die Auswahl würde nicht bedeuten, was sie sagt.',
  aacNote: 'HE-AAC und HE-AAC v2 benötigen den patentbelasteten Encoder libfdk_aac, der in einer Browser-App rechtlich nicht mitgeliefert werden darf — AAC ist hier AAC-LC. Der AAC-Encoder von FFmpeg hat außerdem einen engeren nutzbaren Bitratenbereich als das Format selbst und schreibt Werte außerhalb davon kommentarlos um; angeboten werden deshalb nur die Werte, die er bei der gewählten Abtastrate und Kanalzahl tatsächlich liefert.',
  alacNote: 'Apple Lossless enthält bitgenau dasselbe Audio wie FLAC, in einem MP4-Container, den Apple-Software nativ abspielt. FLAC-Dateien sind meist ein paar Prozent kleiner.',
  wavNote: 'Unkomprimiertes PCM — die Bytes, die jeder Editor liest, und mit Abstand die größten Dateien hier: rund 10 MB pro Minute bei 44,1 kHz, 16 Bit, Stereo.',
  aiffNote: 'Unkomprimiertes PCM wie WAV, aber Big-Endian — die Mac- und Pro-Audio-Seite derselben Idee. Safari und QuickTime spielen es ab, die meisten anderen Browser nicht.',

  infoFormat: 'MP3, AAC und Opus sind verlustbehaftet: Sie werfen Details weg, um Platz zu sparen, und was weg ist, kommt nicht zurück. FLAC und ALAC packen das Audiomaterial kleiner, ohne einen einzigen Sample-Wert zu verändern. WAV und AIFF speichern es roh. Eine verlustbehaftete Datei in ein verlustfreies Format zu wandeln, stellt nichts wieder her — es verhindert nur weitere Verluste.',
  infoRateMode: 'Konstant verwendet für jede Sekunde gleich viele Bits, die Dateigröße ist damit vorhersehbar. Durchschnittlich zielt über die ganze Datei auf einen Mittelwert. Variabel gibt ruhigen Passagen weniger und dichten mehr Bits — meist die beste Qualität pro Megabyte, dafür mit einer Größe, die sich vorher nicht bestimmen lässt.',
  infoSampleRate: 'Wie oft pro Sekunde die Wellenform gemessen wurde. Sie bestimmt die höchste Frequenz, die die Datei überhaupt enthalten kann — etwa die Hälfte der Rate, 44,1 kHz reichen also bis rund 22 kHz und damit über das menschliche Gehör hinaus. Mehr als die Quelle hat, fügt keine Details hinzu, nur Bytes.',
  infoChannels: 'Mono fasst beide Seiten zu einem Kanal zusammen und halbiert die Datenmenge ungefähr. Stereo hält sie getrennt. Joint Stereo speichert das Gemeinsame beider Seiten einmal und nur ihren Unterschied doppelt — das bringt bei niedrigen Bitraten Qualität, fast ohne Kosten.',
  infoBitDepth: 'Wie fein jede einzelne Messung gespeichert wird. 16 Bit ist der CD-Standard und zum Hören transparent, 24 Bit lässt Reserve für weitere Bearbeitung. 32 Bit Fließkomma kann nicht übersteuern, deshalb arbeiten Editoren damit — ein Austauschformat, kein besser klingendes.',
  infoAacCoder: 'Two-Loop sucht gründlicher nach der besten Verteilung der verfügbaren Bits, die schnelle Suche nimmt die erste brauchbare Lösung. Two-Loop ist langsamer und hält sich bei niedrigen Bitraten besser — ab etwa 192 kbps ist der Unterschied kaum hörbar.',
  infoOpusApplication: 'Musik behält den vollen Frequenzumfang. Sprache schaltet Opus auf sein Stimmmodell um: bei niedrigen Bitraten deutlich verständlicher für Sprache und falsch für Musik. Geringste Latenz verkürzt die Verzögerung für Live-Anwendungen und kostet etwas Qualität.',
  infoBitrate: 'Angeboten werden die tatsächlich niedrigsten und höchsten Werte, die das jeweilige Format zulässt; die Liste folgt Abtastrate und Kanalzahl, weil der zulässige Bereich das auch tut. Der Wert gilt für die gesamte Datei, nicht für einen Kanal — Mono mit 128 kbps gibt jedem Kanal also doppelt so viel wie Stereo mit 128 kbps.',
  infoCompression: 'Höher bedeutet langsamer kodiert und kleinere Datei. Das Audiomaterial ist in beiden Fällen identisch — FLAC ist verlustfrei.',
  infoEffort: 'Höher bedeutet, dass der Encoder bei gleicher Bitrate mehr Aufwand betreibt. Das beeinflusst die Rechenzeit, nicht die Bitrate.',
  infoReservoir: 'Lässt eine schwierige Passage Bits von einfacheren Nachbarframes borgen. Ausgeschaltet sind die Frames strikt unabhängig, was etwas Qualität kostet.',

  playerPlay: 'Abspielen',
  playerPause: 'Pause',
  playerSeek: 'An eine Stelle springen',
  playerClose: 'Player schließen',

  convert: 'Umwandeln',
  converting: 'Wandle um… $PCT$ %',
  convertQueued: 'noch $N$ in der Warteschlange',
  convertError: 'Umwandlung fehlgeschlagen: $MSG$',

  resultsTitle: 'Umgewandelte Dateien',
  resultsHint: 'Jede Umwandlung bleibt erhalten, sodass du Einstellungen direkt vergleichen kannst.',
  clearAll: 'Alle entfernen',
  removeResult: 'Entfernen',
  download: 'Herunterladen',
  showCommand: 'FFmpeg-Befehl',
  noPlayback: 'Dieser Browser kann $FORMAT$ nicht abspielen — die Datei ist in Ordnung, lade sie herunter, um sie anderswo abzuspielen.',
  sizeDelta: '$PCT$ % der Quelle',
  fromSource: 'aus $NAME$',

  noteSampleRate: '$FROM$ wird von $CODEC$ nicht unterstützt — stattdessen $TO$ verwendet.',
  noteBitrate: '$FROM$ kbps liegt hier außerhalb des zulässigen Bereichs — stattdessen $TO$ kbps verwendet.',
  noteNoJoint: '$CODEC$ hat keinen Joint-Stereo-Schalter — gewöhnliches Stereo verwendet.',
  noteJointMonoSource: 'Die Quelle ist mono, es gibt also kein Stereobild zum Zusammenfassen.',

  howTitle: 'So funktioniert’s',
  howStep1: 'Ziehe eine Audiodatei auf die Seite oder klicke auf das Feld, um eine auszuwählen.',
  howStep2: 'Die Konverter-Engine — FFmpeg, kompiliert nach WebAssembly — lädt einmal und bleibt danach im Browser-Cache.',
  howStep3: 'Wähle ein Format und seine Einstellungen und klicke auf Umwandeln. Ändere die Einstellungen und wandle erneut um, um zu vergleichen.',
  howStep4: 'Spiele jedes Ergebnis direkt ab oder lade es herunter. Es wird nichts hochgeladen und nichts gelöscht, bis du die Liste leerst.',
  engineNote: 'Die Umwandlung läuft vollständig auf deinem Rechner, in einem Web Worker, mit <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" target="_blank" rel="noopener">ffmpeg.wasm</a> — FFmpeg 5.1.4, kompiliert nach WebAssembly. Die vollständige Attribution steht unter <a href="licenses.html">Lizenzen</a>.',

  footerSource: 'Quellcode',
  footerLicenses: 'Lizenzen',
  footerPrivacy: 'Datenschutz',
  footerImprint: 'Impressum',
  footerCopyright: '© 2026 Macusercom',
  backToApp: '← Zurück zur App',
  backToReCoding: '← Zurück zu ReCoding',
  imprintTitle: 'Impressum',
  privacyTitle: 'Datenschutzerklärung',
  licensesTitle: 'Lizenzen & Attribution',
  indexPageTitle: 'ReCoding – Audio im Browser umwandeln',
  imprintPageTitle: 'Impressum – ReCoding',
  privacyPageTitle: 'Datenschutz – ReCoding',
  licensesPageTitle: 'Lizenzen – ReCoding',

  chipCompression: 'Stufe $N$',
  chipBitDepth: '$N$ Bit',
  chipBitDepthFloat: '32 Bit Fließkomma',
};

// ---------------------------------------------------------------------------
// Legal bodies. Copied verbatim from the LUFSly site — do not edit the four
// *Body strings below, including the fairesRecht.at credit that closes each
// one. They are the operator's published legal text.
// ---------------------------------------------------------------------------

DE.imprintBody = `
<h4>Impressum</h4>
<p><b>Informationen und Offenlegung gemäß §5 (1) ECG, § 25 MedienG, § 63 GewO und § 14 UGB</b></p>
<p><b>Webseitenbetreiber:</b> Christoph Neuwirth</p>
<p><b>Anschrift:</b> Breitenfurterstraße 394/9, 1230 Wien</p>
<p><b>UID-Nr:</b> <br><b>Gewerbeaufsichtbehörde:</b> <br><b>Mitgliedschaften:</b></p>
<p><b>Kontaktdaten:</b><br>Telefon: +43 681 10784594<br>Email: hi2026 [at] christoph [strich] neuwirth [punkt] at<br>Fax:</p>
<p><b>Anwendbare Rechtsvorschrift:</b> www.ris.bka.gv.at <br><b>Berufsbezeichnung:</b></p>
<p><b>Online Streitbeilegung:</b> Verbraucher, welche in Österreich oder in einem sonstigen Vertragsstaat der ODR-VO niedergelassen sind, haben die Möglichkeit Probleme bezüglich dem entgeltlichen Kauf von Waren oder Dienstleistungen im Rahmen einer Online-Streitbeilegung (nach OS, AStG) zu lösen. Die Europäische Kommission stellt eine Plattform hierfür bereit: https://ec.europa.eu/consumers/odr</p>
<p><b>Urheberrecht:</b> Die Inhalte dieser Webseite unterliegen, soweit dies rechtlich möglich ist, diversen Schutzrechten (z.B dem Urheberrecht). Jegliche Verwendung/Verbreitung von bereitgestelltem Material, welche urheberrechtlich untersagt ist, bedarf schriftlicher Zustimmung des Webseitenbetreibers.</p>
<p><b>Haftungsausschluss:</b> Trotz sorgfältiger inhaltlicher Kontrolle übernimmt der Webseitenbetreiber dieser Webseite keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich. Sollten Sie dennoch auf ausgehende Links aufmerksam werden, welche auf eine Webseite mit rechtswidriger Tätigkeit/Information verweisen, ersuchen wir um dementsprechenden Hinweis, um diese nach § 17 Abs. 2 ECG umgehend zu entfernen.<br>Die Urheberrechte Dritter werden vom Betreiber dieser Webseite mit größter Sorgfalt beachtet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden derartiger Rechtsverletzungen werden wir den betroffenen Inhalt umgehend entfernen.</p>
<p><span>Rechtstext von </span>Quelle: fairesRecht.at in Kooperation mit <b><a href="https://kredit123.at/">Immobilienkredit Vergleich</a></b></p>`;

EN.imprintBody = `
<h4>Legal Notice</h4>
<p><b>Information and disclosure pursuant to §5 (1) ECG, §25 Media Act, §63 Trade Regulation Act and §14 UGB</b></p>
<p><b>Website operator:</b> Christoph Neuwirth</p>
<p><b>Address:</b> Breitenfurterstraße 394/9, 1230 Vienna, Austria</p>
<p><b>VAT ID No.:</b> <br><b>Trade supervisory authority:</b> <br><b>Memberships:</b></p>
<p><b>Contact details:</b><br>Telephone: +43 681 10784594<br>Email: hi2026 [at] christoph [strich] neuwirth [punkt] at<br>Fax:</p>
<p><b>Applicable legal provision:</b> www.ris.bka.gv.at <br><b>Professional title:</b></p>
<p><b>Online dispute resolution:</b> Consumers established in Austria or in another contracting state of the ODR Regulation have the option of resolving problems concerning the paid purchase of goods or services through online dispute resolution (under OS, AStG). The European Commission provides a platform for this: https://ec.europa.eu/consumers/odr</p>
<p><b>Copyright:</b> The contents of this website are subject, insofar as legally possible, to various protective rights (e.g. copyright). Any use/distribution of provided material that is prohibited by copyright requires the written consent of the website operator.</p>
<p><b>Disclaimer:</b> Despite careful content control, the website operator of this website assumes no liability for the content of external links. The operators of the linked pages are solely responsible for their content. Should you nevertheless become aware of outgoing links that refer to a website with unlawful activity/information, we request an appropriate notice so that these can be removed immediately in accordance with § 17 para. 2 ECG.<br>The copyrights of third parties are observed with the greatest care by the operator of this website. Should you nevertheless become aware of a copyright infringement, we ask for an appropriate notice. If such legal infringements become known, we will remove the affected content immediately.</p>
<p><span>Legal text from source: </span>fairesRecht.at in cooperation with <b><a href="https://kredit123.at/">Immobilienkredit Vergleich</a></b></p>`;

DE.privacyBody = `
<h3>Erklärung zur Informationspflicht</h3>
<p><strong>Datenschutzerklärung</strong></p>
<p>In folgender Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Webseite. Wir erheben und verarbeiten personenbezogene Daten nur auf Grundlage der gesetzlichen Bestimmungen (Datenschutzgrundverordnung, Telekommunikationsgesetz 2003).</p>
<p>Sobald Sie als Benutzer auf unsere Webseite zugreifen oder diese besuchen wird Ihre IP-Adresse, Beginn sowie Beginn und Ende der Sitzung erfasst. Dies ist technisch bedingt und stellt somit ein berechtigtes Interesse iSv Art 6 Abs 1 lit f DSGVO.</p>
<h5>Kontakt mit uns</h5>
<p>Wenn Sie uns, entweder über unser Kontaktformular auf unserer Webseite, oder per Email kontaktieren, dann werden die von Ihnen an uns übermittelten Daten zwecks Bearbeitung Ihrer Anfrage oder für den Fall von weiteren Anschlussfragen für sechs Monate bei uns gespeichert. Es erfolgt, ohne Ihre Einwilligung, keine Weitergabe Ihrer übermittelten Daten.</p>
<h5>Cookies</h5>
<p>Unsere Website verwendet so genannte Cookies. Dabei handelt es sich um kleine Textdateien, die mit Hilfe des Browsers auf Ihrem Endgerät abgelegt werden. Sie richten keinen Schaden an. Wir nutzen Cookies dazu, unser Angebot nutzerfreundlich zu gestalten. Einige Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese löschen. Sie ermöglichen es uns, Ihren Browser beim nächsten Besuch wiederzuerkennen. Wenn Sie dies nicht wünschen, so können Sie Ihren Browser so einrichten, dass er Sie über das Setzen von Cookies informiert und Sie dies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalität unserer Website eingeschränkt sein.</p>
<h5>Google Fonts</h5>
<p>Unsere Website verwendet Schriftarten von „Google Fonts". Der Dienstanbieter dieser Funktion ist:</p>
<ul><li>Google Ireland Limited Gordon House, Barrow Street Dublin 4. Ireland</li></ul>
<p>Tel: +353 1 543 1000</p>
<p>Beim Aufrufen dieser Webseite lädt Ihr Browser Schriftarten und speichert diese in den Cache. Da Sie, als Besucher der Webseite, Daten des Dienstanbieters empfangen kann Google unter Umständen Cookies auf Ihrem Rechner setzen oder analysieren.</p>
<p>Die Nutzung von „Google-Fonts" dient der Optimierung unserer Dienstleistung und der einheitlichen Darstellung von Inhalten. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar.</p>
<p>Weitere Informationen zu Google Fonts erhalten Sie unter folgendem Link:</p>
<ul><li><a href="https://developers.google.com/fonts/faq">https://developers.google.com/fonts/faq</a></li></ul>
<p>Weitere Informationen über den Umgang mit Nutzerdaten von Google können Sie der Datenschutzerklärung entnehmen:</p>
<ul><li><a href="https://policies.google.com/privacy?hl=de">https://policies.google.com/privacy?hl=de</a></li></ul>
<p>Google verarbeitet die Daten auch in den USA, hat sich jedoch dem<br>EU-US Privacy-Shield unterworfen.</p>
<p><a href="https://www.privacyshield.gov/EU-US-Framework">https://www.privacyshield.gov/EU-US-Framework</a></p>
<h5>Server-Log Files</h5>
<p>Diese Webseite und der damit verbundene Provider erhebt im Zuge der Webseitennutzung automatisch Informationen im Rahmen sogenannter „Server-Log Files". Dies betrifft insbesondere:</p>
<ul>
  <li>IP-Adresse oder Hostname</li>
  <li>den verwendeten Browser</li>
  <li>Aufenthaltsdauer auf der Webseite sowie Datum und Uhrzeit</li>
  <li>aufgerufene Seiten der Webseite</li>
  <li>Spracheinstellungen und Betriebssystem</li>
  <li>„Leaving-Page" (auf welcher URL hat der Benutzer die Webseite verlassen)</li>
  <li>ISP (Internet Service Provider)</li>
</ul>
<p>Diese erhobenen Informationen werden nicht personenbezogen verarbeitet oder mit personenbezogenen Daten in Verbindung gebracht.</p>
<p>Der Webseitenbetreiber behält es sich vor, im Falle von Bekanntwerden rechtswidriger Tätigkeiten, diese Daten auszuwerten oder zu überprüfen.</p>
<h5>Ihre Rechte als Betroffener</h5>
<p>Sie als Betroffener haben bezüglich Ihrer Daten, welche bei uns gespeichert sind grundsätzlich ein Recht auf:</p>
<ul>
  <li>Auskunft</li>
  <li>Löschung der Daten</li>
  <li>Berichtigung der Daten</li>
  <li>Übertragbarkeit der Daten</li>
  <li>Wiederruf und Widerspruch zur Datenverarbeitung</li>
  <li>Einschränkung</li>
</ul>
<p>Wenn sie vermuten, dass im Zuge der Verarbeitung Ihrer Daten Verstöße gegen das Datenschutzrecht passiert sind, so haben Sie die Möglichkeit sich bei uns (hi2026 [at] christoph [strich] neuwirth [punkt] at) oder der Datenschutzbehörde zu beschweren.</p>
<h5>Sie erreichen uns unter folgenden Kontaktdaten:</h5>
<p><b>Webseitenbetreiber:</b> Christoph Neuwirth<br><b>Telefonnummer:</b> +43 681 10784594<br><b>Email:</b> hi2026 [at] christoph [strich] neuwirth [punkt] at</p>
<p><span>Rechtstext von </span>Quelle: fairesRecht.at in Kooperation mit <b><a href="https://kredit123.at/immobilienkredit-finanzierung-vergleich-rechner">Immobilienkredit Rechner</a></b></p>`;

EN.privacyBody = `
<h3>Declaration on the Duty to Provide Information</h3>
<p><strong>Privacy Policy</strong></p>
<p>In the following privacy policy, we inform you about the most important aspects of data processing within the scope of our website. We collect and process personal data only on the basis of the statutory provisions (General Data Protection Regulation, Telecommunications Act 2003).</p>
<p>As soon as you, as a user, access or visit our website, your IP address, start time, as well as the beginning and end of the session are recorded. This is technically necessary and therefore constitutes a legitimate interest within the meaning of Art. 6 para. 1 lit. f GDPR.</p>
<h5>Contacting us</h5>
<p>If you contact us, either via our contact form on our website or by email, the data you transmit to us will be stored by us for six months for the purpose of processing your inquiry or in case of further follow-up questions. Your transmitted data will not be passed on without your consent.</p>
<h5>Cookies</h5>
<p>Our website uses so-called cookies. These are small text files that are stored on your device with the help of the browser. They do not cause any damage. We use cookies to make our offer user-friendly. Some cookies remain stored on your device until you delete them. They enable us to recognize your browser on your next visit. If you do not want this, you can set your browser so that it informs you about the setting of cookies and you only allow this in individual cases. If cookies are disabled, the functionality of our website may be limited.</p>
<h5>Google Fonts</h5>
<p>Our website uses fonts from "Google Fonts". The service provider of this function is:</p>
<ul><li>Google Ireland Limited Gordon House, Barrow Street Dublin 4. Ireland</li></ul>
<p>Tel: +353 1 543 1000</p>
<p>When this website is accessed, your browser loads fonts and stores them in the cache. Since you, as a visitor to the website, receive data from the service provider, Google may, under certain circumstances, set or analyze cookies on your computer.</p>
<p>The use of "Google Fonts" serves to optimize our service and to present content uniformly. This constitutes a legitimate interest within the meaning of Art. 6 para. 1 lit. f GDPR.</p>
<p>Further information about Google Fonts can be found at the following link:</p>
<ul><li><a href="https://developers.google.com/fonts/faq">https://developers.google.com/fonts/faq</a></li></ul>
<p>Further information about Google's handling of user data can be found in the privacy policy:</p>
<ul><li><a href="https://policies.google.com/privacy?hl=de">https://policies.google.com/privacy?hl=de</a></li></ul>
<p>Google also processes data in the USA, but has submitted to the<br>EU-US Privacy Shield.</p>
<p><a href="https://www.privacyshield.gov/EU-US-Framework">https://www.privacyshield.gov/EU-US-Framework</a></p>
<h5>Server Log Files</h5>
<p>This website and the associated provider automatically collect information in the course of website use within the scope of so-called "server log files". This particularly concerns:</p>
<ul>
  <li>IP address or hostname</li>
  <li>the browser used</li>
  <li>duration of stay on the website as well as date and time</li>
  <li>pages of the website accessed</li>
  <li>language settings and operating system</li>
  <li>"Leaving page" (the URL on which the user left the website)</li>
  <li>ISP (Internet Service Provider)</li>
</ul>
<p>This collected information is not processed in a personal manner or linked to personal data.</p>
<p>The website operator reserves the right, in the event that unlawful activities become known, to evaluate or check this data.</p>
<h5>Your rights as a data subject</h5>
<p>As a data subject, you generally have the following rights regarding your data stored by us:</p>
<ul>
  <li>Information</li>
  <li>Deletion of the data</li>
  <li>Correction of the data</li>
  <li>Data portability</li>
  <li>Withdrawal and objection to data processing</li>
  <li>Restriction</li>
</ul>
<p>If you suspect that violations of data protection law have occurred in the course of processing your data, you have the option to complain to us (hi2026 [at] christoph [strich] neuwirth [punkt] at) or to the data protection authority.</p>
<h5>You can reach us at the following contact details:</h5>
<p><b>Website operator:</b> Christoph Neuwirth<br><b>Telephone number:</b> +43 681 10784594<br><b>Email:</b> hi2026 [at] christoph [strich] neuwirth [punkt] at</p>
<p><span>Legal text from source: </span>fairesRecht.at in cooperation with <b><a href="https://kredit123.at/">Immobilienkredit Vergleich</a></b></p>`;

const STRINGS = { en: EN, de: DE };

let lang = 'en';
const listeners = [];

// Same substitution contract as chrome.i18n.getMessage: $NAME$ placeholders
// are filled positionally from `subs`.
export function msg(key, subs) {
  const raw = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (!subs) return raw;
  const list = Array.isArray(subs) ? subs : [subs];
  let i = 0;
  return raw.replace(/\$[A-Z_]+\$/g, () => (i < list.length ? String(list[i++]) : ''));
}

export function getLang() {
  return lang;
}

export function onLangChange(cb) {
  listeners.push(cb);
}

export function applyLang(next) {
  lang = next === 'de' ? 'de' : 'en';
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  document.documentElement.lang = lang;

  const titleKey = document.body.dataset.titleKey;
  if (titleKey) document.title = msg(titleKey);

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = msg(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    el.innerHTML = msg(el.dataset.i18nHtml);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = msg(el.dataset.i18nPlaceholder);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const text = msg(el.dataset.i18nAria);
    el.setAttribute('aria-label', text);
    el.title = text;
  }
  // Info icons: native tooltip via title, plus a11y labelling.
  for (const el of document.querySelectorAll('[data-info]')) {
    const text = msg(el.dataset.info);
    el.title = text;
    el.setAttribute('aria-label', text);
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'img');
  }
  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  }
  for (const cb of listeners) cb(lang);
}

// Wires the DE/EN buttons and restores the stored choice, defaulting to the
// browser language.
export function initLang() {
  let stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch {}
  const initial = stored === 'de' || stored === 'en'
    ? stored
    : (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  }
  applyLang(initial);
}
