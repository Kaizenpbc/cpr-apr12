import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client'; // Import socket.io-client

const AuthContext = createContext(null);
const SOCKET_URL = 'http://localhost:3001'; // Backend URL

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null); // Keep token state if needed elsewhere
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null); // Ref to store the socket instance

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
        setLoading(false);

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

    const connectSocket = (userId) => {
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
    };

    const disconnectSocket = () => {
         if (socketRef.current) {
             console.log('[AuthContext] Disconnecting socket explicitly');
             socketRef.current.disconnect();
             socketRef.current = null;
         }
    };

    const login = (userData, userToken) => {
        // <<< DETAILED LOGGING START >>>
        console.log('[AuthContext] login called with userData:', userData);
        console.log('[AuthContext] login called with userToken:', userToken);
        // <<< DETAILED LOGGING END >>>
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        // <<< DETAILED LOGGING START >>>
        console.log('[AuthContext] State and localStorage updated. Current user state:', userData);
        // <<< DETAILED LOGGING END >>>
        // Connect socket after successful login
        connectSocket(userData.userid); 
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Disconnect socket on logout
        disconnectSocket();
    };

    if (loading) {
        return null; // or a loading spinner
    }

    // Include socket in context value
    return (
        <AuthContext.Provider value={{ user, token, login, logout, socket: socketRef.current }}>
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