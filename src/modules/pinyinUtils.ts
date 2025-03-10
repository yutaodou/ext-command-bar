import pinyin from 'pinyin';

export function toPinyin(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const pinyinResult = pinyin(text, {
    style: pinyin.STYLE_NORMAL,  // Default style without tone marks
    heteronym: false,            // Don't include heteronyms
    segment: true                // Enable word segmentation
  });
  
  return pinyinResult.map(item => item[0]).join('');
}

export function containsChinese(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const chineseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
  return chineseRegex.test(text);
}