// /components/PageContainer.tsx
import Navbar from "./Navbar";

export default function PageContainer({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {title && (
          <h1 className="text-2xl font-semibold text-slate-800 mb-4">
            {title}
          </h1>
        )}

        <div className="bg-white border rounded-xl shadow-sm p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
