import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client'; // Import socket.io-client
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode for decoding JWT
import * as api from '../services/api'; // Import your API service

const AuthContext = createContext(null);
const SOCKET_URL = 'http://localhost:3001'; // Backend URL

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token')); // Use 'token' key
    const [isLoading, setIsLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null); // Ref to store the socket instance

    const logout = useCallback(() => {
        console.log('[AuthContext] logout called');
        disconnectSocket();
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }, []);

    const connectSocket = useCallback((userId) => {
        if (!userId || socketRef.current) return; // Prevent connection if no user or already connected
        
        console.log(`[AuthContext] Attempting to connect socket for UserID: ${userId}`);
        socketRef.current = io(SOCKET_URL, {
            // Optional: Add authentication if needed later
            // auth: { token: localStorage.getItem('token') }
        });

        socketRef.current.on('connect', () => {
            console.log(`[AuthContext] Socket connected: ${socketRef.current.id}`);
            // Identify the user to the backend
            socketRef.current.emit('identify', userId);
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log(`[AuthContext] Socket disconnected: ${reason}`);
            socketRef.current = null; // Clear ref on disconnect
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('[AuthContext] Socket connection error:', error);
            // Handle connection error (e.g., show message to user)
        });
    }, []);

    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            console.log('[AuthContext] Disconnecting socket explicitly');
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const login = useCallback(async (username, password) => {
        console.log('[AuthContext] login function STARTED for username:', username);
        try {
            const response = await api.login(username, password);
            if (response.success) {
                const { user: userData, token: userToken } = response;
                console.log('[AuthContext] login called with userData:', userData);
                console.log('[AuthContext] login called with userToken:', userToken); // Log the JWT
                setUser(userData);
                setToken(userToken); // Set the JWT token
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('token', userToken); // Store JWT in localStorage
                console.log('[AuthContext] State and localStorage updated. Current user state:', userData);
                connectSocket(userData.userid);
                return userData.role; // Return role for navigation
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('[AuthContext] Login API call error inside AuthContext:', error);
            logout(); // Clear state on login error
            throw error; // Re-throw for the Login component to handle
        }
    }, [connectSocket, logout]);

    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token'); // Check for 'token'
            if (storedToken) {
                setToken(storedToken);
                try {
                    // Decode using jwtDecode
                    const decoded = jwtDecode(storedToken);
                    if (decoded && decoded.exp * 1000 > Date.now()) {
                        console.log('[AuthContext] Token verified (client-side decode), setting user:', decoded);
                        setUser(decoded); // Set user from decoded payload
                        connectSocket(decoded.userid);
                    } else {
                        console.log('[AuthContext] Token expired or invalid, logging out.');
                        logout();
                    }
                } catch (error) {
                    console.error('[AuthContext] Error verifying token:', error);
                    logout();
                }
            } 
            setIsLoading(false);
        };
        verifyToken();
    }, [logout, connectSocket]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            // Connect socket if user loaded from storage
            connectSocket(parsedUser.userid); 
        }
        setIsLoading(false);

        // Cleanup function to disconnect socket when provider unmounts
        return () => {
             if (socketRef.current) {
                 console.log('[AuthContext] Disconnecting socket on unmount');
                 socketRef.current.disconnect();
                 socketRef.current = null;
             }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    const value = useMemo(() => ({
        user,
        token,
        isLoading, // Add isLoading to context value
        login,
        logout,
        socket // Expose socket if needed by consumers
    }), [user, token, isLoading, login, logout, socket]);

    // Don't render children until initial loading/verification is complete
    // if (isLoading) { 
    //     return <CircularProgress />; // Or some loading indicator
    // }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 