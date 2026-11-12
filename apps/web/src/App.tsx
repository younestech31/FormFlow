import { useEffect, useRef, useState } from 'react';
import { clampFieldRectangle, detectLabelAnchors } from '@formflow/core';
import type { FieldCandidate } from '@formflow/core';
import type { PdfInspection } from '@formflow/pdf-engine';

type Language = 'ar' | 'fr' | 'en';
const messages = {
  ar: {
    eyebrow: 'مساحة عمل محلية للمستندات', title: 'استماراتك، في مكان واحد.',
    intro: 'افحص النصوص والحقول والأشكال الهندسية داخل ملفات PDF محليًا، دون رفع مستنداتك إلى خادم.',
    importTitle: 'ابدأ بمستند PDF', importHint: 'اختر ملفًا من جهازك. تتم القراءة محليًا.',
    choose: 'اختيار ملف PDF', privacy: 'ملفاتك تبقى على جهازك', local: 'معالجة محلية',
    offline: 'مصمم للعمل دون اتصال بعد التحميل', noAi: 'قواعد هندسية دون AI أو OCR',
    features: 'ما الذي يجهزه FormFlow؟', featureOne: 'فحص حقول PDF الأصلية',
    featureOneText: 'قراءة الحقول التفاعلية الموجودة أصلًا داخل الملف.',
    featureTwo: 'اقتراحات قابلة للمراجعة',
    featureTwoText: 'استخراج النصوص ومواقعها، ورصد المستطيلات والخطوط التي قد تمثل خانات فارغة.',
    featureThree: 'إضافة يدوية دقيقة',
    featureThreeText: 'أضف خانة يدويًا، وعدّل تسميتها ونوعها، ثم اسحبها وغيّر حجمها فوق معاينة الصفحة.',
    report: 'نتيجة الفحص المحلي', pages: 'الصفحات', textItems: 'مقاطع النص',
    existing: 'حقول PDF الأصلية', suggestions: 'اقتراحات أولية', geometryCount: 'خانات هندسية', geometryField: 'خانة مستطيلة', geometryCheckbox: 'مربع اختيار', previewTitle: 'معاينة الصفحة الأولى', previewInfo: 'الإطارات الزرقاء تمثل مواضع مقترحة للمراجعة.', previewError: 'تعذرت معاينة الصفحة في هذا الملف.',
    addField: 'إضافة خانة يدويًا', fieldLabel: 'تسمية الخانة', fieldType: 'نوع الخانة',
    deleteField: 'حذف', moveResizeHint: 'اسحب الإطار لتحريكه، واسحب المقبض لتغيير حجمه.',
    manualField: 'حقل جديد', textType: 'نص', multilineType: 'نص متعدد الأسطر',
    checkboxType: 'مربع اختيار', radioType: 'اختيار دائري', dateType: 'تاريخ',
    selectType: 'قائمة اختيار', signatureType: 'توقيع', editorTitle: 'مراجعة الحقول وتحريرها',
    noFieldsYet: 'لا توجد خانات لهذه الصفحة بعد. أضف خانة يدويًا.',
    caveat: 'الاقتراحات أولية وليست حقولًا مؤكدة. راجعها قبل استخدامها.',
    noText: 'لم يُعثر على نص قابل للاستخراج. قد يكون الملف صورة ممسوحة؛ يمكن رصد بعض أشكاله الهندسية، لكن لا يمكن قراءة تسمياتها دون OCR.',
    scanning: 'جارٍ فحص الملف محليًا...', selectAnother: 'اختيار ملف آخر',
    footer: 'FormFlow مشروع مفتوح المصدر قيد التأسيس',
    error: 'تعذر قراءة الملف. تحقق من أنه PDF صالح وغير محمي بكلمة مرور.',
    sizeError: 'حجم الملف يتجاوز الحد الأولي البالغ 100 ميغابايت.',
    planned: 'قيد التطوير', language: 'اللغة', saved: 'لم يتم رفع الملف إلى الإنترنت.'
  },
  fr: {
    eyebrow: 'Espace documentaire local', title: 'Vos formulaires, au même endroit.',
    intro: 'Inspectez localement le texte, les champs et les formes géométriques des PDF, sans envoyer vos documents vers un serveur.',
    importTitle: 'Commencer avec un PDF', importHint: 'Choisissez un fichier. Le traitement est local.',
    choose: 'Choisir un PDF', privacy: 'Vos fichiers restent sur votre appareil', local: 'Traitement local',
    offline: 'Conçu pour fonctionner hors ligne après chargement', noAi: 'Règles géométriques, sans IA ni OCR',
    features: 'Ce que prépare FormFlow', featureOne: 'Champs PDF existants',
    featureOneText: 'Lecture des champs interactifs déjà présents dans le document.',
    featureTwo: 'Suggestions vérifiables',
    featureTwoText: 'Extraction du texte et détection des rectangles et lignes pouvant représenter des champs vides.',
    featureThree: 'Ajout manuel précis',
    featureThreeText: 'Ajoutez un champ, modifiez son libellé et son type, puis déplacez-le et redimensionnez-le sur l’aperçu de la première page.',
    report: 'Résultat de l’inspection locale', pages: 'Pages', textItems: 'Fragments de texte',
    existing: 'Champs PDF existants', suggestions: 'Suggestions initiales', geometryCount: 'Champs géométriques', geometryField: 'Champ rectangulaire', geometryCheckbox: 'Case à cocher', previewTitle: 'Aperçu de la première page', previewInfo: 'Les cadres bleus indiquent des emplacements proposés à vérifier.', previewError: 'Impossible de prévisualiser cette page.',
    addField: 'Ajouter un champ', fieldLabel: 'Libellé du champ', fieldType: 'Type de champ',
    deleteField: 'Supprimer', moveResizeHint: 'Faites glisser le cadre pour le déplacer et la poignée pour le redimensionner.',
    manualField: 'Nouveau champ', textType: 'Texte', multilineType: 'Texte multiligne',
    checkboxType: 'Case à cocher', radioType: 'Choix radio', dateType: 'Date',
    selectType: 'Liste de choix', signatureType: 'Signature', editorTitle: 'Vérifier et modifier les champs',
    noFieldsYet: 'Aucun champ sur cette page. Ajoutez-en un manuellement.',
    caveat: 'Les suggestions sont heuristiques et doivent être vérifiées.',
    noText: 'Aucun texte extractible. Le fichier peut être un scan ; certaines formes peuvent être détectées, mais leurs libellés ne peuvent pas être lus sans OCR.',
    scanning: 'Inspection locale en cours…', selectAnother: 'Choisir un autre fichier',
    footer: 'FormFlow — fondation en cours de construction',
    error: 'Impossible de lire le PDF. Vérifiez le fichier et son éventuel mot de passe.',
    sizeError: 'Le fichier dépasse la limite initiale de 100 Mo.',
    planned: 'En développement', language: 'Langue', saved: 'Le fichier n’a pas été envoyé sur Internet.'
  },
  en: {
    eyebrow: 'Local document workspace', title: 'Your forms, in one place.',
    intro: 'Inspect PDF text, fields, and geometric shapes locally without uploading documents to a server.',
    importTitle: 'Start with a PDF', importHint: 'Choose a file. Processing happens locally.',
    choose: 'Choose PDF', privacy: 'Your files stay on your device', local: 'Local processing',
    offline: 'Designed to work offline after loading', noAi: 'Geometry rules, no AI or OCR',
    features: 'What FormFlow is building', featureOne: 'Existing PDF fields',
    featureOneText: 'Read interactive fields already embedded in a document.',
    featureTwo: 'Reviewable suggestions',
    featureTwoText: 'Extract text and detect rectangles and lines that may represent blank form fields.',
    featureThree: 'Precise manual editing',
    featureThreeText: 'Add a field, edit its label and type, then move and resize it on the page preview.',
    report: 'Local inspection result', pages: 'Pages', textItems: 'Text fragments',
    existing: 'Existing PDF fields', suggestions: 'Initial suggestions', geometryCount: 'Geometric fields', geometryField: 'Rectangular field', geometryCheckbox: 'Checkbox', previewTitle: 'First-page preview', previewInfo: 'Blue outlines show suggested areas to review.', previewError: 'This page could not be previewed.',
    addField: 'Add field manually', fieldLabel: 'Field label', fieldType: 'Field type',
    deleteField: 'Delete', moveResizeHint: 'Drag a box to move it; drag its handle to resize it.',
    manualField: 'New field', textType: 'Text', multilineType: 'Multiline text',
    checkboxType: 'Checkbox', radioType: 'Radio choice', dateType: 'Date',
    selectType: 'Dropdown', signatureType: 'Signature', editorTitle: 'Review and edit fields',
    noFieldsYet: 'No fields on this page yet. Add one manually.',
    caveat: 'Suggestions are heuristic and must be reviewed before use.',
    noText: 'No extractable text was found. This may be a scan; some geometric shapes may still be detected, but their labels cannot be read without OCR.',
    scanning: 'Inspecting locally…', selectAnother: 'Choose another file',
    footer: 'FormFlow — project foundation',
    error: 'The PDF could not be read. Check that it is valid and not password-protected.',
    sizeError: 'The file exceeds the initial 100 MB limit.',
    planned: 'In progress', language: 'Language', saved: 'The file was not uploaded to the internet.'
  }
} as const;

function buildCandidates(analysis: PdfInspection): FieldCandidate[] {
  const fragments = analysis.pages.flatMap((page) => page.textItems);
  const geometry = analysis.pages.flatMap((page) => page.geometryCandidates);
  const labels = detectLabelAnchors(fragments);
  return [
    ...geometry,
    ...labels.filter((label) => !geometry.some((shape) =>
      shape.pageNumber === label.pageNumber &&
      Math.max(0, Math.min(shape.x + shape.width, label.x + label.width) - Math.max(shape.x, label.x)) *
      Math.max(0, Math.min(shape.y + shape.height, label.y + label.height) - Math.max(shape.y, label.y)) /
      Math.max(1, Math.min(shape.width * shape.height, label.width * label.height)) > 0.45
    ))
  ];
}

function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<PdfInspection | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [editableFields, setEditableFields] = useState<FieldCandidate[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const dragRef = useRef<{ id: string; pointerId: number; mode: 'move' | 'resize'; offsetX: number; offsetY: number; } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const t = messages[language];
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  async function handleFile(file?: File) {
    if (!file) return;
    setError(''); setAnalysis(null); setFileName(file.name); setActiveFile(null); setPreviewSize(null); setPreviewError(''); setEditableFields([]); setSelectedFieldId(''); dragRef.current = null;
    if (file.size > 100 * 1024 * 1024) { setError(t.sizeError); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.error); return;
    }
    setActiveFile(file);
    setBusy(true);
    try {
      const { inspectPdf } = await import('@formflow/pdf-engine');
      const result = await inspectPdf(file);
      const candidates = buildCandidates(result);
      setEditableFields(candidates);
      setSelectedFieldId(candidates[0]?.id ?? '');
      setAnalysis(result);
    }
    catch (cause) { console.error('PDF inspection failed.', cause); setError(t.error); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!analysis || !activeFile || !previewCanvasRef.current) return;
    let cancelled = false;
    setPreviewError('');
    import('@formflow/pdf-engine').then(({ renderPdfPage }) =>
      renderPdfPage(activeFile, 1, previewCanvasRef.current as HTMLCanvasElement)
    ).then((size) => {
      if (!cancelled) setPreviewSize(size);
    }).catch((cause) => {
      console.error('PDF preview failed.', cause);
      if (!cancelled) setPreviewError(t.previewError);
    });
    return () => { cancelled = true; };
  }, [analysis, activeFile, t.previewError]);

  const suggestions = editableFields;
  const geometrySuggestions = editableFields.filter((field) => field.method === 'geometry');

  function pagePoint(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * (previewSize?.width ?? bounds.width),
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * (previewSize?.height ?? bounds.height)
    };
  }

  function handlePreviewPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const target = event.target as Element;
    const group = target.closest('[data-field-id]');
    const id = group?.getAttribute('data-field-id');
    const field = editableFields.find((item) => item.id === id);
    if (!field) return;
    event.preventDefault();
    const point = pagePoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedFieldId(field.id);
    dragRef.current = {
      id: field.id, pointerId: event.pointerId,
      mode: target.closest('[data-resize-handle]') ? 'resize' : 'move',
      offsetX: point.x - field.x, offsetY: point.y - field.y
    };
  }

  function handlePreviewPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !previewSize) return;
    const point = pagePoint(event);
    setEditableFields((current) => current.map((field) => {
      if (field.id !== drag.id) return field;
      const rectangle = drag.mode === 'move'
        ? clampFieldRectangle({ x: point.x - drag.offsetX, y: point.y - drag.offsetY, width: field.width, height: field.height }, previewSize)
        : clampFieldRectangle({ x: field.x, y: field.y, width: point.x - field.x, height: point.y - field.y }, previewSize);
      return { ...field, ...rectangle };
    }));
  }

  function handlePreviewPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function addManualField() {
    if (!previewSize) return;
    const rectangle = clampFieldRectangle({ x: 40, y: 40, width: Math.min(210, previewSize.width - 16), height: 30 }, previewSize);
    const field: FieldCandidate = {
      id: 'manual-' + Date.now(), label: t.manualField, kind: 'text',
      pageNumber: 1, ...rectangle, confidence: 1, method: 'manual'
    };
    setEditableFields((current) => [...current, field]);
    setSelectedFieldId(field.id);
  }

  function updateField(id: string, update: Partial<Pick<FieldCandidate, 'label' | 'kind'>>) {
    setEditableFields((current) => current.map((field) => field.id === id ? { ...field, ...update } : field));
  }

  function deleteField(id: string) {
    setEditableFields((current) => current.filter((field) => field.id !== id));
    if (selectedFieldId === id) setSelectedFieldId('');
  }

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
            <Metric label={t.geometryCount} value={geometrySuggestions.length} />
          </div>
          <section className="preview-card">
            <div className="preview-heading"><h3>{t.previewTitle}</h3><p>{t.previewInfo}</p></div>
            <div className="pdf-preview">
              <canvas ref={previewCanvasRef} aria-label={t.previewTitle} />
              {previewSize && <svg className="preview-overlay" viewBox={'0 0 ' + previewSize.width + ' ' + previewSize.height}
                preserveAspectRatio="none" onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove} onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerUp}>
                {suggestions.filter((item) => item.pageNumber === 1).map((item) => {
                  const selected = item.id === selectedFieldId;
                  const stroke = item.kind === 'checkbox' ? '#248a5c' : '#3859d6';
                  return <g key={item.id} data-field-id={item.id} className="editable-field-shape">
                    <rect x={item.x} y={item.y} width={item.width} height={item.height}
                      rx={item.kind === 'checkbox' ? 2 : 3}
                      fill={selected ? 'rgba(56,89,214,.17)' : (item.kind === 'checkbox' ? 'rgba(36,138,92,.10)' : 'rgba(56,89,214,.08)')}
                      stroke={selected ? '#1539bd' : stroke} strokeWidth={selected ? 2.5 : 1.5}>
                      <title>{item.label || (item.kind === 'checkbox' ? t.geometryCheckbox : t.geometryField)}</title>
                    </rect>
                    {item.label && <text x={item.x} y={Math.max(10, item.y - 4)} className="field-overlay-label">{item.label}</text>}
                    {selected && <circle data-resize-handle="true" cx={item.x + item.width} cy={item.y + item.height}
                      r="5" fill="#1539bd" stroke="#fff" strokeWidth="1.5" className="resize-handle" />}
                  </g>;
                })}
              </svg>}
            </div>
            {previewError && <p className="error-message" role="alert">{previewError}</p>}
            {previewSize && <div className="field-editor">
              <div className="field-editor-heading">
                <h4>{t.editorTitle}</h4>
                <button className="secondary-button" type="button" onClick={addManualField}>{t.addField}</button>
              </div>
              <p className="field-editor-hint">{t.moveResizeHint}</p>
              <div className="field-editor-list">
                {suggestions.filter((field) => field.pageNumber === 1).map((field) => (
                  <div className={'field-editor-row' + (field.id === selectedFieldId ? ' is-selected' : '')} key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}>
                    <label>
                      <span>{t.fieldLabel}</span>
                      <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })}
                        onFocus={() => setSelectedFieldId(field.id)} />
                    </label>
                    <label>
                      <span>{t.fieldType}</span>
                      <select value={field.kind} onChange={(event) => updateField(field.id, { kind: event.target.value as FieldCandidate['kind'] })}
                        onFocus={() => setSelectedFieldId(field.id)}>
                        <option value="text">{t.textType}</option>
                        <option value="multiline">{t.multilineType}</option>
                        <option value="checkbox">{t.checkboxType}</option>
                        <option value="radio">{t.radioType}</option>
                        <option value="date">{t.dateType}</option>
                        <option value="select">{t.selectType}</option>
                        <option value="signature">{t.signatureType}</option>
                      </select>
                    </label>
                    <button className="secondary-button danger-button" type="button" onClick={() => deleteField(field.id)} aria-label={t.deleteField}>{t.deleteField}</button>
                  </div>
                ))}
                {suggestions.filter((field) => field.pageNumber === 1).length === 0 &&
                  <p className="empty-editor">{t.noFieldsYet}</p>}
              </div>
            </div>}
          </section>
          {analysis.textItemCount === 0 && <p className="notice">{t.noText}</p>}
          {suggestions.length > 0 && <div className="suggestion-list">
            <p className="notice">{t.caveat}</p>
            {suggestions.slice(0, 12).map((item) => <span className="suggestion-chip" key={item.id}>{item.label || (item.kind === 'checkbox' ? t.geometryCheckbox : t.geometryField)}</span>)}
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
