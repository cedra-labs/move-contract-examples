import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WalletProvider } from "./components/wallet-provider";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Table } from "./pages/Table";
import "./App.css";

function AppShell() {
  const location = useLocation();
  const isTableRoute = location.pathname.startsWith("/table/");

  return (
    <div className="app">
      <Header />
      <main className={`main-content${isTableRoute ? " table-mode" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/table/:address" element={<Table />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const repoBase = "/5-seat-texas-hold-em";
  const baseName =
    typeof window !== "undefined" &&
    (window.location.pathname === repoBase ||
      window.location.pathname.startsWith(`${repoBase}/`))
      ? repoBase
      : "/";

  return (
    <WalletProvider>
      <BrowserRouter basename={baseName}>
        <AppShell />
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
