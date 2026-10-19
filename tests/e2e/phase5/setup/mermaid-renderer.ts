// Mermaid renderer: diagrams that start with `custom` are drawn here, in the colour of setup/mermaid.ts; the others by Mermaid.
let counter = 0;

export default () => async (code: string, options: Record<string, unknown>) => {
  if (!code.startsWith('custom')) {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, ...options });
    return (await mermaid.render(`setup-mermaid-${++counter}`, code)).svg;
  }
  const colour = (options['themeVariables'] as { primaryColor?: string } | undefined)?.primaryColor;
  const text = code.slice('custom'.length).trim();
  return `<svg id="from-renderer" viewBox="0 0 200 40"><text x="0" y="20" fill="${colour}">${text}</text></svg>`;
};
