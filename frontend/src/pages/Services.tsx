import { Link } from 'react-router-dom'

const services = [
  ['Installation électrique neuve', 'Logements neufs, extensions, locaux professionnels.'],
  ['Rénovation électrique', 'Remplacement de l’installation, passage de câbles, remise à neuf complète.'],
  ['Mise en conformité', 'Remise en sécurité de l’installation, mise à la terre, protections différentielles.'],
  ['Raccordement et compteur', 'Préparation de l’installation pour le branchement Sonelgaz, coffret et colonne montante.'],
  ['Tableau électrique', 'Remplacement, ajout de protections différentielles et disjoncteurs.'],
  ['Dépannage', 'Recherche de panne, remplacement d’appareillage, rétablissement du courant.'],
  ['Climatisation', 'Ligne dédiée, protection et raccordement des climatiseurs.'],
  ['Groupe électrogène et onduleur', 'Inverseur de source et alimentation de secours contre les coupures.'],
  ['Éclairage', 'Éclairage intérieur et extérieur, LED, variateurs.'],
  ['Domotique', 'Volets, chauffage et éclairage pilotés.'],
]

export default function Services() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Nos services</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {services.map(([title, text]) => (
          <li key={title} className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-ink/75">{text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8"><Link to="/devis" className="rounded-md bg-ink px-6 py-3 font-semibold text-white hover:bg-navy">Demander un devis</Link></p>
    </div>
  )
}
