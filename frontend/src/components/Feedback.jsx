import PropTypes from "prop-types";
export default function Feedback({ message, success = false }) {
  if (!message) return null;
  return (
    <p
      role={success ? "status" : "alert"}
      className={`my-3 rounded-xl border p-3 text-sm ${success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {message}
    </p>
  );
}

Feedback.propTypes = { message: PropTypes.string, success: PropTypes.bool };
