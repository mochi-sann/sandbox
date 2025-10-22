import type { ComponentType } from 'react';
import type { SvgCatalogEntry } from '../utils/svgCatalog';

type Props = {
  entries: SvgCatalogEntry[];
  renderCount: number;
};

type SvgComponent = ComponentType<React.SVGProps<SVGSVGElement>>;

const componentModules = import.meta.glob('../assets/svg-samples/**/*.svg', {
  eager: true,
  import: 'default'
}) as Record<string, SvgComponent>;

const SvgrRenderer = ({ entries, renderCount }: Props) => {
  return (
    <div className="svg-grid" data-testid="svgr-renderer">
      {entries.flatMap((entry) =>
        Array.from({ length: renderCount }).map((_, index) => {
          const Component = componentModules[entry.relativePath];
          if (!Component) {
            return (
              <div className="svg-card" key={`${entry.id}-svgr-${index}`}>
                <span>SVGR ロード失敗</span>
              </div>
            );
          }

          const key = `${entry.id}-svgr-${index}`;
          return (
            <div className="svg-card" key={key}>
              <Component width={64} height={64} role="img" aria-label={entry.name} />
            </div>
          );
        })
      )}
    </div>
  );
};

export default SvgrRenderer;
