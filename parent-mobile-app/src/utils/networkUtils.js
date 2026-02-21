import NetInfo from '@react-native-community/netinfo';

export const checkNetwork = async () => {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
};

export const waitForNetwork = async (timeout = 30000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const { isConnected } = await checkNetwork();
    if (isConnected) return true;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
};

export const withNetworkRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};