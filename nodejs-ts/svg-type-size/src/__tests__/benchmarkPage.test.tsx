import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BenchmarkPage from '../pages/BenchmarkPage';
import { RENDER_COUNT_MAX } from '../../config/benchmark.config';

describe('T-002/T-003 ベンチマークページ表示', () => {
  const renderWithRouter = (initialEntry = '/benchmark?count=3') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/benchmark" element={<BenchmarkPage />} />
        </Routes>
      </MemoryRouter>
    );

  test('3 種類のレンダラーが描画される', async () => {
    renderWithRouter();

    expect(await screen.findByTestId('svg-sample-grid')).toBeInTheDocument();
    expect(await screen.findByText('インライン JSX')).toBeInTheDocument();
    expect(screen.getByText('img タグ')).toBeInTheDocument();
    expect(screen.getByText('SVGR コンポーネント')).toBeInTheDocument();
  });

  test('表示回数の変更が制約内に収まる', async () => {
    renderWithRouter('/benchmark?count=5');

    const input = await screen.findByLabelText(`表示回数 (1〜${RENDER_COUNT_MAX})`);
    fireEvent.change(input, { target: { value: String(RENDER_COUNT_MAX + 50) } });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(String(RENDER_COUNT_MAX));
    });
  });
});
