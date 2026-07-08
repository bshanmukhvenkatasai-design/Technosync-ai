import React from 'react';

const Features: React.FC = () => {
  return (
    <section className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-4">Features</h1>
      <ul className="list-disc list-inside space-y-2">
        <li>AI‑powered complaint categorization</li>
        <li>Real‑time dashboards for MPs and officers</li>
        <li>Interactive maps of constituencies</li>
        <li>Secure authentication with Supabase</li>
        <li>Responsive design with Tailwind & shadcn/ui</li>
      </ul>
    </section>
  );
};

export default Features;
