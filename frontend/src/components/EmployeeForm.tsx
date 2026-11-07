import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { parseNum } from '../lib/format'
import { contractLabels, roleLabels, type ContractType, type Role, type UserAccount } from '../lib/types'
import { Field, inputClass } from './Field'
import { Button, ErrorBanner, Modal } from './ui'

const empty = {
  fullName: '', email: '', role: 'EMPLOYEE' as Role, phone: '', jobTitle: '', password: '',
  hireDate: '', contractType: '' as '' | ContractType, address: '', notes: '', monthlySalary: '',
}

/** Création (user = null) ou modification d'un employé. */
export default function EmployeeForm({ open, user, onClose, onSaved }: { open: boolean; user: UserAccount | null; onClose: () => void; onSaved: (u: UserAccount) => void }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(user ? {
      fullName: user.fullName, email: user.email, role: user.role, phone: user.phone ?? '', jobTitle: user.jobTitle ?? '', password: '',
      hireDate: user.hireDate ?? '', contractType: user.contractType ?? '', address: user.address ?? '', notes: user.notes ?? '',
      monthlySalary: user.monthlySalary != null ? String(user.monthlySalary) : '',
    } : empty)
  }, [open, user])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    const salary = form.monthlySalary.trim() === '' ? null : parseNum(form.monthlySalary)
    if (salary !== null && !(salary >= 0)) { setError('Salaire invalide.'); return }
    const body = {
      fullName: form.fullName, role: form.role, phone: form.phone, jobTitle: form.jobTitle,
      hireDate: form.hireDate || null, contractType: form.contractType || null, address: form.address, notes: form.notes,
      monthlySalary: salary,
    }
    setBusy(true)
    try {
      const saved = user
        ? await api<UserAccount>(`/users/${user.id}`, { method: 'PUT', json: body })
        : await api<UserAccount>('/users', { method: 'POST', json: { ...body, email: form.email, password: form.password } })
      onSaved(saved)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={user ? `Modifier ${user.fullName}` : 'Nouvel employé'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" form="employee-form" disabled={busy}>{user ? 'Enregistrer' : 'Créer l’employé'}</Button>
      </>}>
      <form id="employee-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Nom et prénom" htmlFor="u-name"><input id="u-name" required maxLength={150} className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
        <Field label="Fonction" htmlFor="u-job"><input id="u-job" maxLength={100} className={inputClass} placeholder="Électricien, chef d’équipe, apprenti…" value={form.jobTitle} onChange={set('jobTitle')} /></Field>
        <Field label="Téléphone" htmlFor="u-phone"><input id="u-phone" type="tel" maxLength={30} className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="E-mail (identifiant de connexion)" htmlFor="u-email" hint={user ? 'L’e-mail ne peut pas être modifié.' : undefined}>
          <input id="u-email" type="email" required disabled={user !== null} maxLength={255} className={inputClass} value={form.email} onChange={set('email')} />
        </Field>
        <div className="sm:col-span-2"><Field label="Adresse" htmlFor="u-address"><input id="u-address" maxLength={300} className={inputClass} value={form.address} onChange={set('address')} /></Field></div>

        <p className="mt-2 font-display text-lg font-bold sm:col-span-2">Contrat</p>
        <Field label="Type de contrat" htmlFor="u-contract">
          <select id="u-contract" className={inputClass} value={form.contractType} onChange={set('contractType')}>
            <option value="">Non renseigné</option>
            {(Object.keys(contractLabels) as ContractType[]).map((c) => <option key={c} value={c}>{contractLabels[c]}</option>)}
          </select>
        </Field>
        <Field label="Date d’embauche" htmlFor="u-hire"><input id="u-hire" type="date" className={inputClass} value={form.hireDate} onChange={set('hireDate')} /></Field>
        <Field label="Salaire mensuel (DA)" htmlFor="u-salary" hint="Montant convenu, utilisé dans le suivi des salaires.">
          <input id="u-salary" inputMode="decimal" className={inputClass} placeholder="45 000" value={form.monthlySalary} onChange={set('monthlySalary')} />
        </Field>
        <Field label="Accès à l’application" htmlFor="u-role" hint="Employé et stagiaire : leurs chantiers, tâches, matériel. Dirigeant : tout.">
          <select id="u-role" className={inputClass} value={form.role} onChange={set('role')}>
            {(Object.keys(roleLabels) as Role[]).map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
        </Field>
        {!user && (
          <Field label="Mot de passe provisoire" htmlFor="u-pass" hint="10 caractères minimum. Communiquez-le à la personne." className="sm:col-span-2">
            <input id="u-pass" type="text" required minLength={10} maxLength={72} autoComplete="off" className={inputClass} value={form.password} onChange={set('password')} />
          </Field>
        )}
        <div className="sm:col-span-2"><Field label="Notes internes" htmlFor="u-notes"><textarea id="u-notes" rows={2} maxLength={2000} className={inputClass} placeholder="Habilitations, permis, taille de vêtements…" value={form.notes} onChange={set('notes')} /></Field></div>
      </form>
    </Modal>
  )
}
