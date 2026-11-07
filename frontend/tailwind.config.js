/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1f33',      // texte, barre latérale (fond du tableau électrique)
        navy: '#12355b',
        volt: '#f5d300',     // la couleur « sous tension » : état actif, appel à l'action
        panel: '#eef1f4',    // fond de l'application
        line: '#d8dee5',     // bordures
        // Statuts inspirés du code couleur des conducteurs
        wire: { blue: '#1f5fae', green: '#1d7f46', brown: '#8b4a1c', red: '#c2332b', amber: '#a86a00' },
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '"Segoe UI"', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
      boxShadow: { lift: '0 1px 0 rgba(11,31,51,.04), 0 6px 20px -12px rgba(11,31,51,.35)' },
    },
  },
  plugins: [],
}
