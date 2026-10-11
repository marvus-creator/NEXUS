export function likeSafe(term: string) {
  return term.replace(/[\%_]/g, (character) => `\${character}`);
}
