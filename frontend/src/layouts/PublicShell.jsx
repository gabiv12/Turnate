import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Outlet } from "react-router-dom";

export default function PublicShell({ children }) {
  const Content = children ?? <Outlet />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-400">
      <Header />
      <main className="pt-24">
        {Content}
      </main>
      <Footer />
    </div>
  );
}
