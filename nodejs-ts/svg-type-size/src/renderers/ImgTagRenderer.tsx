import type { SvgCatalogEntry } from '../utils/svgCatalog';

type Props = {
  entries: SvgCatalogEntry[];
  renderCount: number;
};

const ImgTagRenderer = ({ entries, renderCount }: Props) => {
  return (
    <div className="svg-grid" data-testid="img-tag-renderer">
      {entries.flatMap((entry) =>
        Array.from({ length: renderCount }).map((_, index) => {
          const key = `${entry.id}-img-${index}`;
          return (
            <div className="svg-card" key={key}>
              <img src={entry.url} alt={entry.name} style={{ width: '64px', height: '64px' }} />
            </div>
          );
        })
      )}
    </div>
  );
};

export default ImgTagRenderer;
