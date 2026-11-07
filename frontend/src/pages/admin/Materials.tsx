import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import MaterialTable from '../../components/MaterialTable'
import { Button, EmptyState, ErrorBanner, Loading, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/http'
import type { Project } from '../../lib/types'

export default function Materials() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<Project[]>('/projects')
      .then((p) => {
        setProjects(p)
        // Par défaut : le premier chantier en cours (ou tous, pour le dirigeant)
        const running = p.find((x) => x.status === 'IN_PROGRESS') ?? p[0]
        setProjectId((cur) => cur || (isAdmin ? '' : running ? String(running.id) : ''))
      })
      .catch((e: Error) => setError(e.message))
  }, [isAdmin])

  if (projects === null) return error ? <ErrorBanner message={error} /> : <Loading />

  return (
    <div>
      <PageHeader title="Matériel" subtitle="Le matériel utilisé sur les chantiers : nombre de pièces, prix unitaire, total."
        actions={isAdmin && <Link to="/admin/catalogue"><Button variant="secondary" icon="tag">Catalogue des pièces</Button></Link>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      {projects.length === 0 ? (
        <EmptyState icon="site" title={isAdmin ? 'Aucun chantier' : 'Aucun chantier pour vous'} text={isAdmin ? 'Créez d’abord un chantier pour y saisir le matériel.' : 'Vous n’êtes affecté à aucun chantier pour le moment.'} />
      ) : (
        <>
          <div className="mb-5 max-w-md">
            <Field label="Chantier" htmlFor="m-project">
              <select id="m-project" className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {isAdmin && <option value="">Tous les chantiers</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            {isAdmin && !projectId && <p className="mt-1 text-xs text-ink/55">Choisissez un chantier pour ajouter du matériel.</p>}
          </div>
          <MaterialTable key={projectId || 'all'} projectId={projectId ? Number(projectId) : null} projects={projects} isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}
