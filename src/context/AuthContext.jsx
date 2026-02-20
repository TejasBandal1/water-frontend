import { createContext, useState, useEffect, useRef } from "react";
import API from "../api/axiosInstance";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const logoutTimer = useRef(null);

  /* =========================
     SAFE JWT PARSE
  ========================== */

  const parseToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch {
      return null;
    }
  };

  /* =========================
     AUTO LOGOUT TIMER
  ========================== */

  const setAutoLogout = (exp) => {
    if (!exp) return;

    const expiryTime = exp * 1000 - Date.now();

    if (expiryTime <= 0) {
      logout();
      return;
    }

    logoutTimer.current = setTimeout(() => {
      logout();
      window.location.href = "/login";
    }, expiryTime);
  };

  /* =========================
     RESTORE USER ON REFRESH
  ========================== */

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = parseToken(token);

    if (!payload || payload.exp * 1000 < Date.now()) {
      logout();
      return;
    }

    const restoredUser = {
      token,
      role: payload.role?.toLowerCase(),   // 🔥 FIXED
      name: payload.name || "",
      email: payload.sub || ""
    };

    setUser(restoredUser);
    setAutoLogout(payload.exp);
  }, []);

  /* =========================
     LOGIN
  ========================== */

  const login = async (email, password) => {
    const response = await API.post("/auth/login", {
      email,
      password
    });

    const token = response.data.access_token;
    const payload = parseToken(token);

    if (!payload) {
      throw new Error("Invalid token");
    }

    const loggedUser = {
      token,
      role: payload.role?.toLowerCase(),   // 🔥 FIXED
      name: payload.name || "",
      email: payload.sub || ""
    };

    localStorage.setItem("token", token);
    setUser(loggedUser);
    setAutoLogout(payload.exp);

    return loggedUser.role;   // return lowercase role
  };

  /* =========================
     LOGOUT
  ========================== */

  const logout = () => {
    localStorage.removeItem("token");

    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};