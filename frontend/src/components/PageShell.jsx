import PropTypes from "prop-types";
import { Link } from "react-router-dom";
export default function PageShell({ title, children }) {
  const captain = localStorage.getItem("role") === "captain";
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4"
          aria-label="Main navigation"
        >
          <Link
            className="mr-auto text-2xl font-black"
            to={captain ? "/captain-home" : "/home"}
          >
            Ride<span className="text-blue-600">X</span>
          </Link>
          <Link to={captain ? "/captain-home" : "/home"}>Dashboard</Link>
          <Link to="/history">My rides</Link>
          <Link to={captain ? "/captain-profile" : "/profile"}>Profile</Link>
          <Link to={captain ? "/captain/logout" : "/user/logout"}>Log out</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}

PageShell.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};
