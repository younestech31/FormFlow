declare module 'arabic-persian-reshaper' {
  const reshaper: {
    ArabicShaper: { convertArabic(value: string): string };
    PersianShaper: { convertArabic(value: string): string };
  };
  export default reshaper;
}

declare module 'bidi-js' {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  interface BidiApi {
    getEmbeddingLevels(value: string, direction?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels;
    getReorderedString(value: string, levels: EmbeddingLevels): string;
  }
  const bidiFactory: () => BidiApi;
  export default bidiFactory;
}
