# PostgreSQL Management & Audit System

A full-stack PostgreSQL management application designed for high-performance data auditing, infrastructure troubleshooting, and security management.

Live Demo: https://postgresmanagerui.jbisana89.workers.dev/

## 🚀 Vision
The system provides a unified interface for database administrators and developers to manage PostgreSQL environments with a focus on **Security (RLS)**, **Auditing (Logs)**, and **Efficiency (Query Editor)**.

## 🎨 Design System: "Deep Emerald"
The application utilizes a dark-mode first design philosophy:
- **Theme**: Deep, neutral dark mode based on `Zinc-950` to reduce eye strain.
- **Accents**: Emerald Green (`#10b981`) for high-contrast interactive elements and success indicators.
- **Typography**:
  - **Interface**: `Inter` (Sans-serif) for clean, versatile UI readability.
  - **Technical Data**: `JetBrains Mono` (Monospaced) for distinct character alignment in SQL, IDs, and metrics.
 

<img width="1390" height="1152" alt="Screenshot 2026-05-07 194417" src="https://github.com/user-attachments/assets/7a352169-2a74-47b8-833f-e3c7e8940c7f" />


## 🛠 Features

### 1. Database Explorer
- Visual schema navigation with JetBrains Mono typography for technical identifiers.
- Real-time table data viewing with support for complex PostgreSQL types.
- Integrated table metrics and relationship graphing.

### 2. Advanced Query Editor (Monaco-powered)
- Syntax highlighting for PostgreSQL.
- Multi-tab support for concurrent query sessions.
- Export as JSON functionality for data integration.
- Query history and saved queries library for recurring tasks.

### 3. Access Control & Security Wizard
- **GRANT / REVOKE Wizard**: A 3-step process to construct robust security statements (Roles -> Objects -> Privileges).
- **RLS Policy Manager**: Integrated UI for designing Row Level Security policies with highlighting for `USING` and `WITH CHECK` clauses.
- **User Invitation Management**: Streamlined workflow for platform-level access.

### 4. Enterprise Audit Logs
- Full visibility into all `CREATE`, `UPDATE`, and `DELETE` operations.
- Staggered status badges with Emerald Green spectrum highlights.
- Precise timestamps and user attribution in technical monospaced font.

### 5. Infrastructure Management
- **Extensions**: One-click installation and management of PostgreSQL extensions.
- **PostgREST Manager**: Visual configuration for exposing your schema as a RESTful API.
- **Backups & Restore**: Snapshot management and version control for database state.
- **Version Control**: Git-style tracking of schema migrations and DDL changes.

## 💻 Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons.
- **Backend**: Express (TypeScript), PostgreSQL integration.
- **State Management**: Zustand.
- **Animations**: Motion (framer-motion).
- **Charts**: Recharts.
- **Editor**: Monaco Editor.

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- A running PostgreSQL instance (or use the built-in mock mode)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🔒 Security
- Row Level Security (RLS) is used as a primary defense-in-depth mechanism.
- All administrative actions are logged in the Audit system.
- API keys and secrets are strictly managed server-side.

---

*Built with passion for database integrity.*
