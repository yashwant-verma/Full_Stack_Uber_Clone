import { useState } from "react";
import { Link } from "react-router-dom";
import FareBreakdown from "../components/FareBreakdown";
const stages = [
  "Choose a ride",
  "Captain assigned",
  "Ride started",
  "Cash confirmed",
  "Trip complete",
];
const sample = {
  fare: 200,
  fareBreakdown: { base: 50, distance: 120, time: 30, rounding: 0 },
};
export default function Demo() {
  const [step, setStep] = useState(0);
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link className="text-blue-700" to="/">
        ← RideX home
      </Link>
      <p className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        DEMO · Fictional locations, captain and fare. No booking or payment is
        created.
      </p>
      <h1 className="text-3xl font-bold">Take RideX for a spin.</h1>
      <p className="mt-3 text-slate-600">
        A sample rider and captain journey. Use Next to explore each step.
      </p>
      <ol className="my-6 flex flex-wrap gap-2" aria-label="Demo progress">
        {stages.map((label, index) => (
          <li
            className={`rounded-full px-3 py-2 text-xs ${index === step ? "bg-blue-600 text-white" : "bg-slate-200"}`}
            aria-current={index === step ? "step" : undefined}
            key={label}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <section className="card space-y-5">
        <h2 className="text-xl font-bold">{stages[step]}</h2>
        <p>Sample pickup: City Library</p>
        <p>Sample destination: Central Station</p>
        {step === 0 && <p>RideX Go · 4 seats · Sample fare ₹200</p>}
        {step === 1 && (
          <p>
            Sample captain assigned. The rider sees an OTP; the captain must
            enter it to start.
          </p>
        )}
        {step === 2 && (
          <p>
            The real app shares the assigned captain’s device location. This
            preview does not simulate live GPS.
          </p>
        )}
        {step === 3 && (
          <p>
            The rider confirms cash payment. The captain checks receipt before
            finishing.
          </p>
        )}
        {step === 4 && (
          <>
            <p>
              Ride saved to history. A real completed ride can be reviewed and
              its receipt printed.
            </p>
            <FareBreakdown ride={sample} />
          </>
        )}
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </button>
          <button
            className="btn"
            onClick={() => setStep((value) => (value === 4 ? 0 : value + 1))}
          >
            {step === 4 ? "Start again" : "Next step"}
          </button>
        </div>
      </section>
      <p className="mt-6 text-sm text-slate-600">
        Built by Yashwant ·{" "}
        <Link className="text-blue-700" to="/signup">
          Create a test account
        </Link>
      </p>
    </main>
  );
}
