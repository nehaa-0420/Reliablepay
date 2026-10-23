import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--color-primary-600)', letterSpacing: '-0.04em' }}>
        404
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', marginBottom: '12px' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', margin: '0 auto 24px', lineHeight: 1.6 }}>
        The requested routing endpoint does not exist or has been restructured.
      </p>
      <Link to="/">
        <Button variant="primary" icon={Home}>
          Return to Overview
        </Button>
      </Link>
    </div>
  );
}
