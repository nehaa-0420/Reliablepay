import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ healthStatus }) {
  // healthStatus: 'UP' | 'DOWN' | 'CHECKING'
  let pillClass = 'status-pill checking';
  let pillText = 'Checking...';

  if (healthStatus === 'UP') {
    pillClass = 'status-pill online';
    pillText = 'Backend Online';
  } else if (healthStatus === 'DOWN') {
    pillClass = 'status-pill offline';
    pillText = 'Backend Offline';
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>ReliablePay</span>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/lab" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Chaos Lab
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Compare
          </NavLink>
        </nav>

        <div className="nav-right">
          <div className={pillClass} title={`Actuator health check status: ${healthStatus}`}>
            <span className="status-dot"></span>
            <span>{pillText}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
