import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.1, ...options });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options]);

  return [ref, isVisible];
};

// Debounce hook
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook
export const useThrottle = (value, limit = 500) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// Memoized selector hook
export const useMemoizedSelector = (selector, deps = []) => {
  return useMemo(() => selector(), deps);
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `%c[Performance] ${componentName} rendered ${renderCount.current} times`,
        'color: #2196F3; font-weight: bold;'
      );
      
      if (renderCount.current > 10) {
        console.warn(
          `[Performance] ${componentName} has rendered ${renderCount.current} times. Consider memoization.`
        );
      }
      
      if (timeSinceLastRender < 16) {
        console.warn(
          `[Performance] ${componentName} re-rendered quickly (${timeSinceLastRender.toFixed(2)}ms). Check for unnecessary updates.`
        );
      }
    }
    
    lastRenderTime.current = now;
  });

  return { renderCount: renderCount.current };
};

// Virtual list hook for large datasets
export const useVirtualList = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, scrollTop, itemHeight, containerHeight]);

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;

  return { visibleItems, totalHeight, onScroll };
};

// Lazy load component wrapper
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Route change detector
export const useRouteChange = () => {
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.pathname);

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location]);

  return currentPath;
};

// Cache hook
export const useCache = (key, fetchFunction, ttl = 5 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check localStorage cache
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < ttl) {
            setData(data);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const freshData = await fetchFunction();
        setData(freshData);
        
        // Save to cache
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }));
        
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [key, fetchFunction, ttl]);

  return { data, loading, error };
};