export type SvgCatalogEntry = {
  id: string;
  name: string;
  relativePath: string;
  raw: string;
  url: string;
};

const rawModules = import.meta.glob('../assets/svg-samples/**/*.svg', {
  as: 'raw',
  eager: true
});

const urlModules = import.meta.glob('../assets/svg-samples/**/*.svg', {
  as: 'url',
  eager: true
});

const normalizeId = (pathValue: string) =>
  pathValue.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

export const createSvgCatalog = (): SvgCatalogEntry[] =>
  Object.entries(rawModules)
    .map(([pathValue, raw]) => {
      const url = urlModules[pathValue];
      return {
        id: normalizeId(pathValue),
        name: pathValue.split('/').pop() ?? pathValue,
        relativePath: pathValue,
        raw: raw as string,
        url: url as string
      } satisfies SvgCatalogEntry;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const svgCatalog = createSvgCatalog();

export type { SvgCatalogEntry };
