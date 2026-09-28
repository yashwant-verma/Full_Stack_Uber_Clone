import PropTypes from "prop-types";
import { useState } from "react";
import useLocationSearch from "../hooks/useLocationSearch";
export default function AddressInput({ label, value, onChange, id }) {
  const [searching, setSearching] = useState(false);
  const { suggestions, loading, error } = useLocationSearch(
    searching ? value : "",
  );
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="field"
        value={value}
        autoComplete="off"
        maxLength={300}
        onChange={(event) => {
          onChange(event.target.value);
          setSearching(true);
        }}
      />
      {searching && value.length >= 3 && (
        <div className="mt-1 rounded-xl border bg-white p-2 text-sm">
          {loading ? (
            <p role="status">Searching locations…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : suggestions.length ? (
            suggestions.map((address) => (
              <button
                className="block w-full rounded-lg p-2 text-left hover:bg-blue-50"
                type="button"
                key={address}
                onClick={() => {
                  onChange(address);
                  setSearching(false);
                }}
              >
                {address}
              </button>
            ))
          ) : (
            <p>No matching addresses. Try a fuller address.</p>
          )}
          <button
            className="mt-1 text-blue-700"
            type="button"
            onClick={() => setSearching(false)}
          >
            Close suggestions
          </button>
        </div>
      )}
    </div>
  );
}

AddressInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
};
