import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkSystemConfig } from '../utils/crypto';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for mock session (Optional: Disabled to land on Login page as requested)
    /*
    const storedUser = localStorage.getItem('_auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    */
    setLoading(false);
  }, []);

  const login = (id, password, role, actualUser = null) => {
    // Special check for Master Admin
    if (role === 'MASTER_ADMIN') {
      if (!checkSystemConfig(id, password)) {
        return false;
      }
    }

    if (id !== 'qr_user') {
      localStorage.removeItem('qr_mode');
      localStorage.removeItem('qr_scan_level');
      localStorage.removeItem('qr_scan_name');
    }

    const mockUser = actualUser || {
      id,
      name: role === 'MASTER_ADMIN' ? 'Master Admin' : role === 'UNIT_ADMIN' ? 'Unit Admin' : 'Employee User',
      role,
      unit: role === 'MASTER_ADMIN' ? null : 'Unit A',
      allowedActivity: 'ALL'
    };

    setUser(mockUser);
    localStorage.setItem('_auth_user', JSON.stringify(mockUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('_auth_user');
    localStorage.removeItem('qr_mode');
    localStorage.removeItem('qr_scan_level');
    localStorage.removeItem('qr_scan_name');
  };

  // Allows a USER to change their own password.
  // The new password is saved both to the session and the employee record,
  // making it immediately visible to the Unit Admin.
  const updatePassword = (newPassword) => {
    if (!user || user.role !== 'USER') return false;

    // Update the employee record in localStorage
    const employees = JSON.parse(localStorage.getItem('_employees') || '[]');
    const updatedEmployees = employees.map(emp => {
      if (emp.Employee_ID === user.id) {
        return { ...emp, password: newPassword };
      }
      return emp;
    });
    localStorage.setItem('_employees', JSON.stringify(updatedEmployees));

    // Session doesn't store password, so nothing extra needed for session
    return true;
  };

  // Unit Admin resets an employee's password to their Employee_ID
  const resetEmployeePassword = (employeeId) => {
    const employees = JSON.parse(localStorage.getItem('_employees') || '[]');
    const updatedEmployees = employees.map(emp => {
      if (emp.Employee_ID === employeeId) {
        return { ...emp, password: emp.Employee_ID };
      }
      return emp;
    });
    localStorage.setItem('_employees', JSON.stringify(updatedEmployees));
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updatePassword, resetEmployeePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
