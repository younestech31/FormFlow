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
    fea���q�^