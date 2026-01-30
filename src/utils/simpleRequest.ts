/**
 * Simple request utilities to avoid CORS preflight when possible
 * 
 * CORS preflight can be avoided by using "simple requests":
 * - Method: GET, HEAD, POST
 * - Headers: Accept, Accept-Language, Content-Language, Content-Type (limited values)
 * - Content-Type: application/x-www-form-urlencoded, multipart/form-data, text/plain
 */

// Helper function to convert object to URL search params for GET requests
export const objectToURLParams = (obj: Record<string, any>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }
  return params.toString();
};

// Simple GET request without custom headers to avoid preflight
export const simpleGet = async (url: string, params?: Record<string, any>) => {
  let fullUrl = url;
  if (params) {
    const queryString = objectToURLParams(params);
    fullUrl += (url.includes('?') ? '&' : '?') + queryString;
  }
  
  return fetch(fullUrl, {
    method: 'GET',
    credentials: 'include',
    // No custom headers = no preflight needed
  });
};

// Simple POST with form data to avoid preflight
export const simplePost = async (url: string, data: Record<string, any>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  }
  
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Content-Type will be set automatically for FormData
    // multipart/form-data doesn't trigger preflight
  });
};

// Check if we can use simple request (no custom headers needed)
export const canUseSimpleRequest = (method: string, hasAuth: boolean): boolean => {
  // Simple methods
  const simpleMethods = ['GET', 'HEAD', 'POST'];
  if (!simpleMethods.includes(method.toUpperCase())) {
    return false;
  }
  
  // If we need Authorization header, we can't use simple request
  if (hasAuth) {
    return false;
  }
  
  return true;
};