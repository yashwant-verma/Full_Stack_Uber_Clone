import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="border-t bg-slate-950 px-6 py-8 text-sm text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5">
        <p className="mr-auto">
          RideX · Built by Yashwant · {new Date().getFullYear()}
        </p>
        <Link to="/about">About</Link>
        <Link to="/help">Help</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a
          href="https://github.com/yashwant-verma/Full_Stack_Uber_Clone"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
