import { Link } from "react-router-dom";
import Footer from "../components/Footer";
export default function Start() {
  return (
    <div className="bg-white">
      <header className="border-b">
        <nav
          className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-5"
          aria-label="Main navigation"
        >
          <Link className="mr-auto text-2xl font-black" to="/">
            Ride<span className="text-blue-600">X</span>
          </Link>
          <Link className="hidden sm:inline" to="/about">
            About
          </Link>
          <Link to="/demo">Try demo</Link>
          <Link className="btn-secondary" to="/login">
            Log in
          </Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              A ride, a route, a simpler day
            </p>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl">
              Your next stop.
              <br />
              <span className="text-blue-600">One easy ride.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Choose your pickup, compare fares and follow your captain’s
              location. A full-stack ride-booking project built by Yashwant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn" to="/signup">
                Book a ride <span aria-hidden="true">→</span>
              </Link>
              <Link className="btn-secondary" to="/captain-signup">
                Become a captain
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Portfolio project · Cash confirmation · No real transport service
            </p>
          </div>
          <div className="relative rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
            <div className="mb-9 flex items-center justify-between">
              <span className="text-xl font-bold">
                A preview of your journey
              </span>
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-200">
                SAMPLE
              </span>
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/15 p-5">
                <p className="text-xs uppercase tracking-widest text-blue-300">
                  Pickup
                </p>
                <p className="mt-2 text-lg">Your favourite starting point</p>
              </div>
              <div className="text-center text-blue-300" aria-hidden="true">
                ↓
              </div>
              <div className="rounded-2xl border border-white/15 p-5">
                <p className="text-xs uppercase tracking-widest text-blue-300">
                  Destination
                </p>
                <p className="mt-2 text-lg">Where life takes you next</p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-white p-4 text-slate-900">
              <i
                className="ri-car-line text-3xl text-blue-600"
                aria-hidden="true"
              ></i>
              <div>
                <p className="font-bold">Car, Auto or Moto</p>
                <p className="text-sm text-slate-500">
                  Choose what works for your trip
                </p>
              </div>
            </div>
            <Link
              className="mt-6 block text-sm text-blue-200 underline"
              to="/demo"
            >
              Explore the sample booking flow →
            </Link>
          </div>
        </section>
        <section className="bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold">
              A clear journey, start to finish.
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                [
                  "01",
                  "Choose your route",
                  "Search your pickup and destination, or use your saved Home and Work.",
                ],
                [
                  "02",
                  "Meet your captain",
                  "Choose a vehicle, see your fare and share your OTP when the captain arrives.",
                ],
                [
                  "03",
                  "Finish with confidence",
                  "Confirm cash, save your receipt and leave a review after the trip.",
                ],
              ].map(([number, title, text]) => (
                <article className="card" key={number}>
                  <p className="text-sm font-bold text-blue-600">{number}</p>
                  <h3 className="my-3 text-xl font-bold">{title}</h3>
                  <p className="leading-relaxed text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
