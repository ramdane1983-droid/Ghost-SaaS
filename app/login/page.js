'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Dashboard() {
  const [clients, setClients] = useState([])
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [status, setStatus] = useState('Prospect')
  const [loading, setLoading] = useState(true)

  // CHARGER LES DONNÉES DEPUIS LE CLOUD
  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setClients(data)
    setLoading(false)
  }

  // AJOUTER AU CLOUD
  async function addClient() {
    if (!name || !budget) return
    const { error } = await supabase
      .from('clients')
      .insert([{ name, budget: parseFloat(budget), status }])
    
    if (!error) {
      setName(''); setBudget('');
      fetchClients()
    }
  }

  // SUPPRIMER DU CLOUD
  async function deleteClient(id) {
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const stats = {
    total: clients.reduce((acc, c) => acc + (c.budget || 0), 0),
    paid: clients.filter(c => c.status === 'Payé').reduce((acc, c) => acc + (c.budget || 0), 0)
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-blue-500 font-black tracking-widest uppercase">Sync_Cloud...</div>

  return (
    <div className="min-h-screen bg-[#050505] text-white p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black italic text-blue-500 uppercase">GhostSaaS <span className="text-white text-xl not-italic">Cloud</span></h1>
            <p className="text-slate-600 text-[10px] font-bold tracking-[0.5em] mt-2 text-right">DATABASE: CONNECTED</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px] font-black uppercase">Chiffre d'Affaires Encaissé</p>
            <h2 className="text-4xl font-black text-green-400">{stats.paid}€</h2>
          </div>
        </div>

        {/* FORMULAIRE */}
        <div className="bg-[#0f0f0f] p-4 rounded-3xl border border-slate-800 flex gap-4 mb-12">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Projet" className="flex-1 bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500"/>
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="€" className="w-24 bg-black border border-slate-800 p-4 rounded-2xl outline-none"/>
          <button onClick={addClient} className="bg-blue-600 px-8 rounded-2xl font-black uppercase text-[10px]">Injecter</button>
        </div>

        {/* LISTE */}
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="bg-[#0f0f0f] border border-slate-800 p-6 rounded-[2rem] flex justify-between items-center group">
              <div>
                <h3 className="text-lg font-bold">{client.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{client.budget}€ • {client.status}</p>
              </div>
              <button onClick={() => deleteClient(client.id)} className="opacity-0 group-hover:opacity-100 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all">Supprimer</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}