import axios from 'axios';

// Create an Axios instance pointing to the backend URL
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('todo_user');
  if (storedUser) {
    const { tokens } = JSON.parse(storedUser);
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401s and Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const storedUser = localStorage.getItem('todo_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const refreshToken = userData.tokens?.refreshToken;
        
        if (refreshToken) {
          try {
            // Attempt to refresh the token using a separate raw axios call to avoid loops
            const refreshRes = await axios.post(`${api.defaults.baseURL}/users/refresh`, {
              refreshToken
            });
            
            if (refreshRes.data.success) {
              const newTokens = refreshRes.data.data.tokens;
              
              // Update local storage
              userData.tokens = newTokens;
              localStorage.setItem('todo_user', JSON.stringify(userData));
              
              // Update authorization header for the retried request
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              
              return api(originalRequest); // Retry original request
            }
          } catch (refreshError) {
            // If refresh fails, log the user out forcefully
            localStorage.removeItem('todo_user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
      }
    }
      
    // If error is 403 (Forbidden) e.g. user is blocked
    if (error.response?.status === 403) {
      localStorage.removeItem('todo_user');
      window.location.href = '/login?error=account_suspended';
      return Promise.reject(error);
    }
    
    // No valid user session to begin with or refresh failed
    if (error.response?.status === 401) {
      localStorage.removeItem('todo_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
