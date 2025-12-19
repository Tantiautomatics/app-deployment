import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DesignDeliverables from '@/pages/Design/DesignDeliverables';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MilestonesGrid from '@/pages/Milestones/MilestonesGrid';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, MapPin, User, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Issues } from '@/pages/Issues/Issues';
import { Documents } from '@/pages/Documents/Documents';
import { Materials } from '@/pages/Materials/Materials';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ProjectWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [scopeItems, setScopeItems] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [isResizing, setIsResizing] = useState(null);
  const [isResizingRow, setIsResizingRow] = useState(null);
  const fileInputRef = React.useRef(null);
  const tableRef = React.useRef(null);
  const saveTimeoutRef = React.useRef(null);
  const isInitialMount = React.useRef(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (id) {
      // CRITICAL: Clear all state when project ID changes to prevent data leakage
      setScopeItems([]);
      setMilestones([]);
      setProject(null);
      setActivityLogs([]);
      setColumnWidths({});
      setRowHeights({});
      setLoading(true);
      isInitialMount.current = true;
      
      // Load saved column widths and row heights for THIS project
      const layoutKey = `scope-layout-${id}`;
      const savedLayout = localStorage.getItem(layoutKey);
      if (savedLayout) {
        try {
          const layout = JSON.parse(savedLayout);
          if (layout.columnWidths && Object.keys(layout.columnWidths).length > 0) {
            // Convert string keys to numbers if needed
            const normalizedColumnWidths = {};
            Object.keys(layout.columnWidths).forEach(key => {
              normalizedColumnWidths[parseInt(key)] = layout.columnWidths[key];
            });
            setColumnWidths(normalizedColumnWidths);
          }
          if (layout.rowHeights && Object.keys(layout.rowHeights).length > 0) {
            // Convert string keys to numbers if needed
            const normalizedRowHeights = {};
            Object.keys(layout.rowHeights).forEach(key => {
              normalizedRowHeights[parseInt(key)] = layout.rowHeights[key];
            });
            setRowHeights(normalizedRowHeights);
          }
        } catch (e) {
          console.error('Failed to load layout:', e);
        }
      }
      fetchProjectData();
    }
  }, [id]);

  // Listen for milestone progress updates and refresh project data
  useEffect(() => {
    const handleMilestoneProgressUpdate = () => {
      if (id) {
        // Refresh project data to get updated progress
        fetchProjectData();
      }
    };
    
    window.addEventListener('milestoneProgressUpdated', handleMilestoneProgressUpdate);
    return () => {
      window.removeEventListener('milestoneProgressUpdated', handleMilestoneProgressUpdate);
    };
  }, [id]);

  // Save layout to localStorage - save immediately when sizes change
  useEffect(() => {
    if (id && (Object.keys(columnWidths).length > 0 || Object.keys(rowHeights).length > 0)) {
      const layoutKey = `scope-layout-${id}`;
      try {
        const existingLayout = JSON.parse(localStorage.getItem(layoutKey) || '{}');
        const layout = {
          columnWidths: Object.keys(columnWidths).length > 0 ? columnWidths : (existingLayout.columnWidths || {}),
          rowHeights: Object.keys(rowHeights).length > 0 ? rowHeights : (existingLayout.rowHeights || {})
        };
        localStorage.setItem(layoutKey, JSON.stringify(layout));
      } catch (e) {
        console.error('Failed to save layout:', e);
      }
    }
  }, [columnWidths, rowHeights, id]);

  // Apply column widths to DOM elements
  useEffect(() => {
    if (tableRef.current && Object.keys(columnWidths).length > 0) {
      // Use setTimeout to ensure table is fully rendered
      setTimeout(() => {
        const table = tableRef.current;
        if (!table) return;
        
        // Apply to headers - use data-column-index attribute
        const headers = table.querySelectorAll('thead th[data-column-index]');
        headers.forEach((th) => {
          const colIndex = parseInt(th.getAttribute('data-column-index'));
          if (!isNaN(colIndex) && columnWidths[colIndex]) {
            th.style.width = `${columnWidths[colIndex]}px`;
            th.style.minWidth = `${columnWidths[colIndex]}px`;
          }
        });
        
        // Apply to cells - use column index from headers
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          Object.keys(columnWidths).forEach(colIndex => {
            const colIndexNum = parseInt(colIndex);
            if (!isNaN(colIndexNum)) {
              const cell = row.children[colIndexNum];
              if (cell && columnWidths[colIndexNum]) {
                cell.style.width = `${columnWidths[colIndexNum]}px`;
                cell.style.minWidth = `${columnWidths[colIndexNum]}px`;
              }
            }
          });
        });
      }, 0);
    }
  }, [columnWidths, scopeItems]);

  // Apply row heights after scopeItems are loaded
  useEffect(() => {
    if (tableRef.current && scopeItems && scopeItems.length > 0 && Object.keys(rowHeights).length > 0) {
      // Use requestAnimationFrame and setTimeout to ensure table is fully rendered
      const applyHeights = () => {
        const table = tableRef.current;
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr[data-row-index]');
        let appliedCount = 0;
        
        rows.forEach((row) => {
          // Get the row index from the data attribute (matches the idx used when saving)
          const rowIndex = parseInt(row.getAttribute('data-row-index'));
          if (!isNaN(rowIndex)) {
            const savedHeight = rowHeights[rowIndex];
            if (savedHeight && savedHeight > 0) {
              row.style.height = `${savedHeight}px`;
              row.style.minHeight = `${savedHeight}px`;
              row.style.maxHeight = 'none';
              // Force reflow to ensure height is applied
              row.offsetHeight;
              appliedCount++;
            }
          }
        });
        
        // If we didn't apply any heights, try again after a delay
        if (appliedCount === 0 && Object.keys(rowHeights).length > 0) {
          setTimeout(applyHeights, 200);
        }
      };
      
      // Try multiple times to ensure table is fully rendered
      requestAnimationFrame(() => {
        setTimeout(applyHeights, 50);
        setTimeout(applyHeights, 200);
        setTimeout(applyHeights, 400);
        setTimeout(applyHeights, 600);
      });
    }
  }, [scopeItems, rowHeights]);

  // Expand all textareas on load to show complete text
  useEffect(() => {
    if (tableRef.current) {
      const table = tableRef.current;
      const textareas = table.querySelectorAll('tbody textarea');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
  }, [scopeItems]);

  // Auto-save scope items to backend and localStorage
  // MUST be before any early returns to follow Rules of Hooks
  useEffect(() => {
    // Skip on initial mount to prevent hooks order issues
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Don't save if no data or no project ID
    if (!id || scopeItems.length === 0) {
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save by 500ms - wait for user to stop typing
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Save to localStorage as backup
        const localStorageKey = `scope-items-${id}`;
        localStorage.setItem(localStorageKey, JSON.stringify(scopeItems));
        
        // Save to backend - update each item that has an id
        const savePromises = scopeItems
          .filter(item => item.id) // Only save items that have an id (already exist in backend)
          .map(item => {
            // Only send fields that exist in the backend model
            return api.updateScopeItem(item.id, {
              description: item.description,
              type: item.type,
              status: item.status,
              progress: item.progress,
              remarks: item.remarks || null,
              project_id: parseInt(id),
              milestone_id: item.milestone_id || null,
              sl_no: item.sl_no || null
            }).catch(err => {
              console.error(`Failed to save scope item ${item.id}:`, err);
              // Don't throw - continue saving other items
            });
          });
        
        await Promise.all(savePromises);
        console.log('✅ Scope items auto-saved');
      } catch (e) {
        console.error('Failed to auto-save scope items:', e);
      }
    }, 500);
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [scopeItems, id]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, milestonesRes, scopeRes, logsRes] = await Promise.all([
        api.getProject(id),
        api.getMilestones(id),
        api.getScopeItems(id),
        api.getActivityLogs(id)
      ]);
      
      setProject(projectRes.data);
      setMilestones(milestonesRes.data);
      const incoming = Array.isArray(scopeRes.data) ? scopeRes.data : [];
      
      // Try to load from localStorage as backup/override
      const localStorageKey = `scope-items-${id}`;
      const savedItems = localStorage.getItem(localStorageKey);
      let useSavedItems = false;
      if (savedItems) {
        try {
          const parsedItems = JSON.parse(savedItems);
          // Merge: use saved items if they exist, otherwise use incoming from API
          if (parsedItems.length > 0) {
            setScopeItems(parsedItems);
            useSavedItems = true;
          }
        } catch (e) {
          console.error('Failed to load saved scope items:', e);
        }
      }
      
      // If we used saved items, still need to set loading to false but continue
      if (useSavedItems) {
        setLoading(false);
        // Don't return early - continue to set other state
      }
      
      // Milestone 5 replacement data
      const milestone5Entries = [
        { description: 'RMU, Meter Cubicle,', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Transformer,', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'LT Kiosk', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'HT cable laying from BESCOM tapping point to RMU', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'HT cable laying from RMU to Mtere cubicle', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'HT cable laying from Meter cubicle to Primary side of Transformer', type: 'HT Works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'LT cable laying from Secondary side of Transformer to LT Kiosk', type: 'LT External works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'LT cable laying from LT Kiosk to LT Main panel', type: 'LT External works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'LT cable laying from LT Main panel to Sub panels', type: 'LT External works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'LT cable laying from Sub panels to DB\'s', type: 'LT External works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Main LT panel and Sub panels', type: 'LT External works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Earthing pit works for Panels, lifts, and any other third party', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Lighting protection system', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'DG', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Solar panels', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Servo Voltage Stabilizer', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'UPS', type: 'Addons', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Meter Board and Electrical Panels', type: 'Electrical works', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Gate Motor for main gate. Shutter Motor for garage', type: 'Third Party Solutions', milestone_name: 'Ht & Lt External Works', milestone_number: 'Milestone 5', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // Milestone 6 entries
      const milestone6Entries = [
        { description: 'Fronted Components', type: 'Lightning Automation', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Electrical switches International range', type: 'Electrical works', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Electrical Switches Indian Range', type: 'Electrical works', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Earthing works (Convensional/ Copper rods with Chemical Earthing)', type: 'Electrical works', milestone_name: 'Infrastruture', milestone_number: 'Milestone 6', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // Milestone 7 entries
      const milestone7Entries = [
        { description: 'Water Management solutions', type: 'Third Party Solutions', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'CCTV Basic', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'CCTV AI Based', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'VDP villa / Multi tenant / Lock Inbuilt', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Communication wiring and passive components', type: 'Essential works', milestone_name: 'DB Dressing, Backend & Passive Components', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Networking Active', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'WiFi', type: 'Essential works', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Digital Locks stand alone / Access controled based', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Security System Basic', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Security system Advanced (Gas leakage, smoke detectors, water leakage detectors, motion cams)', type: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Epbax/Ipbax / intercomm System', type: 'Third Party Solutions', milestone_name: 'Essentials', milestone_number: 'Milestone 7', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // Milestone 8 & 9 entries
      const milestone8and9Entries = [
        { description: 'Curtain Motor/Blinds for Windows', type: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Zonal Audio', type: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Home theater', type: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Light Fixtures', type: 'Electrical works', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // Milestone 10 entries
      const milestone10Entries = [
        { description: 'Visualization / Mobile Control', type: 'Lighthing Automation', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'HVAC Control', type: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Any Socket on Schedule or Timer control', type: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Heat Pumb On-Off control based on time', type: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Voice control with Alexa or Siri', type: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Commissioning, programming, handover and 1 year service', type: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // Additional Systems (NA milestone)
      const additionalSystemsEntries = [
        { description: 'Installation of TV antennas', type: 'Communication work', milestone_name: 'Wiring', milestone_number: 'NA', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Fire alarm system', type: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'PA system', type: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', tentative_date: '', status: 'Yet to be Started', progress: 0 },
        { description: 'Emergency exit system', type: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', tentative_date: '', status: 'Yet to be Started', progress: 0 }
      ];
      
      // If no scope items yet, prefill with seed rows matching the shared sheet
      if (incoming.length === 0) {
        const seed = [
          { description: 'Electrical & Automation Design, Supervision & Coordination', type: 'Electrical works', milestone_name: 'Entry Point', milestone_number: 'Milestone 0', tentative_date: '', status: 'On Going', progress: 0 },
          { description: 'Electrical Labour contract', type: 'Electrical works', milestone_name: 'Third Party', milestone_number: 'Milestone 0', tentative_date: '', status: 'On Going', progress: 0 },
          { description: 'Conduits accessories,', type: 'Electrical works', milestone_name: 'Conduiting', milestone_number: 'Milestone 1', tentative_date: '', status: 'Completed', progress: 100 },
          { description: 'wall boxes and Drop Boxes', type: 'Electrical works', milestone_name: 'wall chipping', milestone_number: 'Milestone 2', tentative_date: '', status: 'On Going', progress: 0 },
          { description: 'Laying of fiber optics cable in the communication shaft', type: 'Communication work', milestone_name: 'Wiring', milestone_number: 'Milestone 3', tentative_date: '', status: 'Yet to be Started', progress: 0 },
          { description: 'Internal Wiring & Cables', type: 'Electrical works', milestone_name: 'Wiring', milestone_number: 'Milestone 3', tentative_date: '', status: 'Yet to be Started', progress: 0 },
          { description: 'DBs, MCBs and Protection devices including custom DBs for automation', type: 'Electrical works', milestone_name: 'DB Dressing, Backend & Passive Components', milestone_number: 'Milestone 4', tentative_date: '', status: 'Yet to be Started', progress: 0 },
          { description: 'Backend Components', type: 'Lightning Automation', milestone_name: 'DB Dressing, Backend & Passive Components', milestone_number: 'Milestone 4', tentative_date: '', status: 'Yet to be Started', progress: 0 },
          { description: 'Networking Passive', type: 'Essential works', milestone_name: 'DB Dressing, Backend & Passive Components', milestone_number: 'Milestone 4', tentative_date: '', status: 'Yet to be Started', progress: 0 },
          ...milestone5Entries,
          ...milestone6Entries,
          ...milestone7Entries,
          ...milestone8and9Entries,
          ...milestone10Entries,
          ...additionalSystemsEntries
        ];
        setScopeItems(seed);
      } else {
        // Replace Milestone 5, 6, 7, 8 & 9, 10, and NA entries in existing data
        const filtered = incoming.filter(item => {
          const milestoneNum = item.milestone_number || item.milestone || '';
          const milestoneStr = milestoneNum.toString();
          return milestoneStr !== 'Milestone 5' && 
                 milestoneStr !== 'Milestone 6' && 
                 milestoneStr !== 'Milestone 7' && 
                 milestoneStr !== 'Milestone 8 and 9' && 
                 milestoneStr !== 'Milestone 10' && 
                 milestoneStr !== 'NA';
        });
        setScopeItems([...filtered, ...milestone5Entries, ...milestone6Entries, ...milestone7Entries, ...milestone8and9Entries, ...milestone10Entries, ...additionalSystemsEntries]);
      }
      setActivityLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? '';
      });
      rows.push(row);
    }
    return rows;
  };

  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || '';
        const parsed = parseCsvText(text);
        // Expected header names from the sheet
        // N°, Description, Type of work, Milestone Name, Milestone Number, Tentative Date, Status
        const mapped = parsed.map((r) => ({
          description: r['Description'] || r['description'] || '',
          type: r['Type of work'] || r['Type'] || '',
          milestone_name: r['Milestone Name'] || r['Milestone'] || '',
          milestone_number: r['Milestone Number'] || r['Milestone No'] || r['Milestone no'] || '',
          tentative_date: r['Tentative Date'] || r['Tentative date'] || '',
          status: r['Status'] || '',
          progress: r['Percentage of Work'] ? parseFloat(r['Percentage of Work']) : 0
        }));
        setScopeItems((prev) => [...prev, ...mapped]);
        toast.success('Scope items imported');
      } catch (err) {
        console.error(err);
        toast.error('Failed to import CSV');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="workspace-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12" data-testid="project-not-found">
        <h2 className="text-2xl font-bold text-slate-900">Project not found</h2>
        <Button onClick={() => navigate('/projects')} className="mt-4">Back to Projects</Button>
      </div>
    );
  }

  // Build scope rows with section separators like the provided sheet
  const buildScopeRows = () => {
    if (!Array.isArray(scopeItems) || scopeItems.length === 0) return [];
    const rows = [];
    let lastMilestoneKey = null;
    let runningIndex = 1;

    const toMilestoneKey = (it) => {
      // Prefer explicit milestone number if available, else fallback to name/value
      return (it.milestone_number ?? it.milestone ?? it.milestone_name ?? '').toString();
    };

    scopeItems.forEach((it, srcIndex) => {
      const key = toMilestoneKey(it);
      if (key && key !== lastMilestoneKey) {
        const titleName = (it.milestone_name || '').toString();
        const sectionTitle = titleName
          ? `Milestone ${key} - ${titleName}`
          : `Milestone ${key}`;
        rows.push({ type: 'section', title: sectionTitle });
        lastMilestoneKey = key;
      }
      rows.push({ type: 'item', item: it, srcIndex, index: runningIndex++ });
    });

    return rows;
  };

  const updateScopeItem = (srcIndex, field, value) => {
    setScopeItems((prev) => {
      const updated = prev.map((it, i) => (i === srcIndex ? { ...it, [field]: value } : it));
      return updated;
    });
  };

  // Column resize handler - Google Sheets style
  const handleColumnResize = (e, columnIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const handle = e.currentTarget;
    const th = handle.closest('th');
    if (!th) return;
    
    setIsResizing(columnIndex);
    th.classList.add('resizing');
    const startX = e.clientX || e.pageX;
    const startWidth = th.offsetWidth || parseInt(getComputedStyle(th).width) || 150;
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentX = moveEvent.clientX || moveEvent.pageX;
      const diff = currentX - startX;
      const newWidth = Math.max(20, startWidth + diff);
      
      // Apply width directly to the th element for immediate visual feedback
      th.style.width = `${newWidth}px`;
      th.style.minWidth = `${newWidth}px`;
      
      // Update all td elements in this column
      const table = th.closest('table');
      if (table) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cell = row.children[columnIndex];
          if (cell) {
            cell.style.width = `${newWidth}px`;
            cell.style.minWidth = `${newWidth}px`;
          }
        });
      }
      
      // Save directly to localStorage immediately
      setColumnWidths(prev => {
        const updated = { ...prev, [columnIndex]: newWidth };
        // Save immediately with current state
        if (id) {
          try {
            const layoutKey = `scope-layout-${id}`;
            const existingLayout = JSON.parse(localStorage.getItem(layoutKey) || '{}');
            // Preserve existing rowHeights
            const savedRowHeights = existingLayout.rowHeights || {};
            // Merge with existing columnWidths to preserve all saved widths
            const mergedColumnWidths = { ...existingLayout.columnWidths, ...updated };
            existingLayout.columnWidths = mergedColumnWidths;
            existingLayout.rowHeights = savedRowHeights;
            // Save synchronously
            localStorage.setItem(layoutKey, JSON.stringify(existingLayout));
          } catch (e) {
            console.error('Failed to save column width:', e);
          }
        }
        return updated;
      });
    };

    const handleMouseUp = (upEvent) => {
      upEvent.preventDefault();
      setIsResizing(null);
      th.classList.remove('resizing');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Final save on mouse up to ensure persistence
      if (id) {
        const layoutKey = `scope-layout-${id}`;
        const currentWidth = th.offsetWidth || parseInt(getComputedStyle(th).width) || 150;
        setColumnWidths(prev => {
          const updated = { ...prev, [columnIndex]: currentWidth };
          try {
            const existingLayout = JSON.parse(localStorage.getItem(layoutKey) || '{}');
            // Preserve existing rowHeights
            const savedRowHeights = existingLayout.rowHeights || {};
            // Merge with existing columnWidths to preserve all saved widths
            const mergedColumnWidths = { ...existingLayout.columnWidths, ...updated };
            existingLayout.columnWidths = mergedColumnWidths;
            existingLayout.rowHeights = savedRowHeights;
            // Save synchronously
            localStorage.setItem(layoutKey, JSON.stringify(existingLayout));
          } catch (e) {
            console.error('Failed to save column width on mouse up:', e);
          }
          return updated;
        });
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
  };

  // Helper function for resize handle
  const createResizeHandler = (columnIndex) => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleColumnResize(e, columnIndex);
    };
  };

  // Row resize handler - Google Sheets style
  const handleRowResize = (e, rowIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const handle = e.currentTarget;
    const tr = handle.closest('tr');
    if (!tr) return;
    
    setIsResizingRow(rowIndex);
    tr.classList.add('resizing-row');
    const startY = e.clientY || e.pageY;
    const startHeight = tr.offsetHeight || parseInt(getComputedStyle(tr).height) || (rowHeights[rowIndex] || 32);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentY = moveEvent.clientY || moveEvent.pageY;
      const diff = currentY - startY;
      const newHeight = Math.max(20, startHeight + diff);
      
      // Apply height directly to the tr element for immediate visual feedback
      tr.style.height = `${newHeight}px`;
      tr.style.minHeight = `${newHeight}px`;
      
      // Save directly to localStorage immediately
      setRowHeights(prev => {
        const updated = { ...prev, [rowIndex]: newHeight };
        // Save immediately with current state - use synchronous save
        if (id) {
          try {
            const layoutKey = `scope-layout-${id}`;
            const existingLayout = JSON.parse(localStorage.getItem(layoutKey) || '{}');
            // Preserve existing columnWidths
            const savedColumnWidths = existingLayout.columnWidths || {};
            // Merge with existing rowHeights to preserve all saved heights
            const mergedRowHeights = { ...existingLayout.rowHeights, ...updated };
            existingLayout.rowHeights = mergedRowHeights;
            existingLayout.columnWidths = savedColumnWidths;
            // Save synchronously
            localStorage.setItem(layoutKey, JSON.stringify(existingLayout));
          } catch (e) {
            console.error('Failed to save row height:', e);
          }
        }
        return updated;
      });
    };

    const handleMouseUp = (upEvent) => {
      upEvent.preventDefault();
      setIsResizingRow(null);
      tr.classList.remove('resizing-row');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Final save on mouse up to ensure persistence
      if (id) {
        const layoutKey = `scope-layout-${id}`;
        const currentHeight = tr.offsetHeight || parseInt(getComputedStyle(tr).height) || (rowHeights[rowIndex] || 32);
        setRowHeights(prev => {
          const updated = { ...prev, [rowIndex]: currentHeight };
          try {
            const existingLayout = JSON.parse(localStorage.getItem(layoutKey) || '{}');
            // Preserve existing columnWidths
            const savedColumnWidths = existingLayout.columnWidths || {};
            // Merge with existing rowHeights to preserve all saved heights
            const mergedRowHeights = { ...existingLayout.rowHeights, ...updated };
            existingLayout.rowHeights = mergedRowHeights;
            existingLayout.columnWidths = savedColumnWidths;
            localStorage.setItem(layoutKey, JSON.stringify(existingLayout));
          } catch (e) {
            console.error('Failed to save row height on mouse up:', e);
          }
          return updated;
        });
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
  };

  // Auto-expand textarea
  const autoExpandTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planning': 'bg-gray-100 text-gray-700',
      'Active': 'bg-green-100 text-green-700',
      'On-Hold': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-blue-100 text-blue-700',
      'At-Risk': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusStyle = (status) => {
    const styles = {
      'Planning': { backgroundColor: '#f3f4f6', color: '#374151' },
      'Active': { backgroundColor: '#dcfce7', color: '#15803d' },
      'On-Hold': { backgroundColor: '#fef9c3', color: '#a16207' },
      'Completed': { backgroundColor: '#dbeafe', color: '#1e40af' },
      'At-Risk': { backgroundColor: '#fee2e2', color: '#b91c1c' }
    };
    return styles[status] || { backgroundColor: '#f3f4f6', color: '#374151' };
  };

  const handleDeleteProject = async () => {
    try {
      await api.deleteProject(id);
      toast.success(`Project "${project.name}" deleted successfully`);
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project. Please try again.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!project || !id) {
      toast.error('Project not loaded');
      return;
    }
    
    // Optimistically update UI
    const previousStatus = project.status;
    setProject({ ...project, status: newStatus });
    
    try {
      const response = await api.updateProject(id, { status: newStatus });
      // Update with response data to ensure consistency
      if (response.data) {
        setProject(response.data);
      }
      toast.success('Project status updated successfully');
    } catch (error) {
      console.error('Failed to update project status:', error);
      // Revert to previous status on error
      setProject({ ...project, status: previousStatus });
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update project status';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6" data-testid="project-workspace">
      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {project.name}
              </h1>
              <div className="shrink-0 flex items-center gap-2">
                <Select value={project.status} onValueChange={handleStatusChange}>
                  <SelectTrigger 
                    className="inline-flex items-center justify-between w-auto min-w-[130px] max-w-[150px] px-3 py-1 border-0 font-semibold rounded-full h-8 text-sm shadow-sm" 
                    style={getStatusStyle(project.status)}
                  >
                    <SelectValue className="text-sm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On-Hold">Hold</SelectItem>
                    <SelectItem value="At-Risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 px-3"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-slate-600">{project.client}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Project Value</p>
              <p className="text-lg font-bold">₹{project.value?.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Progress</p>
              <p className="text-lg font-bold">{project.progress}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Region</p>
              <p className="text-lg font-bold">{project.region}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Calendar className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Type</p>
              <p className="text-lg font-bold">{project.type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full" data-testid="project-tabs">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="design">Design Deliverables</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Project Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Completion</span>
                    <span className="text-sm font-bold">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-slate-600">Start Date</p>
                    <p className="text-sm font-medium">{new Date(project.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">End Date</p>
                    <p className="text-sm font-medium">{new Date(project.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Milestones Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Milestones</CardTitle>
                  <Button size="sm" onClick={() => navigate(`/projects/${id}/milestones`)}>View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.slice(0, 5).map((milestone) => (
                      <div key={milestone.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{milestone.name}</p>
                          <p className="text-xs text-slate-500">{milestone.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{milestone.progress}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No milestones yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="-mx-6">
                <Tabs defaultValue="secondary-sales" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="secondary-sales">Secondary Sales Milestone Tracker</TabsTrigger>
                    <TabsTrigger value="site-execution">Site Execution Milestone Tracker</TabsTrigger>
                  </TabsList>
                  <TabsContent value="secondary-sales" className="mt-0">
                    <MilestonesGrid sheetType="secondary-sales" projectId={project?.id} projectName={project?.name} />
                  </TabsContent>
                  <TabsContent value="site-execution" className="mt-0">
                    <MilestonesGrid sheetType="site-execution" projectId={project?.id} projectName={project?.name} />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scope" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scope Items</CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCsv}
                    className="hidden"
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Import CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const headers = ['SL NO.', 'Description', 'Type of work', 'Milestone Name', 'Milestone Number', 'Tentative Date', 'Status', 'Percentage of Work', 'Quotes with Order Codes', 'Vendor Contact Details', 'Drawings', 'Material list with order codes', 'Supporting Documents (Load Calculation Sheets)', 'Handing over Documents', 'Proforma Invoice', 'Material Delivery with Invoice', 'Payment Collection', 'Material in Stock', 'PO Placed', 'Tentative Delivery Date'];
                    const csv = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
                    scopeItems.forEach((item, idx) => {
                      const row = [
                        idx + 1,
                        `"${(item.description || '').replace(/"/g, '""')}"`,
                        `"${(item.type || '').replace(/"/g, '""')}"`,
                        `"${(item.milestone_name || '').replace(/"/g, '""')}"`,
                        `"${(item.milestone_number || '').replace(/"/g, '""')}"`,
                        `"${(item.tentative_date || '').replace(/"/g, '""')}"`,
                        `"${(item.status || '').replace(/"/g, '""')}"`,
                        `"${(item.progress || item.percentage_of_work || '').toString().replace(/"/g, '""')}"`,
                        `"${(item.quotes_with_order_codes || '').replace(/"/g, '""')}"`,
                        `"${(item.vendor_co_detail || '').replace(/"/g, '""')}"`,
                        `"${(item.drawings || '').replace(/"/g, '""')}"`,
                        `"${(item.material_list_with_order_codes || '').replace(/"/g, '""')}"`,
                        `"${(item.supporting_documents || '').replace(/"/g, '""')}"`,
                        `"${(item.handing_over_documents || '').replace(/"/g, '""')}"`,
                        `"${(item.proforma_invoice || '').replace(/"/g, '""')}"`,
                        `"${(item.material_delivery_with_invoice || '').replace(/"/g, '""')}"`,
                        `"${(item.payment_collection || '').replace(/"/g, '""')}"`,
                        `"${(item.material_in_stock || '').replace(/"/g, '""')}"`,
                        `"${(item.po_placed || '').replace(/"/g, '""')}"`,
                        `"${(item.tentative_delivery_date || '').replace(/"/g, '""')}"`
                      ];
                      csv.push(row.join(','));
                    });
                    const csvContent = csv.join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `scope-items-${project?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    toast.success('Scope items exported successfully');
                  }}>
                    Export to Google Sheets
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <style>{`
                .resize-handle {
                  position: absolute;
                  right: -4px;
                  top: 0;
                  height: 100%;
                  width: 8px;
                  cursor: col-resize;
                  background: transparent;
                  z-index: 100;
                  user-select: none;
                  pointer-events: auto;
                  touch-action: none;
                  display: block !important;
                }
                .resize-handle:hover {
                  background: #4285f4;
                  opacity: 0.7;
                  width: 8px;
                }
                .resize-handle:active {
                  background: #1a73e8;
                  opacity: 1;
                  width: 8px;
                }
                table th:hover .resize-handle {
                  background: #4285f4;
                  opacity: 0.5;
                  width: 8px;
                }
                table th {
                  position: relative;
                  user-select: none;
                }
                table th .resize-handle {
                  display: block;
                }
                table th {
                  border-right: 2px solid transparent;
                }
                table th.resizing {
                  border-right: 2px solid #1a73e8;
                }
                table tr.resizing-row {
                  border-bottom: 2px solid #1a73e8;
                }
                table td {
                  border-right: 1px solid #e2e8f0;
                }
                table th:not(:last-child) {
                  border-right: 2px solid #e2e8f0;
                }
                .row-resize-handle {
                  position: absolute;
                  bottom: -4px;
                  left: 0;
                  width: 100%;
                  height: 8px;
                  cursor: row-resize;
                  background: transparent;
                  z-index: 100;
                  user-select: none;
                  pointer-events: auto;
                  touch-action: none;
                  display: block !important;
                }
                .row-resize-handle:hover {
                  background: #4285f4;
                  opacity: 0.7;
                  height: 8px;
                }
                .row-resize-handle:active {
                  background: #1a73e8;
                  opacity: 1;
                  height: 8px;
                }
                table tr:hover .row-resize-handle {
                  background: #4285f4;
                  opacity: 0.5;
                  height: 8px;
                }
                table th {
                  position: relative;
                }
                table tr {
                  position: relative;
                }
                table td textarea {
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  width: 100% !important;
                  min-width: 100% !important;
                  border: 1px solid transparent !important;
                  padding: 4px 6px;
                  resize: none;
                  overflow: visible !important;
                  overflow-x: visible !important;
                  overflow-y: visible !important;
                  font-size: inherit;
                  font-family: inherit;
                  color: #1e293b !important;
                  background: white !important;
                  outline: none !important;
                  box-shadow: none !important;
                  min-height: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  box-sizing: border-box;
                  line-height: 1.4;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  word-break: break-word;
                  display: block;
                  margin: 0 !important;
                }
                table td textarea::-webkit-scrollbar {
                  display: none !important;
                  width: 0 !important;
                  height: 0 !important;
                }
                table td textarea:focus {
                  border: 1px solid transparent !important;
                  outline: none !important;
                  box-shadow: none !important;
                }
                table td input, table td select {
                  width: 100%;
                  border: none !important;
                  border-width: 0 !important;
                  padding: 4px 6px;
                  font-size: inherit;
                  font-family: inherit;
                  background: transparent !important;
                  outline: none !important;
                  box-shadow: none !important;
                  box-sizing: border-box;
                }
                table td input:focus, table td select:focus {
                  border: none !important;
                  outline: none !important;
                  box-shadow: none !important;
                }
                table th, table td {
                  overflow: visible !important;
                  overflow-x: visible !important;
                  overflow-y: visible !important;
                  white-space: normal;
                  word-wrap: break-word;
                  word-break: break-word;
                  position: relative;
                }
                table th {
                  padding: 6px 8px;
                }
                table td {
                  padding: 0 !important;
                  vertical-align: top;
                  height: auto !important;
                  min-height: 32px !important;
                  max-height: none !important;
                  position: relative;
                }
                table td:has(textarea) {
                  padding: 0 !important;
                  min-height: 32px !important;
                }
                table td.px-2:has(textarea),
                table td.py-2:has(textarea) {
                  padding: 0 !important;
                }
                table {
                  table-layout: auto;
                  border-collapse: separate;
                  border-spacing: 0;
                }
              `}</style>
              <div className="w-full overflow-x-auto">
                <table ref={tableRef} className="text-xs border" style={{ tableLayout: 'auto', width: '100%' }}>
                  <thead>
                    {/* Group headers row to mirror sheet sections */}
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="px-2 py-2 border" colSpan={8}></th>
                      <th className="px-2 py-2 border text-center" colSpan={2}>Presales team Deliverables</th>
                      <th className="px-2 py-2 border text-center" colSpan={4}>Design team Deliverables</th>
                      <th className="px-2 py-2 border text-center" colSpan={3}>Sales team Deliverables</th>
                      <th className="px-2 py-2 border text-center" colSpan={3}>Purchase team Deliverables</th>
                    </tr>
                    {/* Column headers row */}
                    <tr className="bg-slate-50 text-slate-700">
                      <th data-column-index={0} className="px-2 py-2 border relative" style={{ width: columnWidths[0] || '50px', minWidth: '50px' }}>
                        SL NO.
                        <div className="resize-handle" onMouseDown={createResizeHandler(0)}></div>
                      </th>
                      <th data-column-index={1} className="px-2 py-2 border text-left relative" style={{ width: columnWidths[1] || '300px', minWidth: '200px' }}>
                        Description
                        <div className="resize-handle" onMouseDown={createResizeHandler(1)}></div>
                      </th>
                      <th data-column-index={2} className="px-2 py-2 border relative" style={{ width: columnWidths[2] || '160px', minWidth: '120px' }}>
                        <div className="whitespace-pre-line text-center">Type{`\n`}of work</div>
                        <div className="resize-handle" onMouseDown={createResizeHandler(2)}></div>
                      </th>
                      <th data-column-index={3} className="px-2 py-2 border relative" style={{ width: columnWidths[3] || '200px', minWidth: '150px' }}>
                        Milestone Name
                        <div className="resize-handle" onMouseDown={createResizeHandler(3)}></div>
                      </th>
                      <th data-column-index={4} className="px-2 py-2 border relative" style={{ width: columnWidths[4] || '170px', minWidth: '130px' }}>
                        Milestone Number
                        <div className="resize-handle" onMouseDown={createResizeHandler(4)}></div>
                      </th>
                      <th data-column-index={5} className="px-2 py-2 border relative" style={{ width: columnWidths[5] || '130px', minWidth: '100px' }}>
                        Tentative Date
                        <div className="resize-handle" onMouseDown={createResizeHandler(5)}></div>
                      </th>
                      <th data-column-index={6} className="px-2 py-2 border relative" style={{ width: columnWidths[6] || '150px', minWidth: '130px' }}>
                        Status
                        <div className="resize-handle" onMouseDown={createResizeHandler(6)}></div>
                      </th>
                      <th data-column-index={7} className="px-2 py-2 border relative" style={{ width: columnWidths[7] || '140px', minWidth: '100px' }}>
                        Percentage of Work
                        <div className="resize-handle" onMouseDown={createResizeHandler(7)}></div>
                      </th>
                      {/* Presales team Deliverables */}
                      <th data-column-index={8} className="px-2 py-2 border relative" style={{ width: columnWidths[8] || '180px', minWidth: '120px' }}>
                        Quotes with Order Codes
                        <div className="resize-handle" onMouseDown={createResizeHandler(8)}></div>
                      </th>
                      <th data-column-index={9} className="px-2 py-2 border relative" style={{ width: columnWidths[9] || '180px', minWidth: '120px' }}>
                        Vendor Contact Details
                        <div className="resize-handle" onMouseDown={createResizeHandler(9)}></div>
                      </th>
                      {/* Design team Deliverables */}
                      <th data-column-index={10} className="px-2 py-2 border relative" style={{ width: columnWidths[10] || '120px', minWidth: '100px' }}>
                        Drawings
                        <div className="resize-handle" onMouseDown={createResizeHandler(10)}></div>
                      </th>
                      <th data-column-index={11} className="px-2 py-2 border relative" style={{ width: columnWidths[11] || '200px', minWidth: '120px' }}>
                        Material list with order codes
                        <div className="resize-handle" onMouseDown={createResizeHandler(11)}></div>
                      </th>
                      <th data-column-index={12} className="px-2 py-2 border relative" style={{ width: columnWidths[12] || '250px', minWidth: '150px' }}>
                        Supporting Documents (Load Calculation Sheets)
                        <div className="resize-handle" onMouseDown={createResizeHandler(12)}></div>
                      </th>
                      <th data-column-index={13} className="px-2 py-2 border relative" style={{ width: columnWidths[13] || '180px', minWidth: '120px' }}>
                        Handing over Documents
                        <div className="resize-handle" onMouseDown={createResizeHandler(13)}></div>
                      </th>
                      {/* Sales team Deliverables */}
                      <th data-column-index={14} className="px-2 py-2 border relative" style={{ width: columnWidths[14] || '150px', minWidth: '100px' }}>
                        Proforma Invoice
                        <div className="resize-handle" onMouseDown={createResizeHandler(14)}></div>
                      </th>
                      <th data-column-index={15} className="px-2 py-2 border relative" style={{ width: columnWidths[15] || '220px', minWidth: '150px' }}>
                        Material Delivery with Invoice
                        <div className="resize-handle" onMouseDown={createResizeHandler(15)}></div>
                      </th>
                      <th data-column-index={16} className="px-2 py-2 border relative" style={{ width: columnWidths[16] || '150px', minWidth: '100px' }}>
                        Payment Collection
                        <div className="resize-handle" onMouseDown={createResizeHandler(16)}></div>
                      </th>
                      {/* Purchase team Deliverables */}
                      <th data-column-index={17} className="px-2 py-2 border relative" style={{ width: columnWidths[17] || '150px', minWidth: '100px' }}>
                        Material in Stock
                        <div className="resize-handle" onMouseDown={createResizeHandler(17)}></div>
                      </th>
                      <th data-column-index={18} className="px-2 py-2 border relative" style={{ width: columnWidths[18] || '120px', minWidth: '80px' }}>
                        PO Placed
                        <div className="resize-handle" onMouseDown={createResizeHandler(18)}></div>
                      </th>
                      <th data-column-index={19} className="px-2 py-2 border relative" style={{ width: columnWidths[19] || '180px', minWidth: '120px' }}>
                        Tentative Delivery Date
                        <div className="resize-handle" onMouseDown={createResizeHandler(19)}></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!scopeItems || scopeItems.length === 0) ? (
                      <tr>
                        <td colSpan={20} className="text-center text-slate-500 py-8">No scope items yet</td>
                      </tr>
                    ) : (
                      buildScopeRows().map((row, idx) => (
                        row.type === 'section' ? (
                          <tr key={`section-${idx}`} className="bg-orange-100/60">
                            <td className="px-2 py-2 border text-center"></td>
                            <td className="px-2 py-2 border font-semibold uppercase text-[11px]">{row.title}</td>
                            {/* render empty cells to preserve grid */}
                            <td className="px-2 py-2 border" colSpan={18}></td>
                          </tr>
                        ) : (
                          <tr key={row.item.id || `row-${idx}`} data-row-index={idx} className="odd:bg-white even:bg-slate-50 relative" style={{ height: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto', minHeight: rowHeights[idx] ? `${rowHeights[idx]}px` : 'auto' }}>
                            <td className="px-2 py-2 border text-center relative" style={{ width: columnWidths[0] || '50px' }}>
                              {row.index}
                              <div className="row-resize-handle" onMouseDown={(e) => handleRowResize(e, idx)}></div>
                            </td>
                            <td className="px-2 py-2 border" style={{ width: columnWidths[1] || '300px' }}>
                              <textarea 
                                className="w-full bg-transparent outline-none" 
                                value={row.item.description || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'description', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onKeyDown={(e) => {
                                  // Prevent backspace from deleting the row when field is empty
                                  if (e.key === 'Backspace' && e.target.value === '') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[2] || '160px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.type || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'type', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onKeyDown={(e) => {
                                  // Prevent backspace from deleting the row when field is empty
                                  if (e.key === 'Backspace' && e.target.value === '') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[3] || '200px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.milestone_name || row.item.milestone || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'milestone_name', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onKeyDown={(e) => {
                                  // Prevent backspace from deleting the row when field is empty
                                  if (e.key === 'Backspace' && e.target.value === '') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[4] || '170px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.milestone_number || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'milestone_number', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onKeyDown={(e) => {
                                  // Prevent backspace from deleting the row when field is empty
                                  if (e.key === 'Backspace' && e.target.value === '') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[5] || '130px' }}>
                              <input type="date" className="bg-transparent text-center outline-none" value={row.item.tentative_date ? new Date(row.item.tentative_date).toISOString().slice(0,10) : ''} onChange={(e) => updateScopeItem(row.srcIndex, 'tentative_date', e.target.value)} />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[6] || '150px' }}>
                              <select className="bg-transparent outline-none w-full" value={row.item.status || ''} onChange={(e) => updateScopeItem(row.srcIndex, 'status', e.target.value)}>
                                <option value=""></option>
                                <option value="Yet to be Started">Yet to be Started</option>
                                <option value="On Going">On Going</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[7] || '140px' }}>
                              <input type="number" min={0} max={100} className="w-16 bg-transparent text-center outline-none" value={row.item.progress ?? 0} onChange={(e) => updateScopeItem(row.srcIndex, 'progress', Number(e.target.value))} />%
                            </td>
                            {/* Presales */}
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[8] || '180px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.presales_quotes || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'presales_quotes', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[9] || '180px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.presales_vendor_contact || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'presales_vendor_contact', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            {/* Design */}
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[10] || '120px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.design_drawings || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'design_drawings', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[11] || '200px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.design_material_list || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'design_material_list', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[12] || '250px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.design_supporting_docs || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'design_supporting_docs', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[13] || '180px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.design_handover_docs || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'design_handover_docs', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            {/* Sales */}
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[14] || '150px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.sales_proforma || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'sales_proforma', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[15] || '220px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.sales_delivery_invoice || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'sales_delivery_invoice', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[16] || '150px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.sales_payment_collection || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'sales_payment_collection', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            {/* Purchase */}
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[17] || '150px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.purchase_material_in_stock || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'purchase_material_in_stock', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[18] || '120px' }}>
                              <textarea 
                                className="w-full bg-transparent text-center outline-none" 
                                value={row.item.purchase_po_placed || ''} 
                                onChange={(e) => {
                                  updateScopeItem(row.srcIndex, 'purchase_po_placed', e.target.value);
                                  autoExpandTextarea(e);
                                }}
                                onInput={autoExpandTextarea}
                                rows={1}
                              />
                            </td>
                            <td className="px-2 py-2 border text-center" style={{ width: columnWidths[19] || '180px' }}>
                              <input type="date" className="bg-transparent text-center outline-none" value={row.item.delivery_date ? new Date(row.item.delivery_date).toISOString().slice(0,10) : ''} onChange={(e) => updateScopeItem(row.srcIndex, 'delivery_date', e.target.value)} />
                            </td>
                          </tr>
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design-deliverables" className="mt-6">
          <DesignDeliverables key={`design-deliverables-${id}`} projectId={parseInt(id)} />
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          <DesignDeliverables key={`design-${id}`} projectId={parseInt(id)} />
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
          <Materials projectId={parseInt(id)} />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <Issues projectId={parseInt(id)} />
        </TabsContent>

        <TabsContent value="timesheets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Timesheets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-slate-500 py-8">Timesheets feature coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Documents projectId={parseInt(id)} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-600">Total Scope Items</p>
                      <p className="text-2xl font-bold">{scopeItems.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-600">Completed Items</p>
                      <p className="text-2xl font-bold">{scopeItems.filter(s => s.status === 'Completed').length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-600">Overall Progress</p>
                      <p className="text-2xl font-bold">{project.progress}%</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and will permanently delete all project data including scope items, milestones, design deliverables, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
