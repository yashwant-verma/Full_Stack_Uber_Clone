import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
const pages = {
  about: [
    "About RideX",
    "RideX is a learning and portfolio project by Yashwant. It uses React, Node.js, Express, MongoDB and Socket.IO to demonstrate a ride-booking flow.",
    "You can explore the sample journey without creating an account. Real bookings in a configured development instance need separate rider and captain accounts.",
  ],
  help: [
    "Help",
    "For a sample journey, open Try demo. To test a real flow, create a rider account and a captain account in separate browser profiles. The captain must go online, allow location access and be within 5 km of the pickup with the selected vehicle type.",
    "If maps or email are unavailable, contact the person running your RideX instance. Report project bugs through the GitHub repository linked below. Never share your password or password-reset OTP.",
  ],
  privacy: [
    "Privacy information",
    "This portfolio app stores account details, saved places, ride details and reviews in its configured database. When a captain is online or on a ride, location is updated and shared with the assigned rider. Google Maps processes map and address requests.",
    "The app stores a login token in your browser. Log out on shared devices. Use test information when trying the project. Contact the instance owner through the project repository for data removal.",
  ],
  terms: [
    "Project terms",
    "RideX is a student portfolio and learning project, not a commercial transport service. Demo bookings are fictional and do not dispatch vehicles or collect money.",
    "The configured app records cash confirmations and supports Razorpay UPI when enabled. Test mode does not collect real money. It does not support card payments or automatic driver payouts. Do not rely on this project for emergency assistance or real transport.",
  ],
};
export default function InfoPage({ page }) {
  const [title, ...paragraphs] = pages[page];
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link className="text-blue-700" to="/">
          ← RideX home
        </Link>
        <h1 className="my-8 text-3xl font-bold">{title}</h1>
        {paragraphs.map((text) => (
          <p className="mb-5 leading-relaxed text-slate-600" key={text}>
            {text}
          </p>
        ))}
        <Link className="btn mt-4" to="/demo">
          Try demo
        </Link>
      </main>
      <Footer />
    </div>
  );
}

InfoPage.propTypes = { page: PropTypes.string.isRequired };
