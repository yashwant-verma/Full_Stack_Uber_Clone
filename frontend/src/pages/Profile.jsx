import { useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { UserDataContext } from "../context/contexts";
import { CaptainDataContext } from "../context/contexts";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
import AddressInput from "../components/AddressInput";
export default function Profile() {
  const { user, setUser } = useContext(UserDataContext);
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const isCaptain = useLocation().pathname === "/captain-profile";
  const account = isCaptain ? captain : user;
  const setAccount = isCaptain ? setCaptain : setUser;
  const path = isCaptain ? "/captains" : "/users";
  const [first, setFirst] = useState(account?.fullname?.firstname || "");
  const [last, setLast] = useState(account?.fullname?.lastname || "");
  const [email, setEmail] = useState(account?.email || "");
  const [home, setHome] = useState(
    account?.savedPlaces?.find((place) => place.label === "Home")?.address ||
      "",
  );
  const [work, setWork] = useState(
    account?.savedPlaces?.find((place) => place.label === "Work")?.address ||
      "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event, places = false) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = places
        ? await api.put(`${path}/saved-places`, {
            places: [
              { label: "Home", address: home.trim() },
              { label: "Work", address: work.trim() },
            ].filter((place) => place.address),
          })
        : await api.patch(`${path}/profile`, {
            fullname: { firstname: first.trim(), lastname: last.trim() },
            email,
          });
      setAccount(data);
      setMessage(places ? "Saved places updated." : "Profile saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell title="My profile">
      <div className="max-w-2xl space-y-6">
        <Feedback message={error} />
        <Feedback success message={message} />
        <form className="card space-y-4" onSubmit={save}>
          <h2 className="text-lg font-bold">Personal information</h2>
          {[
            ["First name", first, setFirst, "text"],
            ["Last name", last, setLast, "text"],
            ["Email", email, setEmail, "email"],
          ].map(([label, value, setter, type]) => (
            <label className="block text-sm font-semibold" key={label}>
              {label}
              <input
                className="field mt-2"
                required={label !== "Last name"}
                minLength={type === "text" ? 3 : undefined}
                maxLength={type === "text" ? 50 : 254}
                type={type}
                value={value}
                onChange={(event) => setter(event.target.value)}
              />
            </label>
          ))}
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
        {!isCaptain && (
          <form
            className="card space-y-4"
            onSubmit={(event) => save(event, true)}
          >
            <h2 className="text-lg font-bold">Saved places</h2>
            <p className="text-sm text-slate-500">
              Leave an address blank to remove it.
            </p>
            <AddressInput
              id="home-address"
              label="Home"
              value={home}
              onChange={setHome}
            />
            <AddressInput
              id="work-address"
              label="Work"
              value={work}
              onChange={setWork}
            />
            <button className="btn" disabled={busy}>
              Save places
            </button>
          </form>
        )}
        {isCaptain && (
          <section className="card">
            <h2 className="mb-3 font-bold">Vehicle details</h2>
            <p>
              {captain?.vehicle?.vehicleType} · {captain?.vehicle?.color} ·{" "}
              {captain?.vehicle?.plate}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}
