import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="text-6xl font-black text-blue-600">404</p>
      <h1 className="my-5 text-2xl font-bold">This stop doesn’t exist.</h1>
      <p className="mb-7 text-slate-600">
        Check the address or head back to RideX.
      </p>
      <Link className="btn" to="/">
        Back to home
      </Link>
    </main>
  );
}
