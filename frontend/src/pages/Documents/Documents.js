import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Upload, Download, FileBox } from 'lucide-react';
import { toast } from 'sonner';

export const Documents = ({ projectId }) => {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('signcopy');
  const [formData, setFormData] = useState({
    project_id: projectId ? String(projectId) : '',
    type: 'Drawings'
  });
  
  // Scope of work list state
  const [scopeItems, setScopeItems] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const scopeTableRef = useRef(null);

  const saveScopeWorkList = (items) => {
    try {
      // Only save if projectId is valid - never use 'default' fallback
      if (projectId) {
        localStorage.setItem(`scope-work-list-${projectId}`, JSON.stringify(items));
      }
    } catch (e) {
      console.error('Failed to save scope work list:', e);
    }
  };

  const initializeScopeWorkList = () => {
    const initialItems = [
      {
        id: 1,
        description: 'Electrical Labour contract',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'On Going',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 2,
        description: 'Slab Conduits & accessories',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Completed',
        approximate_cost: 'Completed',
        remarks: ''
      },
      {
        id: 3,
        description: 'Wall Conduits & Chipping',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹34,643.00',
        remarks: ''
      },
      {
        id: 4,
        description: 'Internal Wiring & Cables',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹10,38,242.00',
        remarks: ''
      },
      {
        id: 5,
        description: 'DBs, MCBs and Protection devices',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹64,953.00',
        remarks: ''
      },
      {
        id: 6,
        description: 'Custom DBs for automation',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '25K To 30K',
        remarks: 'Tanti Can Supply All the Product Mentioned Here, subjected to approval of proforma invoice and accpetance of sales terms and conditions'
      },
      {
        id: 7,
        description: 'International Switches',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹1,54,030.00',
        remarks: ''
      },
      {
        id: 8,
        description: 'Indian Switches',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹51,886.00',
        remarks: ''
      },
      {
        id: 9,
        description: 'Electrical Panels',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: 'Awaiting the quotation from the electrical panel',
        remarks: ''
      },
      {
        id: 10,
        description: 'Earthing works (Convensional/ Copper rods with Chemical Earthing)',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'NA',
        supply: 'Client Scope / Tanti can Supply',
        installation: 'Electrical Contractor / Tanti',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹247,695',
        remarks: ''
      },
      {
        id: 11,
        description: 'Light Fixtures',
        design_intent: 'Lighting Consultant',
        value_engineering: 'Light Fixture vendor',
        supervision_coordination: 'NA',
        supply: 'Light Fixture vendor',
        installation: 'Light Fixture vendor',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: 'Client scope',
        remarks: 'Power for the light fixture will be provided by Tanti. The installation of the light fixture will be performed by the vendor. Tanti can also install spotlights and regular lights at an additional cost per fixture if requested.'
      },
      {
        id: 12,
        description: 'Backend Components',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '₹1,960,218.00',
        remarks: ''
      },
      {
        id: 13,
        description: 'Fronted Components',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: 'The Quotation is yet to be finalised'
      },
      {
        id: 14,
        description: 'Visualization / Mobile Control',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '₹141,152.00',
        remarks: ''
      },
      {
        id: 15,
        description: 'CCTV Basic',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 16,
        description: 'CCTV AI Based',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 17,
        description: 'VDP villa / Multi tenant / Lock Inbuilt',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 18,
        description: 'Communication wiring and passive',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 19,
        description: 'Networking Passive',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 20,
        description: 'Networking Active',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '₹1,226,114.00',
        remarks: 'The Quotation is yet to be finalised'
      },
      {
        id: 21,
        description: 'WiFi',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 22,
        description: 'Digital Locks stand alone / Access controled',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 23,
        description: 'Security System Basic',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 24,
        description: 'Security system Advanced (Gas leakage, smoke detection)',
        design_intent: 'Tanti',
        value_engineering: 'Tanti',
        supervision_coordination: 'Tanti',
        supply: 'Tanti can Supply',
        installation: 'Tanti',
        programming_commissioning: 'Tanti',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 25,
        description: 'Gate Motor for main gate. Shutter Motor for',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '60 to 75K Each',
        remarks: ''
      },
      {
        id: 26,
        description: 'Epbax/Ipbax / intercomm System',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '33740+Commissioning Charges',
        remarks: ''
      },
      {
        id: 27,
        description: 'Curtain Motor/Blinds for Windows',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '25 to 45k Each',
        remarks: ''
      },
      {
        id: 28,
        description: 'Water Management solutions',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 29,
        description: 'Zonal Audio',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: 'NA',
        remarks: ''
      },
      {
        id: 30,
        description: 'Home theater',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '15-30 Lakhs (Only electrical)',
        remarks: 'Provision shall be made, supply and installation in the scope of vendor shortlisted'
      },
      {
        id: 31,
        description: 'HVAC Control',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '₹134,400.00',
        remarks: ''
      },
      {
        id: 32,
        description: 'Any Socket on Schedule or Timer control',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 33,
        description: 'Heat Pumb On-Off control based on time',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: 'Rs 9000 + Commissioning charges',
        remarks: ''
      },
      {
        id: 34,
        description: 'Voice control with Alexa or Siri',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '₹5,63,596',
        remarks: ''
      },
      {
        id: 35,
        description: 'Commissioning, programming, handover and 1 year service',
        design_intent: 'Tanti',
        value_engineering: 'Tanti Can Supply',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Tanti Can Supply',
        installation: 'Tanti Can Supply',
        programming_commissioning: 'Tanti Can Supply',
        status: 'Yet to be started',
        approximate_cost: '₹5,63,596',
        remarks: ''
      },
      {
        id: 36,
        description: 'RMU, Meter Cubicle,',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹530,000.00',
        remarks: 'Typically in Banglore bescom expects RMU with the DAS system with separate VCB Panel, here we considered only RMU Panel as per the SLD'
      },
      {
        id: 37,
        description: 'Transformer,',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹130,000.00',
        remarks: ''
      },
      {
        id: 38,
        description: 'LT Kiosk',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹75,000.00',
        remarks: 'Meters & CTs to be purchsed separatel from BESCOM'
      },
      {
        id: 39,
        description: 'HT cable laying from BESCOM tapping point to',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 40,
        description: 'HT cable laying from RMU to Mtere cubicle',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '₹230,000.00',
        remarks: 'As per BESCOM'
      },
      {
        id: 41,
        description: 'HT cable laying from Meter cubicle to Primary',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 42,
        description: 'LT cable laying from Secondary side of',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 43,
        description: 'LT cable laying from LT Kiosk to LT Main panel',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '120000',
        remarks: ''
      },
      {
        id: 44,
        description: 'LT cable laying from LT Main panel to Sub',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 45,
        description: 'LT cable laying from Sub panels to DB\'s',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 46,
        description: 'Main LT panel and Sub panels',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Contractor / Tanti',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '209000',
        remarks: ''
      },
      {
        id: 47,
        description: 'Fiber Optics uplinks across property for fast connectivity',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 48,
        description: 'Installation of TV antennas',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'Tata sky',
        programming_commissioning: 'NA',
        status: 'Yet to be started',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 49,
        description: 'Fire alarm system',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'NA',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 50,
        description: 'PA system',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'NA',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 51,
        description: 'Emergency exit system',
        design_intent: 'NA',
        value_engineering: 'NA',
        supervision_coordination: 'NA',
        supply: 'NA',
        installation: 'NA',
        programming_commissioning: 'NA',
        status: 'NA',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 53,
        description: 'Lighting protection system',
        design_intent: 'Not defined',
        value_engineering: 'Not defined',
        supervision_coordination: 'Not defined',
        supply: 'Not defined',
        installation: 'NA',
        programming_commissioning: 'Not defined',
        status: '',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 54,
        description: 'DG',
        design_intent: 'DG vendor',
        value_engineering: 'DG vendor',
        supervision_coordination: 'DG vendor',
        supply: 'DG vendor',
        installation: 'NA',
        programming_commissioning: 'Yet to be started',
        status: '',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 55,
        description: 'Solar panels',
        design_intent: 'Solar Vendor',
        value_engineering: 'Solar Vendor',
        supervision_coordination: 'Solar Vendor',
        supply: 'Solar Vendor',
        installation: 'NA',
        programming_commissioning: 'Yet to be started',
        status: '',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 56,
        description: 'Servo Voltage Stabilizer',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'Tanti Can Supply',
        supply: 'Electrical Consultant / Tanti',
        installation: 'NA',
        programming_commissioning: 'Yet to be started',
        status: '',
        approximate_cost: '',
        remarks: ''
      },
      {
        id: 57,
        description: 'UPS',
        design_intent: 'Electrical Consultant / Tanti',
        value_engineering: 'Electrical Consultant / Tanti',
        supervision_coordination: 'UPS Vendor',
        supply: 'UPS Vendor',
        installation: 'NA',
        programming_commissioning: 'Yet to be started',
        status: '',
        approximate_cost: '',
        remarks: 'The inlet and outlet required for inverter and Batteries are done by Tanti. Installation of Inverter and batteries and testing shall be carried out by UPS vendor'
      }
    ];
    setScopeItems(initialItems);
    saveScopeWorkList(initialItems);
  };

  const loadScopeLayout = () => {
    // Only load layout if projectId is valid
    if (!projectId) {
      return;
    }
    
    const layoutKey = `scope-work-list-layout-${projectId}`;
    const savedLayout = localStorage.getItem(layoutKey);
    if (savedLayout) {
      try {
        const layout = JSON.parse(savedLayout);
        setColumnWidths(layout.columnWidths || {});
        setRowHeights(layout.rowHeights || {});
      } catch (e) {
        console.error('Failed to load scope layout:', e);
      }
    }
  };

  useEffect(() => {
    // CRITICAL: Clear all state when projectId changes to prevent data leakage
    setDocuments([]);
    setScopeItems([]);
    setColumnWidths({});
    setRowHeights({});
    setLoading(true);
    setFormData({
      project_id: projectId ? String(projectId) : '',
      type: 'Drawings'
    });
    
    fetchData();
  }, [projectId]);

  // Ensure projects are loaded when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      // Always fetch projects when dialog opens to ensure fresh data
      const fetchProjects = async () => {
        try {
          const projectsRes = await api.getProjects();
          const projectsList = projectsRes.data || [];
          // Projects fetched successfully
          setProjects(projectsList);
        } catch (error) {
          // Failed to fetch projects
        }
      };
      fetchProjects();
    }
  }, [dialogOpen]);

  useEffect(() => {
    // Only load scope items if projectId is valid
    if (!projectId) {
      return;
    }
    
    const savedItems = localStorage.getItem(`scope-work-list-${projectId}`);
    if (savedItems) {
      try {
        const items = JSON.parse(savedItems);
        // Check if we have all items (should have 56 items: 1-46, 47-51, 53-57)
        // If less than 56, reinitialize to get the updated list
        if (items.length < 56) {
          initializeScopeWorkList();
        } else {
          setScopeItems(items);
        }
      } catch (e) {
        console.error('Failed to load scope work list:', e);
        initializeScopeWorkList();
      }
    } else {
      initializeScopeWorkList();
    }
    loadScopeLayout();
  }, [projectId]);

  useEffect(() => {
    // Only save layout if projectId is valid
    if (!projectId) {
      return;
    }
    
    if (Object.keys(columnWidths).length > 0 || Object.keys(rowHeights).length > 0) {
      const layoutKey = `scope-work-list-layout-${projectId}`;
      try {
        localStorage.setItem(layoutKey, JSON.stringify({
          columnWidths,
          rowHeights
        }));
      } catch (e) {
        console.error('Failed to save scope layout:', e);
      }
    }
  }, [columnWidths, rowHeights, projectId]);

  const updateScopeItem = (id, field, value) => {
    const updated = scopeItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setScopeItems(updated);
    saveScopeWorkList(updated);
  };

  const renderStatusSelect = (item) => {
    const statusOptions = ['On Going', 'Completed', 'Yet to be'];
    const currentValue = statusOptions.includes(item.status) ? item.status : undefined;
    return (
      <Select value={currentValue} onValueChange={(value) => updateScopeItem(item.id, 'status', value)}>
        <SelectTrigger className="w-full h-auto min-h-[28px] py-0 px-2 text-center border-0 bg-transparent text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="On Going">On Going</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Yet to be">Yet to be</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const autoExpandTextarea = (e) => {
    if (e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  };

  const handleColumnResize = (columnIndex, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = e.target.offsetWidth;
    const columnKey = columnIndex;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(100, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnKey]: `${newWidth}px` }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRowResize = (rowIndex, e) => {
    e.preventDefault();
    const startY = e.clientY;
    const row = e.target.closest('tr');
    const startHeight = row.offsetHeight;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientY - startY;
      const newHeight = Math.max(40, startHeight + diff);
      setRowHeights(prev => ({ ...prev, [rowIndex]: newHeight }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const fetchData = async () => {
    try {
      const projectsRes = await api.getProjects();
      const projectsList = projectsRes.data || [];
      // Projects loaded successfully
      setProjects(projectsList);
      
      // Only fetch documents if projectId is provided
      if (projectId) {
        try {
          const documentsRes = await api.getDocuments(projectId);
          const documentsList = documentsRes.data || [];
          setDocuments(documentsList);
        } catch (docError) {
          // Failed to fetch documents
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (error) {
      // Failed to fetch data
      setProjects([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('project_id', formData.project_id);
      formDataToSend.append('doc_type', formData.type);

      await api.uploadDocument(formDataToSend);
      toast.success('Document uploaded successfully!');
      setDialogOpen(false);
      fetchData();
      setFormData({
        project_id: '',
        type: 'Drawings'
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'Drawings': 'bg-blue-100 text-blue-700',
      'Invoices': 'bg-green-100 text-green-700',
      'As-built': 'bg-purple-100 text-purple-700',
      'Handover': 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Drawings': return <FileText className="w-12 h-12 text-blue-500" />;
      case 'Invoices': return <FileText className="w-12 h-12 text-green-500" />;
      case 'As-built': return <FileText className="w-12 h-12 text-purple-500" />;
      case 'Handover': return <FileText className="w-12 h-12 text-orange-500" />;
      default: return <FileBox className="w-12 h-12 text-gray-500" />;
    }
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const uploadDialog = (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600" data-testid="upload-document-btn">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="upload-document-description">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <p id="upload-document-description" className="text-sm text-slate-500 mb-4">Select a project and document type to upload</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={formData.project_id || ''} onValueChange={(value) => setFormData({ ...formData, project_id: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                    ) : projects.length === 0 ? (
                      <SelectItem value="no-projects" disabled>No projects available</SelectItem>
                    ) : (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>{project.name || `Project ${project.id}`}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Drawings">Drawings</SelectItem>
                    <SelectItem value="Invoices">Invoices</SelectItem>
                    <SelectItem value="As-built">As-built</SelectItem>
                    <SelectItem value="Handover">Handover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File *</Label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-slate-600">Selected: {selectedFile.name}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Upload</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
  );

  return (
    <div className="space-y-6" data-testid="documents-page">
      <div className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Documents</h1>
            <p className="text-slate-600 mt-1">Manage project documents and files</p>
          </div>
          {documents.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => {
              const headers = ['Type', 'File Name', 'Upload Date', 'Uploaded By'];
              const csv = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
              documents.forEach((doc) => {
                const row = [
                  `"${(doc.type || '').replace(/"/g, '""')}"`,
                  `"${(doc.file_name || doc.filename || '').replace(/"/g, '""')}"`,
                  `"${(doc.upload_date || doc.created_at || '').replace(/"/g, '""')}"`,
                  `"${(doc.uploaded_by || '').replace(/"/g, '""')}"`
                ];
                csv.push(row.join(','));
              });
              const csvContent = csv.join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `documents-${projectId || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              toast.success('Documents list exported successfully');
            }}>
              Export Documents List
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="signcopy">Signcopy</TabsTrigger>
          <TabsTrigger value="scope-of-work-list">Scope of work list</TabsTrigger>
          <TabsTrigger value="milestone-breakup-list">Milestone breakup list</TabsTrigger>
          <TabsTrigger value="drawing-material-list">Drawing and material list</TabsTrigger>
        </TabsList>

        <TabsContent value="signcopy" className="mt-6">
          <div className="flex items-center justify-center py-12">
            {uploadDialog}
          </div>
        </TabsContent>

        <TabsContent value="scope-of-work-list" className="mt-6">
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entire Electrical work & Automation work List and scope of M/s Tanti</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  const headers = ['SI No.', 'Description', 'Design intent and Lighting Layout', 'Value Engineering', 'supervision and coordination', 'Supply', 'Installation', 'Programming and commissioning', 'Status', 'Approximate Cost in Lakhs INR', 'Remarks'];
                  const csv = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
                  scopeItems.forEach((item, idx) => {
                    const row = [
                      idx + 1,
                      `"${(item.description || '').replace(/"/g, '""')}"`,
                      `"${(item.design_intent || '').replace(/"/g, '""')}"`,
                      `"${(item.value_engineering || '').replace(/"/g, '""')}"`,
                      `"${(item.supervision_coordination || '').replace(/"/g, '""')}"`,
                      `"${(item.supply || '').replace(/"/g, '""')}"`,
                      `"${(item.installation || '').replace(/"/g, '""')}"`,
                      `"${(item.programming_commissioning || '').replace(/"/g, '""')}"`,
                      `"${(item.status || '').replace(/"/g, '""')}"`,
                      `"${(item.approximate_cost || '').replace(/"/g, '""')}"`,
                      `"${(item.remarks || '').replace(/"/g, '""')}"`
                    ];
                    csv.push(row.join(','));
                  });
                  const csvContent = csv.join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `scope-of-work-${projectId || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  toast.success('Scope of work exported successfully');
                }}>
                  Export to Google Sheets
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <style>{`
                .scope-table {
                  table-layout: auto;
                  border-collapse: separate;
                  border-spacing: 0;
                  width: 100%;
                  font-size: 12px;
                }
                .scope-table th, .scope-table td {
                  border: 1px solid #000;
                  padding: 6px 8px;
                  vertical-align: top;
                  position: relative;
                  word-wrap: break-word;
                  word-break: break-word;
                  overflow: visible !important;
                  white-space: normal;
                }
                .scope-table th {
                  background-color: #fef3c7;
                  font-weight: 600;
                  text-align: center;
                  padding: 8px 6px;
                }
                .scope-table td textarea {
                  width: 100%;
                  min-width: 100%;
                  border: 1px solid transparent !important;
                  padding: 4px 6px;
                  resize: none;
                  overflow: visible !important;
                  font-size: inherit;
                  font-family: inherit;
                  color: #1e293b !important;
                  background: white !important;
                  outline: none !important;
                  box-shadow: none !important;
                  min-height: 24px;
                  height: auto !important;
                  max-height: none !important;
                  box-sizing: border-box;
                  line-height: 1.5;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  word-break: break-word;
                  display: block;
                  margin: 0 !important;
                }
                .scope-table td {
                  padding: 4px 6px !important;
                  min-height: 32px !important;
                  position: relative;
                  background-color: white;
                  word-wrap: break-word;
                  word-break: break-word;
                  overflow: visible !important;
                  white-space: normal;
                }
                .scope-table td input, .scope-table td select {
                  width: 100%;
                  border: none !important;
                  padding: 4px 6px;
                  font-size: inherit;
                  font-family: inherit;
                  background: transparent !important;
                  outline: none !important;
                  box-sizing: border-box;
                  min-height: 24px;
                  height: auto;
                }
                .resize-handle {
                  position: absolute;
                  top: 0;
                  right: 0;
                  width: 4px;
                  height: 100%;
                  cursor: col-resize;
                  background: transparent;
                  z-index: 10;
                }
                .resize-handle:hover {
                  background: #3b82f6;
                }
                .scope-table tbody tr {
                  position: relative;
                }
                .row-resize-area {
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  width: 100%;
                  height: 6px;
                  cursor: row-resize;
                  background: transparent;
                  z-index: 10;
                }
                .row-resize-area:hover {
                  background: rgba(59, 130, 246, 0.3);
                }
                .section-header-row {
                  background-color: #fef3c7 !important;
                  font-weight: 600;
                  text-align: left;
                  padding: 8px 12px;
                }
                .section-header-row td {
                  background-color: #fef3c7 !important;
                  font-weight: 600;
                }
              `}</style>
              <div className="w-full overflow-x-auto">
                <table ref={scopeTableRef} className="scope-table border">
                  <thead>
                    <tr>
                      <th style={{ width: columnWidths[0] || '50px', minWidth: '50px' }}>
                        SI No.
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(0, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[1] || '250px', minWidth: '200px' }}>
                        Description
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(1, e)}></div>
                      </th>
                      <th colSpan={6} style={{ background: '#fef3c7' }}>Scope of works</th>
                      <th style={{ width: columnWidths[8] || '120px', minWidth: '100px' }}>
                        Status
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(8, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[9] || '180px', minWidth: '150px' }}>
                        Approximate Cost in Lakhs INR
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(9, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[10] || '250px', minWidth: '200px' }}>
                        Remarks
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(10, e)}></div>
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th style={{ width: columnWidths[2] || '150px', minWidth: '120px' }}>
                        Design intent and Lighting Layout
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(2, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[3] || '150px', minWidth: '120px' }}>
                        Value Engineering
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(3, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[4] || '150px', minWidth: '120px' }}>
                        supervision and coordination
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(4, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[5] || '150px', minWidth: '120px' }}>
                        Supply
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(5, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[6] || '150px', minWidth: '120px' }}>
                        Installation
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(6, e)}></div>
                      </th>
                      <th style={{ width: columnWidths[7] || '200px', minWidth: '150px' }}>
                        Programming and commissioning
                        <div className="resize-handle" onMouseDown={(e) => handleColumnResize(7, e)}></div>
                      </th>
                      <th></th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopeItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center text-slate-500 py-8">No items yet</td>
                      </tr>
                    ) : (
                      scopeItems.map((item, idx) => {
                        // Add section header for Lightning Automation before item 12 (after item 11)
                        if (item.id === 12) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Lightning Automation
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Essentials before item 15
                        if (item.id === 15) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Essentials
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Third-Party Solution before item 25
                        if (item.id === 25) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Third-Party Solution (Tanti can supply)
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for HT works before item 36
                        if (item.id === 36) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  HT works
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for LT External works before item 42
                        if (item.id === 42) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  LT External works
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Fiber Optic - Communication work before item 47
                        if (item.id === 47) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Fiber Optic - Communication work
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Satellite TV cabling - Communication work before item 48
                        if (item.id === 48) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Satellite TV cabling - Communication work
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Fire and Safety before item 49
                        if (item.id === 49) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Fire and Safety
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Add section header for Other Addons before item 53
                        if (item.id === 53) {
                          return (
                            <React.Fragment key={`fragment-${item.id}`}>
                              <tr className="section-header-row">
                                <td colSpan={11} style={{ background: '#fef3c7', fontWeight: 600, padding: '8px 12px' }}>
                                  Other Addons
                                </td>
                              </tr>
                              <tr 
                                key={item.id} 
                                data-row-index={idx}
                                style={{ 
                                  height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                                  minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                                  position: 'relative'
                                }}
                              >
                                <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                                  {item.id}
                                </td>
                                <td style={{ width: columnWidths[1] || '250px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.description || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'description', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[2] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.design_intent || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'design_intent', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[3] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.value_engineering || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'value_engineering', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[4] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supervision_coordination || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[5] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.supply || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'supply', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[6] || '150px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.installation || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'installation', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[7] || '200px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.programming_commissioning || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[8] || '120px' }}>
                                  {renderStatusSelect(item)}
                                </td>
                                <td style={{ width: columnWidths[9] || '180px' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.approximate_cost || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                </td>
                                <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                                  <textarea 
                                    className="w-full bg-transparent outline-none" 
                                    value={item.remarks || ''} 
                                    onChange={(e) => {
                                      updateScopeItem(item.id, 'remarks', e.target.value);
                                      autoExpandTextarea(e);
                                    }}
                                    onInput={autoExpandTextarea}
                                    rows={1}
                                  />
                                  <div 
                                    className="row-resize-area" 
                                    onMouseDown={(e) => handleRowResize(idx, e)}
                                  ></div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }
                        
                        // Regular row rendering for all other items
                        return (
                          <tr 
                            key={item.id} 
                            data-row-index={idx}
                            style={{ 
                              height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', 
                              minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto',
                              position: 'relative'
                            }}
                          >
                          <td className="text-center" style={{ width: columnWidths[0] || '50px' }}>
                            {item.id}
                          </td>
                          <td style={{ width: columnWidths[1] || '250px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.description || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'description', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[2] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.design_intent || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'design_intent', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[3] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.value_engineering || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'value_engineering', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[4] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.supervision_coordination || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'supervision_coordination', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[5] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.supply || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'supply', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[6] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.installation || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'installation', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[7] || '200px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.programming_commissioning || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'programming_commissioning', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[8] || '120px' }}>
                            {renderStatusSelect(item)}
                          </td>
                          <td style={{ width: columnWidths[9] || '180px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.approximate_cost || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'approximate_cost', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                          <td style={{ width: columnWidths[10] || '250px', position: 'relative' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={item.remarks || ''} 
                              onChange={(e) => {
                                updateScopeItem(item.id, 'remarks', e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                            <div 
                              className="row-resize-area" 
                              onMouseDown={(e) => handleRowResize(idx, e)}
                            ></div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="milestone-breakup-list" className="mt-6">
          <div className="flex items-center justify-center py-12">
            {uploadDialog}
          </div>
        </TabsContent>

        <TabsContent value="drawing-material-list" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-center py-6">
            {uploadDialog}
          </div>

            {/* Only show documents in the drawing-material-list tab */}
      {documents.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedDocuments).map(([type, docs]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-slate-900">{type}</h2>
                <Badge className={getTypeColor(type)}>{docs.length} files</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {docs.map((doc) => {
                  const project = projects.find(p => p.id === doc.project_id);
                  return (
                    <Card key={doc.id} className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`document-card-${doc.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-4">
                            {getTypeIcon(doc.type)}
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{doc.name}</h3>
                          <p className="text-xs text-slate-500 mb-2">{project?.name || 'Unknown'}</p>
                          <Badge className={`${getTypeColor(doc.type)} mb-3`}>{doc.type}</Badge>
                          <div className="text-xs text-slate-500 mb-4">
                            Version {doc.version} • {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-3 h-3 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
