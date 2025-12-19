import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const storageKey = 'tanti_admin_templates_v1';

const defaultData = {
  regions: ['Bengaluru', 'Mysore', 'North Karnataka'],
  projectTypes: ['Residential', 'Commercial', 'Industrial'],
  statuses: ['Planning', 'Active', 'On-Hold', 'At-Risk', 'Completed']
};

export default function AdminTemplates() {
  const [data, setData] = useState(defaultData);
  const [newItem, setNewItem] = useState({ regions: '', projectTypes: '', statuses: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...defaultData, ...parsed });
      }
    } catch {}
  }, []);

  const persist = (next) => {
    setData(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addItem = (key) => {
    const value = (newItem[key] || '').trim();
    if (!value) return;
    if (data[key].includes(value)) return;
    const next = { ...data, [key]: [...data[key], value] };
    setNewItem({ ...newItem, [key]: '' });
    persist(next);
  };

  const removeItem = (key, value) => {
    const next = { ...data, [key]: data[key].filter((v) => v !== value) };
    persist(next);
  };

  const singular = (t) => ({ 'Regions': 'Region', 'Project Types': 'Project Type', 'Statuses': 'Status', 'Status': 'Status' }[t] || t.slice(0, -1));

  const Section = ({ title, keyName }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder={`Add ${singular(title)}`}
            value={newItem[keyName]}
            onChange={(e) => setNewItem({ ...newItem, [keyName]: e.target.value })}
          />
          <Button onClick={() => addItem(keyName)}>Add</Button>
        </div>
        {data[keyName].length === 0 ? (
          <p className="text-sm text-slate-600">No items yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data[keyName].map((v) => (
              <div key={v} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-sm">
                <span>{v}</span>
                <button className="text-red-600" onClick={() => removeItem(keyName, v)}>×</button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Admin / Templates</h1>
        <div className="text-sm text-slate-600">Values are saved in your browser</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Regions" keyName="regions" />
        <Section title="Project Types" keyName="projectTypes" />
        <Section title="Status" keyName="statuses" />
      </div>
    </div>
  );
}


