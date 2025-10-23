import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RendererSection from '../components/RendererSection';
import { RenderConfigProvider, useRenderConfig } from '../context/RenderConfigContext';
import InlineSvgRenderer from '../renderers/InlineSvgRenderer';
import ImgTagRenderer from '../renderers/ImgTagRenderer';
import SvgrRenderer from '../renderers/SvgrRenderer';
import { svgCatalog } from '../utils/svgCatalog';
import { RENDER_COUNT_MAX, RENDER_COUNT_MIN } from '~config/benchmark.config';

const RendererDashboard = () => {
  const { renderCount, setRenderCount } = useRenderConfig();
  const [inputValue, setInputValue] = useState(renderCount);

  useEffect(() => {
    setInputValue(renderCount);
  }, [renderCount]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRenderCount(inputValue);
  };

  const svgCount = svgCatalog.length;

  const renderers = useMemo(
    () => [
      {
        id: 'inline',
        name: 'インライン JSX',
        description: 'raw ローダーで文字列化した SVG を JSX の `dangerouslySetInnerHTML` で描画',
        node: <InlineSvgRenderer entries={svgCatalog} renderCount={renderCount} />
      },
      {
        id: 'img',
        name: 'img タグ参照',
        description: '`public` に出力される静的ファイル URL を `img` で描画',
        node: <ImgTagRenderer entries={svgCatalog} renderCount={renderCount} />
      },
      {
        id: 'svgr',
        name: 'SVGR コンポーネント',
        description: 'SVGR による React コンポーネント化で props を付与可能にする方式',
        node: <SvgrRenderer entries={svgCatalog} renderCount={renderCount} />
      }
    ],
    [renderCount]
  );

  return (
    <div className="page">
      <header className="section-card">
        <h1>SVG 配信手法ベンチマーク</h1>
        <p>現在 {svgCount} 枚の SVG を {renderCount} 回ずつ描画しています。</p>
        <form onSubmit={handleSubmit} className="button-row" aria-label="レンダリング回数設定">
          <label>
            表示回数 (1〜{RENDER_COUNT_MAX})
            <input
              type="number"
              min={RENDER_COUNT_MIN}
              max={RENDER_COUNT_MAX}
              value={inputValue}
              onChange={(event) => setInputValue(Number(event.target.value))}
            />
          </label>
          <button type="submit">更新</button>
          <Link to="/report" className="link-button secondary">
            レポートを見る
          </Link>
        </form>
      </header>

      <RendererSection
        title="読み込み済み SVG 一覧"
        description="ベンチマーク対象の SVG を 1 枚ずつ確認できます。"
      >
        <div className="svg-grid svg-sample-grid" data-testid="svg-sample-grid">
          {svgCatalog.map((entry) => (
            <div className="svg-card svg-sample-card" key={entry.id}>
              <div className="svg-sample-preview" dangerouslySetInnerHTML={{ __html: entry.raw }} />
              <p className="svg-sample-name">{entry.name}</p>
            </div>
          ))}
        </div>
      </RendererSection>

      <div className="renderer-grid">
        {renderers.map((renderer) => (
          <RendererSection key={renderer.id} title={renderer.name} description={renderer.description}>
            {renderer.node}
          </RendererSection>
        ))}
      </div>
    </div>
  );
};

const BenchmarkPage = () => (
  <RenderConfigProvider>
    <RendererDashboard />
  </RenderConfigProvider>
);

export default BenchmarkPage;
