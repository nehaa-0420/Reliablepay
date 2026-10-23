import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-600)' }}>404</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-900)', marginTop: '8px', marginBottom: '12px' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '440px', margin: '0 auto 24px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Overview
      </Link>
    </div>
  );
}
