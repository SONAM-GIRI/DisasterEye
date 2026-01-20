import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Trash2, Mail, Bell, ShieldCheck, Loader2, Send, Plus, X, HeartPulse } from 'lucide-react';
import { api } from '../services/storage';
import { Contact } from '../types';

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  
  // New Contact Form
  const [newContact, setNewContact] = useState({
    name: '',
    relation: '',
    phone: '',
    email: ''
  });

  const loadContacts = async () => {
    setLoading(true);
    const data = await api.getContacts();
    setContacts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    
    await api.addContact(newContact);
    setNewContact({ name: '', relation: '', phone: '', email: '' });
    setIsAdding(false);
    loadContacts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
        await api.deleteContact(id);
        loadContacts();
    }
  };

  const handleSOS = () => {
    setSendingSOS(true);
    setTimeout(() => {
        setSendingSOS(false);
        setSosSent(true);
        setTimeout(() => setSosSent(false), 5000);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-wide mb-1 flex items-center gap-3">
                <HeartPulse className="text-red-500" size={32} /> EMERGENCY CONTACTS
            </h1>
            <p className="text-slate-400">Manage your designated safety network and broadcast alerts.</p>
        </div>
      </header>

      {/* SOS Section */}
      <div className="bg-gradient-to-br from-red-950/50 to-slate-900 border border-red-500/30 rounded-2xl p-8 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
          <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-2xl font-bold text-white mb-2">EMERGENCY BROADCAST SYSTEM</h2>
              <p className="text-red-200/70 mb-6 max-w-lg">
                  Pressing the button below will send your current location and a distress signal to all registered contacts immediately.
              </p>
              
              <button 
                onClick={handleSOS}
                disabled={sendingSOS || sosSent}
                className={`
                    w-32 h-32 rounded-full border-4 border-red-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)]
                    transition-all duration-300 transform active:scale-95
                    ${sendingSOS ? 'bg-red-900 scale-95' : sosSent ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 hover:bg-red-500 hover:scale-105'}
                `}
              >
                  {sendingSOS ? (
                      <Loader2 size={48} className="text-white animate-spin" />
                  ) : sosSent ? (
                      <ShieldCheck size={48} className="text-white" />
                  ) : (
                      <div className="flex flex-col items-center">
                          <Bell size={40} className="text-white mb-1 animate-pulse" />
                          <span className="font-black text-white tracking-widest">SOS</span>
                      </div>
                  )}
              </button>
              
              <div className="h-8 mt-4">
                  {sendingSOS && <p className="text-red-400 font-mono animate-pulse">TRANSMITTING SIGNAL...</p>}
                  {sosSent && <p className="text-emerald-400 font-mono font-bold">ALERTS SENT SUCCESSFULLY</p>}
              </div>
          </div>
      </div>

      {/* Contacts List */}
      <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-200">My Network ({contacts.length})</h3>
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-bold text-sm"
              >
                  <Plus size={16} /> Add Contact
              </button>
          </div>

          {loading ? (
              <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
          ) : contacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contacts.map(contact => (
                      <div key={contact.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex justify-between items-start hover:border-slate-600 transition-colors group">
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xl">
                                  {contact.name.charAt(0)}
                              </div>
                              <div>
                                  <h4 className="font-bold text-white text-lg">{contact.name}</h4>
                                  <p className="text-sm text-cyan-400 font-mono uppercase tracking-wider mb-2">{contact.relation}</p>
                                  <div className="space-y-1">
                                      <p className="text-sm text-slate-400 flex items-center gap-2">
                                          <Phone size={14} /> {contact.phone}
                                      </p>
                                      {contact.email && (
                                          <p className="text-sm text-slate-400 flex items-center gap-2">
                                              <Mail size={14} /> {contact.email}
                                          </p>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(contact.id)}
                            className="text-slate-600 hover:text-red-500 transition-colors p-2"
                            title="Remove Contact"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <UserPlus size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">No emergency contacts added yet.</p>
                  <button onClick={() => setIsAdding(true)} className="text-blue-400 hover:text-blue-300 mt-2 font-bold text-sm">Add your first contact</button>
              </div>
          )}
      </div>

      {/* Add Contact Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-5 border-b border-slate-800">
                      <h3 className="text-lg font-bold text-white">Add Emergency Contact</h3>
                      <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleAddContact} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                          <input 
                            type="text" 
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={newContact.name}
                            onChange={e => setNewContact({...newContact, name: e.target.value})}
                            placeholder="e.g. Sarah Connor"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Relationship</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={newContact.relation}
                            onChange={e => setNewContact({...newContact, relation: e.target.value})}
                            placeholder="e.g. Mother, Partner, Friend"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                          <input 
                            type="tel" 
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={newContact.phone}
                            onChange={e => setNewContact({...newContact, phone: e.target.value})}
                            placeholder="+1 (555) 000-0000"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Email Address (Optional)</label>
                          <input 
                            type="email" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={newContact.email}
                            onChange={e => setNewContact({...newContact, email: e.target.value})}
                            placeholder="sarah@example.com"
                          />
                      </div>
                      <div className="pt-4">
                          <button 
                            type="submit" 
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 transition"
                          >
                              Save Contact
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Contacts;