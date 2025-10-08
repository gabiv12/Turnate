import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* el header es fixed ⇒ deja espacio arriba */}
      <main className="flex-1 pt-20 p-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
