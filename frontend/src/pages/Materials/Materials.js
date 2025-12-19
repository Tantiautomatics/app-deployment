import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/utils/api';
import axios from 'axios';

const EmptyState = ({ title, subtitle, actionLabel, onAction, disabled }) => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="text-slate-600 mt-2">{subtitle}</p>
    {actionLabel ? (
      <Button className="mt-4" onClick={onAction} disabled={disabled}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export const Materials = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [open, setOpen] = useState(false);
  const [openPO, setOpenPO] = useState(false);
  const [form, setForm] = useState({ title: '', neededBy: '', items: '', assigneeEmail: '' });
  const [requests, setRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const API_URL = process.env.REACT_APP_BACKEND_URL === '' 
    ? '/api' 
    : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8010') + '/api';

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = projectId ? `${API_URL}/material-requests?project_id=${projectId}` : `${API_URL}/material-requests?mine=true`;
        const res = await axios.get(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setRequests(res.data || []);
      } catch (e) {
        // ignore for now
      }
    };
    load();
  }, [API_URL, open, projectId]);

  React.useEffect(() => {
    const loadPOs = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = projectId ? `${API_URL}/purchase-orders?project_id=${projectId}` : `${API_URL}/purchase-orders?mine=true`;
        const res = await axios.get(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setPurchaseOrders(res.data || []);
      } catch (e) {
        // ignore for now
      }
    };
    loadPOs();
  }, [API_URL, openPO, projectId]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Material Requests / POs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <EmptyState
                title="Material Requests"
                subtitle="Materials management coming soon..."
                actionLabel="Create Request"
                onAction={() => setOpen(true)}
                disabled={false}
              />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Material Request</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="title" className="text-right">Title</Label>
                      <Input id="title" placeholder="e.g., Conduits for Block A" className="col-span-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="neededBy" className="text-right">Needed By</Label>
                      <Input id="neededBy" type="date" className="col-span-3" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assigneeEmail" className="text-right">Send To (Email)</Label>
                      <Input id="assigneeEmail" type="email" placeholder="user@company.com" className="col-span-3" value={form.assigneeEmail} onChange={(e) => setForm({ ...form, assigneeEmail: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="items" className="text-right">Items</Label>
                      <Textarea id="items" placeholder="List materials and quantities" className="col-span-3" rows={4} value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      try {
                        if (!form.title) { toast.error('Title is required'); return; }
                        const payload = {
                          title: form.title,
                          items: form.items || undefined,
                          needed_by: form.neededBy ? new Date(form.neededBy).toISOString() : undefined,
                          assignee_email: form.assigneeEmail || undefined,
                          ...(projectId ? { project_id: projectId } : {})
                        };
                        await api.createMaterialRequest(payload);
                        toast.success('Material Request created');
                        setOpen(false);
                        setForm({ title: '', neededBy: '', items: '', assigneeEmail: '' });
                      } catch (e) {
                        toast.error('Failed to create request');
                      }
                    }}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            {activeTab === 'requests' && (
            <div className="mt-6">
              {requests.length === 0 ? (
                <p className="text-sm text-slate-600">No requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Needed By</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Sent To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{r.title}</td>
                          <td className="py-2 pr-4">{r.needed_by ? new Date(r.needed_by).toLocaleDateString() : '-'}</td>
                          <td className="py-2 pr-4">{r.status}</td>
                          <td className="py-2 pr-4">{r.assignee_email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}
            <TabsContent value="pos">
              <EmptyState
                title="Purchase Orders"
                subtitle="PO tracking coming soon..."
                actionLabel="Create PO"
                onAction={() => setOpenPO(true)}
                disabled={false}
              />
              <Dialog open={openPO} onOpenChange={setOpenPO}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="poTitle" className="text-right">Title</Label>
                      <Input id="poTitle" placeholder="e.g., Lights PO" className="col-span-3" onChange={(e)=>setForm({...form, poTitle: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="vendor" className="text-right">Vendor</Label>
                      <Input id="vendor" placeholder="Supplier name" className="col-span-3" onChange={(e)=>setForm({...form, poVendor: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amount" className="text-right">Amount</Label>
                      <Input id="amount" type="number" placeholder="0" className="col-span-3" onChange={(e)=>setForm({...form, poAmount: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="poItems" className="text-right">Items</Label>
                      <Textarea id="poItems" placeholder="List items" className="col-span-3" rows={4} onChange={(e)=>setForm({...form, poItems: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpenPO(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      try {
                        if (!form.poTitle) { toast.error('Title is required'); return; }
                        await api.createPurchaseOrder({
                          title: form.poTitle,
                          vendor: form.poVendor || undefined,
                          amount: form.poAmount ? parseFloat(form.poAmount) : undefined,
                          items: form.poItems || undefined,
                          ...(projectId ? { project_id: projectId } : {})
                        });
                        toast.success('PO created');
                        setOpenPO(false);
                        setForm({ ...form, poTitle: '', poVendor: '', poAmount: '', poItems: '' });
                      } catch (e) {
                        toast.error('Failed to create PO');
                      }
                    }}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="mt-6">
                {purchaseOrders.length === 0 ? (
                  <p className="text-sm text-slate-600">No purchase orders yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Title</th>
                          <th className="py-2 pr-4">Vendor</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">{p.title}</td>
                            <td className="py-2 pr-4">{p.vendor || '-'}</td>
                            <td className="py-2 pr-4">{p.amount != null ? p.amount : '-'}</td>
                            <td className="py-2 pr-4">{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Materials;


