import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import Realisations from './pages/Realisations'
import Contact from './pages/Contact'
import Devis from './pages/Devis'
import { RequireAuth, useAuth } from './lib/auth'
import AdminLayout from './pages/admin/AdminLayout'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Requests from './pages/admin/Requests'
import Clients from './pages/admin/Clients'
import Projects from './pages/admin/Projects'
import ProjectDetail from './pages/admin/ProjectDetail'
import Tasks from './pages/admin/Tasks'
import Employees from './pages/admin/Employees'
import EmployeeDetail from './pages/admin/EmployeeDetail'
import Absences from './pages/admin/Absences'
import Materials from './pages/admin/Materials'
import Catalog from './pages/admin/Catalog'
import Invoices from './pages/admin/Invoices'
import InvoiceView from './pages/admin/InvoiceView'
import Salaries from './pages/admin/Salaries'
import Quotes from './pages/admin/Quotes'
import Settings from './pages/admin/Settings'
import Account from './pages/admin/Account'
import QuoteView from './pages/admin/QuoteView'
import AdminRealisations from './pages/admin/Realisations'

function AdminHome() {
  const { session } = useAuth()
  return session?.role === 'ADMIN' ? <Dashboard /> : <Navigate to="/admin/chantiers" replace />
}

/** Pages réservées au dirigeant : les autres sont renvoyés vers leurs chantiers (le serveur refuse de toute façon). */
function AdminOnly({ children }: { children: JSX.Element }) {
  const { session } = useAuth()
  return session?.role === 'ADMIN' ? children : <Navigate to="/admin/chantiers" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="realisations" element={<Realisations />} />
        <Route path="contact" element={<Contact />} />
        <Route path="devis" element={<Devis />} />
      </Route>

      <Route path="admin/login" element={<Login />} />
      <Route path="admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminHome />} />
        <Route path="demandes" element={<AdminOnly><Requests /></AdminOnly>} />
        <Route path="clients" element={<AdminOnly><Clients /></AdminOnly>} />
        <Route path="chantiers" element={<Projects />} />
        <Route path="chantiers/:id" element={<ProjectDetail />} />
        <Route path="taches" element={<Tasks />} />
        <Route path="materiel" element={<Materials />} />
        <Route path="catalogue" element={<AdminOnly><Catalog /></AdminOnly>} />
        <Route path="employes" element={<AdminOnly><Employees /></AdminOnly>} />
        <Route path="employes/:id" element={<AdminOnly><EmployeeDetail /></AdminOnly>} />
        <Route path="absences" element={<AdminOnly><Absences /></AdminOnly>} />
        <Route path="salaires" element={<AdminOnly><Salaries /></AdminOnly>} />
        <Route path="factures" element={<AdminOnly><Invoices /></AdminOnly>} />
        <Route path="factures/:id" element={<AdminOnly><InvoiceView /></AdminOnly>} />
        <Route path="devis" element={<AdminOnly><Quotes /></AdminOnly>} />
        <Route path="devis/:id" element={<AdminOnly><QuoteView /></AdminOnly>} />
        <Route path="realisations" element={<AdminRealisations />} />
        <Route path="parametres" element={<AdminOnly><Settings /></AdminOnly>} />
        <Route path="compte" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
