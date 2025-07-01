import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'slow';

interface NetworkStatusResult {
  status: NetworkStatus;
  isConnected: boolean;
  connectionType: string | null;
  isWifi: boolean;
  isCellular: boolean;
  strength: number | null; // Signal strength (0-1)
}

export const useNetworkStatus = (): NetworkStatusResult => {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [isWifi, setIsWifi] = useState(false);
  const [isCellular, setIsCellular] = useState(false);
  const [strength, setStrength] = useState<number | null>(null);

  useEffect(() => {
    // Initial network state
    NetInfo.fetch().then(state => {
      updateNetworkState(state);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      updateNetworkState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkState = (state: any) => {
    const connected = state.isConnected && state.isInternetReachable;
    const type = state.type;
    
    setIsConnected(connected);
    setConnectionType(type);
    setIsWifi(type === 'wifi');
    setIsCellular(type === 'cellular');
    
    // Update signal strength if available
    if (state.details?.strength !== undefined) {
      setStrength(state.details.strength);
    } else if (state.details?.signalStrength !== undefined) {
      setStrength(state.details.signalStrength / 100); // Convert to 0-1 range
    }

    // Determine network status
    if (!connected) {
      setStatus('offline');
    } else if (type === 'cellular' && state.details?.cellularGeneration === '2g') {
      // 2G is considered slow
      setStatus('slow');
    } else if (state.details?.strength !== undefined && state.details.strength < 0.3) {
      // Weak signal is considered slow
      setStatus('slow');
    } else if (type === 'cellular' && state.details?.isConnectionExpensive) {
      // Expensive connection might be slow
      setStatus('slow');
    } else {
      setStatus('online');
    }
  };

  return {
    status,
    isConnected,
    connectionType,
    isWifi,
    isCellular,
    strength,
  };
};