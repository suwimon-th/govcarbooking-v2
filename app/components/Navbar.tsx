// /components/Navbar.tsx
export default function Navbar() {
  return (
    <nav className="w-full bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="text-lg font-semibold text-blue-800">
          ระบบบริหารการใช้รถราชการ
        </div>

        <div>
          <button className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800">
            เมนู
          </button>
        </div>
      </div>
    </nav>
  );
}
