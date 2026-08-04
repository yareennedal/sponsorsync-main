import { createContext } from 'react';

/**
 * Raw AuthContext — consumed by AuthProvider and useAuth.
 * Not intended for direct application use.
 */
const AuthContext = createContext(null);
export default AuthContext;
