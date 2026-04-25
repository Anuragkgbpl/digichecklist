import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for mock session (Optional: Disabled to land on Login page as requested)
    /*
    const storedUser = localStorage.getItem('pcms_auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    */
    setLoading(false);
  }, []);

  const login = (id, password, role, actualUser = null) => {
    // Special check for Master Admin
    if (role === 'MASTER_ADMIN') {
      if (id.toLowerCase() !== 'master_jarvis' || password !== '9826731251@Anurag') {
        return false;
      }
    }

    const mockUser = actualUser || {
      id,
      name: role === 'MASTER_ADMIN' ? 'Master Admin' : role === 'UNIT_ADMIN' ? 'Unit Admin' : 'Employee User',
      role,
      unit: role === 'MASTER_ADMIN' ? null : 'Unit A',
      allowedActivity: 'ALL'
    };
    
    setUser(mockUser);
    localStorage.setItem('pcms_auth_user', JSON.stringify(mockUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pcms_auth_user');
  };

  // Allows a USER to change their own password.
  // The new password is saved both to the session and the employee record,
  // making it immediately visible to the Unit Admin.
  const updatePassword = (newPassword) => {
    if (!user || user.role !== 'USER') return false;

    // Update the employee record in localStorage
    const employees = JSON.parse(localStorage.getItem('pcms_employees') || '[]');
    const updatedEmployees = employees.map(emp => {
      if (emp.Employee_ID === user.id) {
        return { ...emp, password: newPassword };
      }
      return emp;
    });
    localStorage.setItem('pcms_employees', JSON.stringify(updatedEmployees));

    // Session doesn't store password, so nothing extra needed for session
    return true;
  };

  // Unit Admin resets an employee's password to their Employee_ID
  const resetEmployeePassword = (employeeId) => {
    const employees = JSON.parse(localStorage.getItem('pcms_employees') || '[]');
    const updatedEmployees = employees.map(emp => {
      if (emp.Employee_ID === employeeId) {
        return { ...emp, password: emp.Employee_ID };
      }
      return emp;
    });
    localStorage.setItem('pcms_employees', JSON.stringify(updatedEmployees));
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updatePassword, resetEmployeePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
