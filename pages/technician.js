import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import CTABanner from '../components/CTABanner';
import { translations } from '../data/translations';

export default function Technician() {
  const router = useRouter();
  const { locale } = router;
  const t = translations[locale] || translations.fr;

  const [leadPhone, setLeadPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    technician_name: '',
    rge_number: '',
    company_name: '',
    customer_name: '',
    customer_phone: '',
    surface_utile_m2: '',
    hauteur_sous_plafond_m: '',
    nombre_de_couverts: '',
    nombre_de_chambres: '',
    type_local_surveille: '',
    orientation_facade: '',
    orientation_toiture: '',
    pac_power_kw: '',
    refrigerant: '',
    indoor_units_count: '',
    sound_level_db: '',
    model_name: '',
    backup_heater: '',
    photos_outdoor_unit: [],
    photos_indoor_units: [],
    photos_installation: [],
    notes: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (leadPhone && leadPhone.length >= 10) {
      fetchLeadData(leadPhone);
    }
  }, [leadPhone]);

  const fetchLeadData = async (phone) => {
    try {
      const res = await fetch(`${API_URL}/api/technician/lead/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          customer_name: data.prospect?.nom || '',
          customer_phone: data.phone_number || ''
        }));
      }
    } catch (err) {
      console.error('Lead fetch error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadPhotos = async (fieldName, files, submissionUuid) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submission_uuid', submissionUuid);
      formData.append('field_name', fieldName);
      const res = await fetch(`${API_URL}/api/technician/photo-upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(`Upload failed for ${fieldName}`);
      return res.json();
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const submitRes = await fetch(`${API_URL}/api/technician/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.detail || 'Erreur lors de la soumission');
      }
      const submission = await submitRes.json();
      const uuid = submission.uuid;

      const photoFields = ['photos_outdoor_unit', 'photos_indoor_units', 'photos_installation'];
      for (const field of photoFields) {
        const files = formData[field];
        if (files && files.length > 0) {
          await uploadPhotos(field, files, uuid);
        }
      }

      const pdfRes = await fetch(`${API_URL}/api/technician/generate-quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });

      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-asseng-${uuid}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }

      setSuccess(submission);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted && success) {
    return (
      <div className="min-h-screen bg-brand-dark font-sans text-white">
        <Head>
          <title>{t.technician_success_title || 'Devis généré'}</title>
          <meta name="description" content={t.technician_success_desc || 'Le devis a été généré et téléchargé.'} />
        </Head>
        <Navbar />
        <main className="py-24 px-6">
          <div className="max-w-3xl mx-auto bg-slate-900 p-10 rounded-xl border border-gray-800 text-center">
            <h2 className="text-3xl font-bold text-brand-orange mb-4">{t.technician_success || 'Devis généré avec succès'}</h2>
            <p className="text-gray-300 mb-6">{t.technician_success_desc || 'Le devis a été généré et téléchargé. Un email a été envoyé au client.'}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push('/')} className="px-6 py-3 bg-brand-orange text-white rounded hover:bg-orange-700">
                {t.back_to_home || "Retour à l'accueil"}
              </button>
              <button onClick={() => { setSubmitted(false); setFormData({ ...formData, notes: '', pac_power_kw: '' }); }} className="px-6 py-3 border border-gray-600 text-white rounded hover:bg-gray-800">
                {t.new_submission || 'Nouvelle soumission'}
              </button>
            </div>
          </div>
        </main>
        <CTABanner link="/contact#contact" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark font-sans text-white">
      <Head>
        <title>{t.technician_title || 'Portail Technicien Asseng'}</title>
        <meta name="description" content={t.technician_desc || 'Formulaire de collecte pour installateurs RGE'} />
      </Head>

      <Navbar />

      <main className="flex-col">
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{t.technician_title || 'Portail Technicien Asseng'}</h1>
            <p className="text-gray-400 mb-8">{t.technician_subtitle || 'Collecte des données chantier & génération de devis'}</p>

            <div className="bg-slate-900 p-8 rounded-xl border border-gray-800">
              <div className="mb-8 p-4 bg-blue-900/30 border border-blue-800/50 rounded-lg text-sm">
                <p className="text-blue-200">
                  <strong>RGPD :</strong> {t.rgpd_notice_tech || 'Les données sont stockées de manière sécurisée. Tu peux demander leur suppression à tout moment.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_lead || 'Client prospect'}</h3>
                  <div>
                    <label className="block text-sm font-bold mb-2">{t.lead_phone || 'Téléphone du client (WhatsApp)'}</label>
                    <input type="tel" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                  </div>
                  {formData.customer_name && (
                    <div className="mt-2 text-sm text-green-400">{t.lead_found || 'Client trouvé'}: {formData.customer_name}</div>
                  )}
                </div>

                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_identity || 'Identité technicien'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.tech_name || 'Nom'}</label>
                      <input name="technician_name" value={formData.technician_name} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.tech_rge || 'Numéro RGE'}</label>
                      <input name="rge_number" value={formData.rge_number} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-2">{t.tech_company || 'Entreprise'}</label>
                      <input name="company_name" value={formData.company_name} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_measurements || 'Mesures du site'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.surface_utile || 'Surface utile (m²)'}</label>
                      <input name="surface_utile_m2" type="number" step="0.1" value={formData.surface_utile_m2} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.hauteur || 'Hauteur sous plafond (m)'}</label>
                      <input name="hauteur_sous_plafond_m" type="number" step="0.1" value={formData.hauteur_sous_plafond_m} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.couverts || 'Nombre de couverts'}</label>
                      <input name="nombre_de_couverts" type="number" value={formData.nombre_de_couverts} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.chambres || 'Nombre de chambres'}</label>
                      <input name="nombre_de_chambres" type="number" value={formData.nombre_de_chambres} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.type_local || 'Type de local surveillé'}</label>
                      <select name="type_local_surveille" value={formData.type_local_surveille} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required>
                        <option value="">Sélectionnez...</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="hotel">Hôtel</option>
                        <option value="cafe">Café / Bar</option>
                        <option value="boulangerie">Boulangerie / Pâtisserie</option>
                        <option value="brasserie">Brasserie</option>
                        <option value="collectivite">Collectivité</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.orientation_facade || 'Orientation façade'}</label>
                      <select name="orientation_facade" value={formData.orientation_facade} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white">
                        <option value="">Non spécifié</option>
                        <option value="N">Nord</option>
                        <option value="S">Sud</option>
                        <option value="E">Est</option>
                        <option value="O">Ouest</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.orientation_toiture || 'Orientation toiture'}</label>
                      <select name="orientation_toiture" value={formData.orientation_toiture} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white">
                        <option value="">Non spécifié</option>
                        <option value="N">Nord</option>
                        <option value="S">Sud</option>
                        <option value="E">Est</option>
                        <option value="O">Ouest</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_equipment || 'Équipement proposé'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.pac_power || 'Puissance PAC (kW)'}</label>
                      <input name="pac_power_kw" type="number" step="0.1" value={formData.pac_power_kw} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.refrigerant || 'Fluide frigorigène'}</label>
                      <select name="refrigerant" value={formData.refrigerant} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required>
                        <option value="">Sélectionnez...</option>
                        <option value="R32">R32</option>
                        <option value="R290">R290 (propane)</option>
                        <option value="R134a">R134a</option>
                        <option value="R513A">R513A</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.indoor_units || "Nb d'unités intérieures"}</label>
                      <input name="indoor_units_count" type="number" value={formData.indoor_units_count} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.sound_level || 'Niveau sonore (dB)'}</label>
                      <input name="sound_level_db" type="number" step="0.1" value={formData.sound_level_db} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-2">{t.model_name || 'Modèle (Référence fabricant)'}</label>
                      <input name="model_name" value={formData.model_name} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white" required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-2">{t.backup_heater || 'Appoint chauffage'}</label>
                      <select name="backup_heater" value={formData.backup_heater} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white">
                        <option value="">Non nécessaire</option>
                        <option value="electrique">Électrique</option>
                        <option value="gaz">Gaz</option>
                        <option value="chaudiere">Chaudière existante</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_photos || 'Photos du site'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.photos_outdoor || 'Unité extérieure'}</label>
                      <input name="photos_outdoor_unit" type="file" multiple accept="image/*" onChange={handleChange} className="w-full p-2 bg-slate-800 border border-gray-700 rounded text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.photos_indoor || 'Unités intérieures'}</label>
                      <input name="photos_indoor_units" type="file" multiple accept="image/*" onChange={handleChange} className="w-full p-2 bg-slate-800 border border-gray-700 rounded text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">{t.photos_install || 'Installation globale'}</label>
                      <input name="photos_installation" type="file" multiple accept="image/*" onChange={handleChange} className="w-full p-2 bg-slate-800 border border-gray-700 rounded text-white text-sm" />
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-bold mb-4 text-brand-orange">{t.sec_notes || 'Notes techniques'}</h3>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder={t.notes_placeholder || 'Contraintes, observations, spécifications client...'} className="w-full p-3 bg-slate-800 border border-gray-700 rounded text-white"></textarea>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand-orange text-white font-bold rounded hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (t.btn_submitting || 'Soumission en cours…') : (t.btn_submit || 'Soumettre & Générer le devis PDF')}
                  </button>
                </div>
              </form>

              <div className="mt-8 p-4 bg-gray-900/50 rounded-lg text-sm text-gray-400">
                <p>{t.rgpd_notice_tech || 'Les données sont stockées de manière sécurisée. Tu peux demander leur suppression à tout moment.'}</p>
                <p className="mt-2"><a href="/contact#contact" className="text-brand-orange hover:underline">{t.cta_contact || 'Parler à un expert'}</a></p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CTABanner link="/contact#contact" />
    </div>
  );
}
