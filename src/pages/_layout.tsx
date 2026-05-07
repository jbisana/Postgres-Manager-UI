import React from 'react';
// @ts-ignore
import { Outlet } from 'react-router-dom';

// /src/pages/_layout.tsx
// Main layout wrapping all pages

export default function Layout() {
  return (
    <div>
      {/* TODO: Add sidebar and top nav */}
      {/* TODO: Add connection status bar */}
      <Outlet />
    </div>
  );
}
