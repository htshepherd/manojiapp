export function generatePreview(
  markdownContent: string,
  maxLength = 100
): string {
  const plain = markdownContent
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  return plain.slice(0, maxLength) + (plain.length > maxLength ? '...' : '');
}
