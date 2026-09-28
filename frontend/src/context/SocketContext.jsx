import { log } from "../utils/logger";
import { SocketContext } from "./contexts";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BASE_URL || "http://localhost:3000", {
  autoConnect: false,
  auth: (callback) => callback({ token: localStorage.getItem("token") }),
});
export default function SocketProvider({ children }) {
  const { pathname } = useLocation();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const connect = () => { setConnected(true); log("ui.socket", { status: "connected" }); };
    const disconnect = reason => { setConnected(false); log("ui.socket", { status: "disconnected", reason: typeof reason === "string" ? reason : "Connection unavailable" }, "warn"); };
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("connect_error", disconnect);
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("connect_error", disconnect);
    };
  }, []);
  useEffect(() => {
    log("ui.navigation", { path: pathname });
    if (localStorage.getItem("token")) socket.connect();
    else socket.disconnect();
  }, [pathname]);
  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

SocketProvider.propTypes = { children: PropTypes.node };
