export type InterfaceLanguage = 'ar' | 'fr' | 'en';
export type FieldKind = 'text' | 'multiline' | 'checkbox' | 'radio' | 'date' | 'select' | 'signature';

export interface TextFragment {
  id: string; text: string; pageNumber: number; pageWidth: number; pageHeight: number;
  x: number; y: number; width: number; height: number;
}
export interface VectorShape {
  id: string; pageNumber: number; kind: 'rectangle' | 'line';
  x: number; y: number; width: number; height: number;
  pageWidth: number; pageHeight: number; closed: boolean;
}
export interface FieldCandidate {
  id: string; label: string; kind: FieldKind; pageNumber: number;
  x: number; y: number; width: number; height: number;
  confidence: number; method: 'label-anchor' | 'geometry' | 'manual';
}
export interface FormField {
  id: string; name: string; label: string; kind: FieldKind; pageNumber: number;
  x: number; y: number; width: number; height: number; required: boolean; options?: string[];
}
export interface FormTemplate {
  id: string; name: string; sourceFileName: string; pageCount: number;
  fields: FormField[]; createdAt: string; updatedAt: string;
}
