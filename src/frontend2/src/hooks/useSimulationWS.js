import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureAuthToken } from '../api/client';

export const useSimulationWS = () => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | running | finished | error
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connectAndRun = useCallback(async (payload) => {
    disconnect();
    setStatus('connecting');
    setMessages([]);
    setError(null);

    const token = await ensureAuthToken();
    if (!token) {
      setStatus('error');
      setError('Authentication failed. Could not fetch JWT token.');
      return;
    }

    try {
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development, Vite proxy routes /ws to ws://localhost:8000
      const wsUrl = `${protocol}//${loc.host}/ws/simulation?token=${encodeURIComponent(token)}`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        // Send the payload to trigger simulation
        socket.send(JSON.stringify(payload));
        setStatus('running');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.step === 'HEARTBEAT') {
            return;
          }
          
          setMessages((prev) => [...prev, data]);

          if (data.step === 'ERROR') {
            setStatus('error');
            setError(data.payload?.error || 'Simulation failed.');
          } else if (data.step === 'SIMULATION_COMPLETE') {
            setStatus('finished');
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatus('error');
        setError('Connection error occurred.');
      };

      socket.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1001) {
          setStatus('error');
          setError(`WebSocket closed unexpectedly (code: ${e.code}).`);
        } else {
          setStatus((prev) => (prev === 'running' || prev === 'connecting' ? 'disconnected' : prev));
        }
      };
    } catch (err) {
      console.error('Failed to connect to WS:', err);
      setStatus('error');
      setError('Failed to establish WebSocket connection.');
    }
  }, [disconnect]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    status,
    error,
    connectAndRun,
    disconnect,
  };
};
