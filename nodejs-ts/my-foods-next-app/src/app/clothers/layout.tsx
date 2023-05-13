export default function ClothersLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav>
        <h1>this is clothers page</h1>
      </nav>
      <main>{children}</main>
    </div>
  );
}
