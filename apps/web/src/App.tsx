import { useEffect, useRef, useState } from 'react';
import { clampFieldRectangle, detectLabelAnchors } from '@formflow/core';
import type { FormField, FormTemplate } from '@formflow/core';
import arabicFontUrl from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff?url';
import latinFontUrl from '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-400-normal.woff?url';
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
    existing: 'حقول PDF الأصلية', suggestions: 'اقتراحات أولية', geometryCount: 'خانات هندسية', geometryField: 'خانة مستطيلة', geometryCheckbox: 'مربع اختيار', previewTitle: 'معاينة الصفحة', previewInfo: 'الإطارات الزرقاء تمثل مواضع مقترحة للمراجعة.', previewError: 'تعذرت معاينة الصفحة في هذا الملف.', pageLabel: 'الصفحة', previousPage: 'السابقة', nextPage: 'التالية',
    addField: 'إضافة خانة يدويًا', fieldLabel: 'تسمية الخانة', fieldType: 'نوع الخانة',
    deleteField: 'حذف', moveResizeHint: 'اسحب الإطار لتحريكه، واسحب المقبض لتغيير حجمه.',
    manualField: 'حقل جديد', textType: 'نص', multilineType: 'نص متعدد الأسطر',
    checkboxType: 'مربع اختيار', radioType: 'اختيار دائري', radioGroupLabel: 'مجموعة الاختيار', optionsLabel: 'خيارات القائمة (افصل بينها بفواصل)', dateType: 'تاريخ',
    selectType: 'قائمة اختيار', signatureType: 'توقيع', editorTitle: 'مراجعة الحقول وتحريرها',
    inspectorFields: 'الحقول', inspectorTemplates: 'القوالب', inspectorNative: 'حقول PDF', inspectorExport: 'التصدير',
    noFieldsYet: 'لا توجد خانات لهذه الصفحة بعد. أضف خانة يدويًا.',
    existingFieldsTitle: 'الحقول التفاعلية الموجودة أصلًا', nativeFieldsHint: 'يمكن تعبئتها مع الحقول المضافة.',
    chooseNativeValue: 'اختر قيمة', nativeFieldUnsupported: 'هذا النوع غير مدعوم بعد',
    nativeArabicUnsupported: 'لا يمكن وضع العربية في حقل PDF أصلي حتى الآن. استخدم خانة نصية أضفتها من FormFlow.',
    templatesTitle: 'قوالب محفوظة على هذا الجهاز', templateNameLabel: 'اسم القالب',
    templateNamePlaceholder: 'مثال: استمارة طلب وثيقة', saveTemplate: 'حفظ القالب',
    loadTemplate: 'تطبيق القالب', deleteTemplate: 'حذف القالب',
    noMatchingTemplates: 'لا توجد قوالب محفوظة لهذا المستند حتى الآن.',
    templateSaved: 'تم حفظ القالب محليًا على هذا الجهاز.',
    templateLoaded: 'تم تطبيق القالب. راجع مواضع الحقول قبل التصدير.',
    templateDeleted: 'تم حذف القالب المحلي.', templateStorageError: 'تعذر الوصول إلى التخزين المحلي.',
    templateMismatch: 'هذا القالب لا يطابق ملف PDF الحالي.',
    valueLabel: 'القيمة المراد إدراجها', valuePlaceholder: 'اكتب القيمة',
    exportButton: 'تعبئة وتنزيل PDF', exporting: 'جارٍ إنشاء ملف PDF...',
    exportSuccess: 'تم إنشاء PDF مع القيم وإعداده للتنزيل.',
    exportError: 'تعذر تصدير PDF. تحقق من القيم والصفحات ثم حاول مجددًا.',
    exportNote: 'تُدمج القيم داخل الصفحة كطبقة ثابتة؛ لا تتحول الحقول المخصصة إلى حقول PDF تفاعلية.',
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
    existing: 'Champs PDF existants', suggestions: 'Suggestions initiales', geometryCount: 'Champs géométriques', geometryField: 'Champ rectangulaire', geometryCheckbox: 'Case à cocher', previewTitle: 'Aperçu de la page', previewInfo: 'Les cadres bleus indiquent des emplacements proposés à vérifier.', previewError: 'Impossible de prévisualiser cette page.', pageLabel: 'Page', previousPage: 'Précédente', nextPage: 'Suivante',
    addField: 'Ajouter un champ', fieldLabel: 'Libellé du champ', fieldType: 'Type de champ',
    deleteField: 'Supprimer', moveResizeHint: 'Faites glisser le cadre pour le déplacer et la poignée pour le redimensionner.',
    manualField: 'Nouveau champ', textType: 'Texte', multilineType: 'Texte multiligne',
    checkboxType: 'Case à cocher', radioType: 'Choix radio', radioGroupLabel: 'Groupe radio', optionsLabel: 'Options de liste (séparées par des virgules)', dateType: 'Date',
    selectType: 'Liste de choix', signatureType: 'Signature', editorTitle: 'Vérifier et modifier les champs',
    inspectorFields: 'Champs', inspectorTemplates: 'Modèles', inspectorNative: 'Champs PDF', inspectorExport: 'Exporter',
    noFieldsYet: 'Aucun champ sur cette page. Ajoutez-en un manuellement.',
    existingFieldsTitle: 'Champs interactifs déjà présents', nativeFieldsHint: 'Ils peuvent être remplis avec les champs ajoutés.',
    chooseNativeValue: 'Choisir une valeur', nativeFieldUnsupported: 'Type non pris en charge',
    nativeArabicUnsupported: 'Le texte arabe dans un champ PDF natif n’est pas encore pris en charge. Utilisez un champ FormFlow ajouté.',
    templatesTitle: 'Modèles enregistrés sur cet appareil', templateNameLabel: 'Nom du modèle',
    templateNamePlaceholder: 'Ex. : Demande de document', saveTemplate: 'Enregistrer le modèle',
    loadTemplate: 'Appliquer le modèle', deleteTemplate: 'Supprimer le modèle',
    noMatchingTemplates: 'Aucun modèle enregistré pour ce document.',
    templateSaved: 'Modèle enregistré localement sur cet appareil.',
    templateLoaded: 'Modèle appliqué. Vérifiez les champs avant l’export.',
    templateDeleted: 'Modèle local supprimé.', templateStorageError: 'Stockage local indisponible.',
    templateMismatch: 'Ce modèle ne correspond pas au PDF actuel.',
    valueLabel: 'Valeur à insérer', valuePlaceholder: 'Saisir une valeur',
    exportButton: 'Remplir et télécharger le PDF', exporting: 'Création du PDF…',
    exportSuccess: 'Le PDF rempli est prêt à être téléchargé.',
    exportError: 'Impossible d’exporter le PDF. Vérifiez les valeurs et les pages.',
    exportNote: 'Les valeurs sont aplaties dans la page ; les champs ajoutés ne deviennent pas des champs PDF interactifs.',
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
    existing: 'Existing PDF fields', suggestions: 'Initial suggestions', geometryCount: 'Geometric fields', geometryField: 'Rectangular field', geometryCheckbox: 'Checkbox', previewTitle: 'Page preview', previewInfo: 'Blue outlines show suggested areas to review.', previewError: 'This page could not be previewed.', pageLabel: 'Page', previousPage: 'Previous', nextPage: 'Next',
    addField: 'Add field manually', fieldLabel: 'Field label', fieldType: 'Field type',
    deleteField: 'Delete', moveResizeHint: 'Drag a box to move it; drag its handle to resize it.',
    manualField: 'New field', textType: 'Text', multilineType: 'Multiline text',
    checkboxType: 'Checkbox', radioType: 'Radio choice', radioGroupLabel: 'Radio group', optionsLabel: 'Dropdown options (comma-separated)', dateType: 'Date',
    selectType: 'Dropdown', signatureType: 'Signature', editorTitle: 'Review and edit fields',
    inspectorFields: 'Fields', inspectorTemplates: 'Templates', inspectorNative: 'PDF fields', inspectorExport: 'Export',
    noFieldsYet: 'No fields on this page yet. Add one manually.',
    existingFieldsTitle: 'Existing interactive PDF fields', nativeFieldsHint: 'These can be filled together with added fields.',
    chooseNativeValue: 'Choose a value', nativeFieldUnsupported: 'This field type is not supported yet',
    nativeArabicUnsupported: 'Arabic in a native PDF field is not supported yet. Use a custom FormFlow text field.',
    templatesTitle: 'Templates saved on this device', templateNameLabel: 'Template name',
    templateNamePlaceholder: 'Example: Document request form', saveTemplate: 'Save template',
    loadTemplate: 'Apply template', deleteTemplate: 'Delete template',
    noMatchingTemplates: 'No saved templates match this document yet.',
    templateSaved: 'Template saved locally on this device.',
    templateLoaded: 'Template applied. Review field positions before exporting.',
    templateDeleted: 'Local template deleted.', templateStorageError: 'Local storage is unavailable.',
    templateMismatch: 'This template does not match the current PDF.',
    valueLabel: 'Value to insert', valuePlaceholder: 'Enter a value',
    exportButton: 'Fill and download PDF', exporting: 'Creating PDF…',
    exportSuccess: 'The filled PDF is ready to download.',
    exportError: 'Could not export the PDF. Check the values and pages, then retry.',
    exportNote: 'Values are flattened into the page; custom fields do not become interactive PDF form fields.',
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
  const nativeWidgets = analysis.pages.flatMap((page) => page.nativeWidgets);
  const labels = detectLabelAnchors(fragments, [...geometry, ...nativeWidgets]);
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

type MessageKey = keyof typeof messages.ar;

async function fingerprintFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toFormFields(fields: FieldCandidate[]): FormField[] {
  return fields.map((field) => ({
    id: field.id, name: field.id, label: field.label, kind: field.kind,
    pageNumber: field.pageNumber, x: field.x, y: field.y,
    width: field.width, height: field.height, required: false,
    method: field.method, confidence: field.confidence, group: field.group, options: field.options
  }));
}

function fromFormFields(fields: FormField[]): FieldCandidate[] {
  return fields.map((field) => ({
    id: field.id, label: field.label, kind: field.kind, pageNumber: field.pageNumber,
    x: field.x, y: field.y, width: field.width, height: field.height,
    method: field.method ?? 'manual', confidence: field.confidence ?? 1, group: field.group, options: field.options
  }));
}

function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<PdfInspection | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'fields' | 'templates' | 'native' | 'export'>('fields');
  const [fileName, setFileName] = useState('');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewWidth, setPreviewWidth] = useState(0);
  const [editableFields, setEditableFields] = useState<FieldCandidate[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [nativeFieldValues, setNativeFieldValues] = useState<Record<string, string | boolean>>({});
  const [activeFingerprint, setActiveFingerprint] = useState('');
  const [localTemplates, setLocalTemplates] = useState<FormTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateStatus, setTemplateStatus] = useState<MessageKey | ''>('');
  const [exportStatus, setExportStatus] = useState<MessageKey | ''>('');
  const [exporting, setExporting] = useState(false);
  const dragRef = useRef<{ id: string; pointerId: number; mode: 'move' | 'resize'; offsetX: number; offsetY: number; } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const t = messages[language];
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const compatibleTemplates = localTemplates.filter((template) =>
    template.pageCount === analysis?.pageCount &&
    (template.sourceFingerprint
      ? template.sourceFingerprint === activeFingerprint
      : template.sourceFileName === fileName)
  );

  useEffect(() => {
    let cancelled = false;
    import('@formflow/local-storage').then(({ listTemplates }) => listTemplates())
      .then((templates) => { if (!cancelled) setLocalTemplates(templates); })
      .catch((cause) => {
        console.error('Could not load local templates.', cause);
        if (!cancelled) setTemplateStatus('templateStorageError');
      });
    return () => { cancelled = true; };
  }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(''); setAnalysis(null); setCurrentPage(1); setActiveInspectorTab('fields'); setFileName(file.name); setActiveFile(null); setPreviewSize(null); setPreviewError('');
    setEditableFields([]); setSelectedFieldId(''); setFieldValues({}); setNativeFieldValues({}); setActiveFingerprint('');
    setTemplateStatus(''); setExportStatus(''); dragRef.current = null;
    setSelectedTemplateId('');
    if (file.size > 100 * 1024 * 1024) { setError(t.sizeError); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.error); return;
    }
    setActiveFile(file);
    setBusy(true);
    try {
      const { inspectPdf } = await import('@formflow/pdf-engine');
      const [result, fingerprint] = await Promise.all([inspectPdf(file), fingerprintFile(file)]);
      const candidates = buildCandidates(result);
      setEditableFields(candidates);
      setSelectedFieldId(candidates[0]?.id ?? '');
      setActiveFingerprint(fingerprint);
      setTemplateName(file.name.replace(/\.pdf$/i, ''));
      setAnalysis(result);
    }
    catch (cause) { console.error('PDF inspection failed.', cause); setError(t.error); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!analysis) {
      setPreviewWidth(0);
      return;
    }
    const frame = previewFrameRef.current;
    if (!frame) return;
    const updateWidth = () => {
      const width = Math.round(frame.getBoundingClientRect().width);
      if (width > 0) setPreviewWidth((current) => Math.abs(current - width) < 20 ? current : width);
    };
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [analysis]);

  useEffect(() => {
    if (!analysis || !activeFile || !previewCanvasRef.current || previewWidth <= 0) return;
    const pageInfo = analysis.pages.find((page) => page.pageNumber === currentPage);
    if (!pageInfo) return;
    let cancelled = false;
    const targetCanvas = previewCanvasRef.current;
    const stagingCanvas = document.createElement('canvas');
    setPreviewError('');
    setPreviewSize(null);
    import('@formflow/pdf-engine').then(({ renderPdfPage, getPdfRenderScale }) => {
      const scale = getPdfRenderScale(pageInfo.width, pageInfo.height, previewWidth, window.devicePixelRatio || 1);
      return renderPdfPage(activeFile, currentPage, stagingCanvas, scale);
    }).then((size) => {
      // Render off-screen so stale page or resize requests cannot overwrite
      // the current canvas. Overlay geometry remains in PDF point coordinates.
      if (cancelled) return;
      targetCanvas.width = stagingCanvas.width;
      targetCanvas.height = stagingCanvas.height;
      const context = targetCanvas.getContext('2d');
      if (!context) throw new Error('Canvas rendering is not available.');
      context.drawImage(stagingCanvas, 0, 0);
      setPreviewSize(size);
    }).catch((cause) => {
      console.error('PDF preview failed.', cause);
      if (!cancelled) setPreviewError(t.previewError);
    });
    return () => { cancelled = true; };
  }, [analysis, activeFile, currentPage, previewWidth, t.previewError]);

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
      pageNumber: currentPage, ...rectangle, confidence: 1, method: 'manual'
    };
    setEditableFields((current) => [...current, field]);
    setSelectedFieldId(field.id);
  }

  function updateField(id: string, update: Partial<Pick<FieldCandidate, 'label' | 'kind' | 'group' | 'options'>>) {
    setEditableFields((current) => current.map((field) => field.id === id ? { ...field, ...update } : field));
  }

  function deleteField(id: string) {
    setEditableFields((current) => current.filter((field) => field.id !== id));
    setFieldValues((current) => { const next = { ...current }; delete next[id]; return next; });
    if (selectedFieldId === id) setSelectedFieldId('');
  }

  async function saveCurrentTemplate() {
    if (!analysis || !activeFingerprint || !templateName.trim()) return;
    try {
      const now = new Date().toISOString();
      const template: FormTemplate = {
        id: crypto.randomUUID(), name: templateName.trim(), sourceFileName: fileName,
        sourceFingerprint: activeFingerprint, pageCount: analysis.pageCount,
        fields: toFormFields(editableFields), createdAt: now, updatedAt: now
      };
      const { saveTemplate, listTemplates } = await import('@formflow/local-storage');
      await saveTemplate(template);
      setLocalTemplates(await listTemplates());
      setSelectedTemplateId(template.id);
      setTemplateStatus('templateSaved');
    } catch (cause) {
      console.error('Could not save local template.', cause);
      setTemplateStatus('templateStorageError');
    }
  }

  function applySelectedTemplate() {
    const template = compatibleTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) { setTemplateStatus('templateMismatch'); return; }
    setEditableFields(fromFormFields(template.fields));
    setSelectedFieldId(template.fields[0]?.id ?? '');
    setCurrentPage(template.fields[0]?.pageNumber ?? 1);
    setFieldValues({});
    setTemplateStatus('templateLoaded');
  }

  async function removeSelectedTemplate() {
    if (!selectedTemplateId) return;
    try {
      const { deleteTemplate, listTemplates } = await import('@formflow/local-storage');
      await deleteTemplate(selectedTemplateId);
      setLocalTemplates(await listTemplates());
      setSelectedTemplateId('');
      setTemplateStatus('templateDeleted');
    } catch (cause) {
      console.error('Could not delete local template.', cause);
      setTemplateStatus('templateStorageError');
    }
  }

  function setFieldValue(id: string, value: string | boolean) {
    const selected = editableFields.find((field) => field.id === id);
    if (selected?.kind === 'radio' && value === true) {
      const group = selected.group || 'page-' + selected.pageNumber + '-radio';
      setFieldValues((current) => {
        const next = { ...current };
        editableFields.filter((field) =>
          field.kind === 'radio' &&
          (field.group || 'page-' + field.pageNumber + '-radio') === group
        ).forEach((field) => { next[field.id] = false; });
        next[id] = true;
        return next;
      });
      return;
    }
    setFieldValues((current) => ({ ...current, [id]: value }));
  }

  async function exportFilledPdf() {
    if (!activeFile || editableFields.length === 0) return;
    setExporting(true);
    setExportStatus('');
    try {
      const [arabicResponse, latinResponse] = await Promise.all([
        fetch(arabicFontUrl), fetch(latinFontUrl)
      ]);
      if (!arabicResponse.ok || !latinResponse.ok) throw new Error('Unable to load locally bundled fonts.');
      const [arabicFont, latinFont] = await Promise.all([
        arabicResponse.arrayBuffer(), latinResponse.arrayBuffer()
      ]);
      const { exportPdfWithOverlayFields } = await import('@formflow/pdf-engine/export');
      const pdfBytes = await exportPdfWithOverlayFields(
        new Uint8Array(await activeFile.arrayBuffer()), toFormFields(editableFields), fieldValues,
        { arabic: new Uint8Array(arabicFont), latin: new Uint8Array(latinFont) }, nativeFieldValues
      );
      const blob = new Blob([pdfBytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName.replace(/\.pdf$/i, '') + '-filled.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExportStatus('exportSuccess');
    } catch (cause) {
      console.error('PDF export failed.', cause);
      const message = cause instanceof Error ? cause.message : '';
      setExportStatus(message.includes('Arabic text in native PDF fields')
        ? 'nativeArabicUnsupported' : 'exportError');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className={"app-shell" + (analysis ? " has-document" : "")} dir={direction}>
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
      {!analysis && <section className="hero">
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
      </section>}
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
            <div className="preview-heading">
              <div><h3>{t.previewTitle}</h3><p>{t.previewInfo}</p></div>
              <div className="page-navigation">
                <button className="secondary-button" type="button" disabled={currentPage <= 1}
                  onClick={() => { setPreviewSize(null); setCurrentPage((page) => Math.max(1, page - 1)); }}>{t.previousPage}</button>
                <span>{t.pageLabel} {currentPage} / {analysis.pageCount}</span>
                <button className="secondary-button" type="button" disabled={currentPage >= analysis.pageCount}
                  onClick={() => { setPreviewSize(null); setCurrentPage((page) => Math.min(analysis.pageCount, page + 1)); }}>{t.nextPage}</button>
              </div>
            </div>
            <div className="pdf-stage">
              <div className="pdf-preview" ref={previewFrameRef}>
              <canvas ref={previewCanvasRef} aria-label={t.previewTitle} />
              {previewSize && <svg className="preview-overlay" viewBox={'0 0 ' + previewSize.width + ' ' + previewSize.height}
                preserveAspectRatio="none" onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove} onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerUp}>
                {suggestions.filter((item) => item.pageNumber === currentPage).map((item) => {
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
              {previewError && <p className="error-message preview-error" role="alert">{previewError}</p>}
            </div>
            <aside className="inspector-panel" aria-label={t.editorTitle}>
              <div className="inspector-tabs" role="tablist" aria-label={t.editorTitle}>
                <button id="inspector-tab-fields" className="inspector-tab" type="button" role="tab"
                  aria-selected={activeInspectorTab === 'fields'} aria-controls="inspector-fields-panel"
                  onClick={() => setActiveInspectorTab('fields')}>{t.inspectorFields}</button>
                <button id="inspector-tab-templates" className="inspector-tab" type="button" role="tab"
                  aria-selected={activeInspectorTab === 'templates'} aria-controls="inspector-templates-panel"
                  onClick={() => setActiveInspectorTab('templates')}>{t.inspectorTemplates}</button>
                {analysis.existingFields.length > 0 && <button id="inspector-tab-native" className="inspector-tab" type="button" role="tab"
                  aria-selected={activeInspectorTab === 'native'} aria-controls="inspector-native-panel"
                  onClick={() => setActiveInspectorTab('native')}>{t.inspectorNative}</button>}
                <button id="inspector-tab-export" className="inspector-tab" type="button" role="tab"
                  aria-selected={activeInspectorTab === 'export'} aria-controls="inspector-export-panel"
                  onClick={() => setActiveInspectorTab('export')}>{t.inspectorExport}</button>
              </div>
            {previewSize && <section id="inspector-templates-panel" role="tabpanel" aria-labelledby="inspector-tab-templates" tabIndex={0}
              hidden={activeInspectorTab !== 'templates'} className="template-panel">
              <div className="template-panel-heading">
                <h4>{t.templatesTitle}</h4>
                <span>{t.local}</span>
              </div>
              <div className="template-save-row">
                <label>
                  <span>{t.templateNameLabel}</span>
                  <input value={templateName} onChange={(event) => setTemplateName(event.target.value)}
                    placeholder={t.templateNamePlaceholder} />
                </label>
                <button className="secondary-button" type="button" onClick={saveCurrentTemplate}
                  disabled={!templateName.trim() || !activeFingerprint}>{t.saveTemplate}</button>
              </div>
              <div className="template-load-row">
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  <option value="">{t.noMatchingTemplates}</option>
                  {compatibleTemplates.map((template) => <option key={template.id} value={template.id}>
                    {template.name} · {template.fields.length}
                  </option>)}
                </select>
                <button className="secondary-button" type="button" onClick={applySelectedTemplate}
                  disabled={!selectedTemplateId}>{t.loadTemplate}</button>
                <button className="secondary-button danger-button" type="button" onClick={removeSelectedTemplate}
                  disabled={!selectedTemplateId}>{t.deleteTemplate}</button>
              </div>
              {templateStatus && <p className="template-status" role="status">{t[templateStatus]}</p>}
            </section>}
            {analysis.existingFields.length > 0 && <section id="inspector-native-panel" role="tabpanel" aria-labelledby="inspector-tab-native" tabIndex={0} hidden={activeInspectorTab !== 'native'} className="native-fields-panel">
              <div className="template-panel-heading"><h4>{t.existingFieldsTitle}</h4><span>{t.nativeFieldsHint}</span></div>
              <div className="native-fields-list">
                {analysis.existingFields.map((field) => (
                  <label className="native-field-row" key={field.name}>
                    <span>{field.name}</span>
                    {field.kind === 'checkbox'
                      ? <input type="checkbox" checked={nativeFieldValues[field.name] === true}
                          onChange={(event) => setNativeFieldValues((current) => ({ ...current, [field.name]: event.target.checked }))} />
                      : field.kind === 'dropdown' || field.kind === 'radio'
                        ? <select value={typeof nativeFieldValues[field.name] === 'string' ? nativeFieldValues[field.name] as string : ''}
                            onChange={(event) => setNativeFieldValues((current) => ({ ...current, [field.name]: event.target.value }))}>
                            <option value="">{t.chooseNativeValue}</option>
                            {(field.options ?? []).map((option) => <option value={option} key={option}>{option}</option>)}
                          </select>
                        : field.kind === 'text'
                          ? <input type="text" value={typeof nativeFieldValues[field.name] === 'string' ? nativeFieldValues[field.name] as string : ''}
                              onChange={(event) => setNativeFieldValues((current) => ({ ...current, [field.name]: event.target.value }))} />
                          : <span className="muted-native-field">{t.nativeFieldUnsupported}</span>}
                  </label>
                ))}
              </div>
            </section>}
            {previewSize && <div id="inspector-fields-panel" role="tabpanel" aria-labelledby="inspector-tab-fields" tabIndex={0} hidden={activeInspectorTab !== 'fields'} className="field-editor">
              <div className="field-editor-heading">
                <h4>{t.editorTitle}</h4>
                <button className="secondary-button" type="button" onClick={addManualField}>{t.addField}</button>
              </div>
              <p className="field-editor-hint">{t.moveResizeHint}</p>
              <div className="field-editor-list">
                {suggestions.filter((field) => field.pageNumber === currentPage).map((field) => (
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
                    {field.kind === 'select' && <label className="field-options-control">
                      <span>{t.optionsLabel}</span>
                      <input value={(field.options ?? []).join(', ')}
                        onChange={(event) => updateField(field.id, {
                          options: event.target.value.split(',').map((option) => option.trim()).filter(Boolean)
                        })}
                        onFocus={() => setSelectedFieldId(field.id)} />
                    </label>}
                    <label className="field-value-control">
                      <span>{t.valueLabel}</span>
                      {field.kind === 'select' && (field.options?.length ?? 0) > 0
                        ? <select value={typeof fieldValues[field.id] === 'string' ? fieldValues[field.id] as string : ''}
                            onChange={(event) => setFieldValue(field.id, event.target.value)}
                            onFocus={() => setSelectedFieldId(field.id)}>
                            <option value="">{t.valuePlaceholder}</option>
                            {field.options?.map((option) => <option value={option} key={option}>{option}</option>)}
                          </select>
                        : field.kind === 'checkbox'
                        ? <input type="checkbox" checked={fieldValues[field.id] === true}
                            onChange={(event) => setFieldValue(field.id, event.target.checked)}
                            onFocus={() => setSelectedFieldId(field.id)} />
                        : field.kind === 'radio'
                          ? <input type="radio" name={field.group || 'page-' + field.pageNumber + '-radio'}
                              checked={fieldValues[field.id] === true}
                              onChange={() => setFieldValue(field.id, true)}
                              onFocus={() => setSelectedFieldId(field.id)} />
                          : field.kind === 'multiline'
                          ? <textarea value={typeof fieldValues[field.id] === 'string' ? fieldValues[field.id] as string : ''}
                              onChange={(event) => setFieldValue(field.id, event.target.value)}
                              placeholder={t.valuePlaceholder} onFocus={() => setSelectedFieldId(field.id)} />
                          : <input type={field.kind === 'date' ? 'date' : 'text'}
                              value={typeof fieldValues[field.id] === 'string' ? fieldValues[field.id] as string : ''}
                              onChange={(event) => setFieldValue(field.id, event.target.value)}
                              placeholder={t.valuePlaceholder} onFocus={() => setSelectedFieldId(field.id)} />}
                    </label>
                    {field.kind === 'radio' && <label className="radio-group-control">
                      <span>{t.radioGroupLabel}</span>
                      <input value={field.group || 'page-' + field.pageNumber + '-radio'}
                        onChange={(event) => updateField(field.id, { group: event.target.value })}
                        onFocus={() => setSelectedFieldId(field.id)} />
                    </label>}
                    <button className="secondary-button danger-button" type="button" onClick={() => deleteField(field.id)} aria-label={t.deleteField}>{t.deleteField}</button>
                  </div>
                ))}
                {suggestions.filter((field) => field.pageNumber === currentPage).length === 0 &&
                  <p className="empty-editor">{t.noFieldsYet}</p>}
              </div>
            </div>}
            {previewSize && <div id="inspector-export-panel" role="tabpanel" aria-labelledby="inspector-tab-export" tabIndex={0} hidden={activeInspectorTab !== 'export'} className="export-panel">
              <p>{t.exportNote}</p>
              <button className="primary-button" type="button" onClick={exportFilledPdf}
                disabled={exporting || !activeFile}>
                {exporting ? t.exporting : t.exportButton}
              </button>
              {exportStatus && <p className="template-status" role="status">{t[exportStatus]}</p>}
            </div>}
            {analysis.textItemCount === 0 && <p className="notice" hidden={activeInspectorTab !== 'fields'}>{t.noText}</p>}
            {suggestions.length > 0 && <div className="suggestion-list" hidden={activeInspectorTab !== 'fields'}>
              <p className="notice">{t.caveat}</p>
              {suggestions.slice(0, 12).map((item) => <span className="suggestion-chip" key={item.id}>{item.label || (item.kind === 'checkbox' ? t.geometryCheckbox : t.geometryField)}</span>)}
            </div>}
            </aside>
          </section>
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