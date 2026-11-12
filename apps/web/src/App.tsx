import { useRef, useState } from 'react';
import { detectLabelAnchors } from '@formflow/core';
import type { PdfInspection } from '@formflow/pdf-engine';

type Language = 'ar' | 'fr' | 'en';
const messages = {
  ar: {
    eyebrow: 'مساحة عمل محلية للمستندات', title: 'استماراتك، في مكان واحد.',
    intro: 'افحص ملفات PDF وراجع الحقول الموجودة دون رفع مستنداتك إلى خادم.',
    importTitle: 'ابدأ بمستند PDF', importHint: 'اختر ملفًا من جهازك. تتم القراءة محليًا.',
    choose: 'اختيار ملف PDF', privacy: 'ملفاتك تبقى على جهازك', local: 'معالجة محلية',
    offline: 'مصمم للعمل دون اتصال بعد التحميل', noAi: 'بلا ذكاء اصطناعي أو OCR',
    features: 'ما الذي يجهزه FormFlow؟', featureOne: 'فحص حقول PDF الأصلية',
    featureOneText: 'قراءة الحقول التفاعلية الموجودة أصلًا داخل الملف.',
    featureTwo: 'اقتراحات قابلة للمراجعة',
    featureTwoText: 'استخراج النصوص ومواقعها واقتراح مواضع أولية للعناوين المنتهية بنقطتين.',
    featureThree: 'إضافة يدوية دقيقة',
    featureThreeText: 'المحرر البصري قيد التطوير لإضافة الحقول وتحريكها وتغيير أحجامها.',
    report: 'نتيجة الفحص المحلي', pages: 'الصفحات', textItems: 'مقاطع النص',
    existing: 'حقول PDF الأصلية', suggestions: 'اقتراحات أولية',
    caveat: 'الاقتراحات أولية وليست حقولًا مؤكدة. راجعها قبل استخدامها.',
    noText: 'لم يُعثر على نص قابل للاستخراج. قد يكون الملف ممسوحًا ضوئيًا؛ لا يستخدم FormFlow OCR.',
    scanning: 'جارٍ فحص الملف محليًا...', selectAnother: 'اختيار ملف آخر',
    footer: 'FormFlow مشروع مفتوح المصدر قيد التأسيس',
    error: 'تعذر قراءة الملف. تحقق من أنه PDF صالح وغير محمي بكلمة مرور.',
    sizeError: 'حجم الملف يتجاوز الحد الأولي البالغ 100 ميغابايت.',
    planned: 'قيد التطوير', language: 'اللغة', saved: 'لم يتم رفع الملف إلى الإنترنت.'
  },
  fr: {
    eyebrow: 'Espace documentaire local', title: 'Vos formulaires, au même endroit.',
    intro: 'Inspectez les PDF et leurs champs sans envoyer vos documents vers un serveur.',
    importTitle: 'Commencer avec un PDF', importHint: 'Choisissez un fichier. Le traitement est local.',
    choose: 'Choisir un PDF', privacy: 'Vos fichiers restent sur votre appareil', local: 'Traitement local',
    offline: 'Conçu pour fonctionner hors ligne après chargement', noAi: 'Sans IA ni OCR',
    features: 'Ce que prépare FormFlow', featureOne: 'Champs PDF existants',
    featureOneText: 'Lecture des champs interactifs déjà présents dans le document.',
    featureTwo: 'Suggestions vérifiables',
    featureTwoText: 'Extraction du texte et de ses positions, puis suggestions préliminaires.',
    featureThree: 'Ajout manuel précis',
    featureThreeText: 'L’éditeur visuel est en cours de développement.',
    report: 'Résultat de l’inspection locale', pages: 'Pages', textItems: 'Fragments de texte',
    existing: 'Champs PDF existants', suggestions: 'Suggestions initiales',
    caveat: 'Les suggestions sont heuristiques et doivent être vérifiées.',
    noText: 'Aucun texte extractible. Le fichier peut être un scan ; aucun OCR n’est utilisé.',
    scanning: 'Inspection locale en cours…', selectAnother: 'Choisir un autre fichier',
    footer: 'FormFlow — fondation en cours de construction',
    error: 'Impossible de lire le PDF. Vérifiez le fichier et son éventuel mot de passe.',
    sizeError: 'Le fichier dépasse la limite initiale de 100 Mo.',
    planned: 'En développement', language: 'Langue', saved: 'Le fichier n’a pas été envoyé sur Internet.'
  },
  en: {
    eyebrow: 'Local document workspace', title: 'Your forms, in one place.',
    intro: 'Inspect PDFs and existing fields without uploading documents to a server.',
    importTitle: 'Start with a PDF', importHint: 'Choose a file. Processing happens locally.',
    choose: 'Choose PDF', privacy: 'Your files stay on your device', local: 'Local processing',
    offline: 'Designed to work offline after loading', noAi: 'No AI or OCR',
    features: 'What FormFlow is building', featureOne: 'Existing PDF fields',
    featureOneText: 'Read interactive fields already embedded in a document.',
    featureTwo: 'Reviewable suggestions',
    featureTwoText: 'Extract text and positions, then suggest conservative label anchors.',
    featureThree: 'Precise manual editing',
    featureThreeText: 'The visual field editor is under development.',
    report: 'Local inspection result', pages: 'Pages', textItems: 'Text fragments',
    existing: 'Existing PDF fields', suggestions: 'Initial suggestions',
    caveat: 'Suggestions are heuristic and must be reviewed before use.',
    noText: 'No extractable text was found. This may be a scan; FormFlow does not use OCR.',
    scanning: 'Inspecting locally…', selectAnother: 'Choose another file',
    footer: 'FormFlow — project foundation',
    error: 'The PDF could not be read. Check that it is valid and not password-protected.',
    sizeError: 'The file exceeds the initial 100 MB limit.',
    planned: 'In progress', language: 'Language', saved: 'The file was not uploaded to the internet.'
  }
} as const;

function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<PdfInspection | null>(null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = messages[language];
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  async function handleFile(file?: File) {
    if (!file) return;
    setError(''); setAnalysis(null); setFileName(file.name);
    if (file.size > 100 * 1024 * 1024) { setError(t.sizeError); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.error); return;
    }
    setBusy(true);
    try { const { inspectPdf } = await import('@formflow/pdf-engine'); setAnalysis(await inspectPdf(file)); }
    catch (cause) { console.error('PDF inspection failed.', cause); setError(t.error); }
    finally { setBusy(false); }
  }

  const textItems = analysis?.pages.flatMap((page) => page.textItems) ?? [];
  const suggestions = detectLabelAnchors(textItems);

  return (
    <main className="app-shell" dir={direction}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="FormFlow home">
          <span className="brand-mark">F</span><span>FormFlow</span>
        </a>
        <div className="topbar-actions">
          <span className="status-pill"><span className="status-dot" />{t.local}</span>
          <label className="language-picker">
            <span className="sr-only">{t.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option>
            </select>
          </label>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" />{t.eyebrow}</span>
          <h1>{t.title}</h1><p>{t.intro}</p>
          <div className="trust-row">
            <span><span className="tiny-check">✓</span>{t.privacy}</span>
            <span><span className="tiny-check">✓</span>{t.noAi}</span>
          </div>
        </div>
        <section className="upload-card" aria-labelledby="upload-title">
          <div className="upload-icon" aria-hidden="true">↥</div>
          <h2 id="upload-title">{t.importTitle}</h2><p>{t.importHint}</p>
          <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf"
            onChange={(event) => handleFile(event.target.files?.[0])} />
          <button className="primary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? t.scanning : t.choose}<span aria-hidden="true">↗</span>
          </button>
          <div className="upload-footnote">{t.saved}</div>
          {error && <p className="error-message" role="alert">{error}</p>}
        </section>
      </section>
      {busy && <div className="progress-line" role="status">{t.scanning}</div>}
      {analysis && (
        <section className="analysis-card" aria-live="polite">
          <div className="section-heading analysis-heading">
            <div><span className="eyebrow">{t.report}</span><h2>{fileName}</h2></div>
            <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>{t.selectAnother}</button>
          </div>
          <div className="metrics-grid">
            <Metric label={t.pages} value={analysis.pageCount} />
            <Metric label={t.textItems} value={analysis.textItemCount} />
            <Metric label={t.existing} value={analysis.existingFieldNames.length} />
            <Metric label={t.suggestions} value={suggestions.length} />
          </div>
          {analysis.textItemCount === 0 && <p className="notice">{t.noText}</p>}
          {suggestions.length > 0 && <div className="suggestion-list">
            <p className="notice">{t.caveat}</p>
            {suggestions.slice(0, 5).map((item) => <span className="suggestion-chip" key={item.id}>{item.label}</span>)}
          </div>}
        </section>
      )}
      <section className="features-section">
        <div className="section-heading">
          <div><span className="eyebrow">01 / FOUNDATION</span><h2>{t.features}</h2></div>
          <span className="muted-label">{t.planned}</span>
        </div>
        <div className="feature-grid">
          <Feature number="01" title={t.featureOne} description={t.featureOneText} />
          <Feature number="02" title={t.featureTwo} description={t.featureTwoText} />
          <Feature number="03" title={t.featureThree} description={t.featureThreeText} />
        </div>
      </section>
      <footer className="footer"><span>{t.footer}</span><span>{t.offline}</span></footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value.toLocaleString()}</strong></div>;
}
function Feature({ number, title, description }: { number: string; title: string; description: string }) {
  return <article className="feature-card"><span className="feature-number">{number}</span>
    <h3>{title}</h3><p>{description}</p></article>;
}
export default App;
