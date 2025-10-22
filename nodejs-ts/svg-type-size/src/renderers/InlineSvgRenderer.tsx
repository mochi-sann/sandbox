import type { SvgCatalogEntry } from '../utils/svgCatalog';

type Props = {
  entries: SvgCatalogEntry[];
  renderCount: number;
};

const InlineSvgRenderer = ({ entries, renderCount }: Props) => {
  return (
    <div className="svg-grid" data-testid="inline-svg-renderer">
      {entries.flatMap((entry) =>
        Array.from({ length: renderCount }).map((_, index) => {
          const key = `${entry.id}-inline-${index}`;
          return (
            <div className="svg-card" key={key} dangerouslySetInnerHTML={{ __html: entry.raw }} />
          );
        })
      )}
    </div>
  );
};

export default InlineSvgRenderer;
