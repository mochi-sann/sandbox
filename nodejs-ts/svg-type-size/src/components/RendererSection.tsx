import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

const RendererSection = ({ title, description, children }: Props) => {
  return (
    <section className="section-card">
      <header className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
};

export default RendererSection;
