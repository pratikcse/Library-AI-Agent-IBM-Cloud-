import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, getStudentStatus } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for saved session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem("library_user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (studentId) => {
        const result = await apiLogin(studentId);

        if (result.success && result.data.success) {
            const userData = {
                studentId: result.data.student_id,
                name: result.data.name,
                branch: result.data.branch,
            };
            setUser(userData);
            localStorage.setItem("library_user", JSON.stringify(userData));
            return { success: true, data: userData };
        }

        return { success: false, message: result.data?.message || "Login failed" };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("library_user");
    };

    const refreshStatus = async () => {
        if (!user) return null;

        const result = await getStudentStatus(user.studentId);
        if (result.success) {
            return result.data;
        }
        return null;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        refreshStatus,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
