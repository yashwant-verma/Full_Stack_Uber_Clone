import PropTypes from "prop-types";
import { useContext, useEffect, useState } from "react";
import { CaptainDataContext } from "../context/contexts";
import { useNavigate } from "react-router-dom";
import axios from "../api/client";

const CaptainProtectWrapper = ({ children }) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { setCaptain } = useContext(CaptainDataContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate("/captain-login");
      return;
    }

    axios
      .get(
        `${import.meta.env.VITE_BASE_URL || "http://localhost:3000"}/captains/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      .then((response) => {
        if (response.status === 200) {
          setCaptain(response.data.captain);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/captain-login");
        } else {
          setError("Cannot verify your session right now. Please retry.");
          setIsLoading(false);
        }
      });
  }, [token, navigate, setCaptain, retry]);

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
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
        <p className="text-yellow-400/80 text-sm font-medium">
          Verifying captain session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default CaptainProtectWrapper;
CaptainProtectWrapper.propTypes = { children: PropTypes.node };
