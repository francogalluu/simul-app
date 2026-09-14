declare module 'emoji-datasource' {
  export interface EmojiDatum {
    name: string;
    unified: string;
    short_names: string[];
    category: string;
    sort_order: number;
  }

  const emoji: EmojiDatum[];
  export default emoji;
}
