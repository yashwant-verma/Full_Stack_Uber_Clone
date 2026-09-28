import PropTypes from "prop-types";
import { useContext, useEffect, useState } from "react";
import { UserDataContext } from "../context/contexts";
import { useNavigate } from "react-router-dom";
import axios from "../api/client";

const UserProtectWrapper = ({ children }) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { setUser } = useContext(UserDataContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(
        `${import.meta.env.VITE_BASE_URL || "http://localhost:3000"}/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      .then((response) => {
        if (response.status === 200) {
          setUser(response.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/login");
        } else {
          setError("Cannot verify your session right now. Please retry.");
          setIsLoading(false);
        }
      });
  }, [token, navigate, setUser, retry]);

  if (error)
    return (
      <main className="p-10">
        <p role="alert">{error}</p>
        <button
          className="btn mt-4"
          onClick={() => {
            setError("");
            setIsLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Retry
        </button>
      </main>
    );

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-white/60 text-sm">Verifying session...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default UserProtectWrapper;
UserProtectWrapper.propTypes = { children: PropTypes.node };
