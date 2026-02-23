/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import API from "../api/axiosInstance";

export const AuthContext = createContext(null);

const parseToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = parseToken(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return null;
    }

    return {
      token,
      role: payload.role?.toLowerCase(),
      name: payload.name || "",
      email: payload.sub || ""
    };
  });
  const logoutTimer = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem("token");

    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    setUser(null);
  }, []);

  const setAutoLogout = useCallback(
    (exp) => {
      if (!exp) return;

      const expiryTime = exp * 1000 - Date.now();

      if (expiryTime <= 0) {
        logout();
        return;
      }

      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }

      logoutTimer.current = setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, expiryTime);
    },
    [logout]
  );

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await API.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const token = response.data.access_token;
    const payload = parseToken(token);

    if (!payload) {
      throw new Error("Invalid token");
    }

    const loggedUser = {
      token,
      role: payload.role?.toLowerCase(),
      name: payload.name || "",
      email: payload.sub || ""
    };

    localStorage.setItem("token", token);
    setUser(loggedUser);
    setAutoLogout(payload.exp);

    return loggedUser.role;
  };

  useEffect(() => {
    if (!user?.token) return;

    const payload = parseToken(user.token);
    if (!payload?.exp) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoLogout(payload.exp);
  }, [user, setAutoLogout]);

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
