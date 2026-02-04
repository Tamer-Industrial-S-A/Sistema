
import React, { useState } from 'react';
import { AppData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package, Users, Activity, Sparkles, Loader2 } from 'lucide-react';
import { analyzeStockAndOrders } from '../services/geminiService';

interface DashboardProps {
  data: AppData;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = [
    { label: 'Total Materiales', value: data.MATERIALES.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Clientes Activos', value: data.CLIENTES.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Órdenes Fabricación', value: data.ORD_FABRICACIONES.length, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const handleRunAnalysis = async () => {
    setLoading(true);
    const result = await analyzeStockAndOrders(data);
    setAnalysis(result || "No hay datos suficientes para el análisis.");
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${stat.bg} p-3 rounded-lg`}>
              <stat.icon className={stat.color} size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 text-slate-800">Stock por Material</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.MATERIALES.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="DESCRIPCION" hide={data.MATERIALES.length > 5} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="EN_STOCK" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-purple-500" size={20} />
              Inteligencia Predictiva
            </h3>
            <button 
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Generar Análisis'}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-dashed border-slate-300 min-h-[200px]">
            {analysis ? (
              <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">
                {analysis}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <p>Analiza el flujo de trabajo y stock con IA para detectar cuellos de botella.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
