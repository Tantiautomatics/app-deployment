import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/utils/api';

export default function DesignDeliverables({ projectId: propProjectId }) {
  const { id } = useParams();
  // Always prioritize propProjectId if provided (even if 0)
  // Only fall back to URL param if propProjectId is explicitly undefined/null
  const projectId = propProjectId !== undefined && propProjectId !== null ? propProjectId : (id ? parseInt(id) : null);
  
  // Debug: Log projectId to verify it's correct
  useEffect(() => {
    console.log('DesignDeliverables - Current projectId:', projectId, 'propProjectId:', propProjectId, 'id from URL:', id);
  }, [projectId, propProjectId, id]);
  const [designItems, setDesignItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [milestoneGrouping, setMilestoneGrouping] = useState([]); // Track original milestone grouping
  const [designEngineerOptions, setDesignEngineerOptions] = useState([
    'Design Engineer',
    'Mokshitha',
    'Pavan',
    'Thejashwini',
    'Awez',
    'Likhitha',
    'Meghana',
    'Amrutha',
    'As per Architect',
    'PMC',
    'NA'
  ]);
  const [newEngineerName, setNewEngineerName] = useState('');
  const [showDesignEngineerDropdown, setShowDesignEngineerDropdown] = useState({});
  const [showAddInput, setShowAddInput] = useState(false);
  const [customColumns, setCustomColumns] = useState([]); // Dynamic columns added by user
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, type: '', index: null });
  const tableRef = React.useRef(null);
  const saveTimeoutRef = React.useRef(null);

  useEffect(() => {
    // Clear state when projectId changes to prevent data leakage
    setDesignItems([]);
    setMilestoneGrouping([]);
    setCustomColumns([]);
    setColumnWidths({});
    setRowHeights({});
    setLoading(true);
    
    // Load project-specific data
    fetchData();
    if (projectId) {
      loadLayout();
    }
    loadDesignEngineerOptions();
  }, [projectId]);

  // Debounced auto-save to prevent lag on every keystroke
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Only save if there's data
    if (designItems.length > 0 && milestoneGrouping.length > 0) {
      // Debounce save by 500ms - wait for user to stop typing
      saveTimeoutRef.current = setTimeout(() => {
      try {
        // CRITICAL: Never save without a valid projectId - this prevents data leakage
        if (!projectId || projectId === null || projectId === undefined) {
          console.warn('⚠️ Cannot save design deliverables: projectId is missing');
          return;
        }
        const key = `design-deliverables-${projectId}`;
        console.log('💾 Saving design deliverables - projectId:', projectId, 'key:', key);
        localStorage.setItem(key, JSON.stringify(designItems));
        
        const groupingKey = `design-deliverables-grouping-${projectId}`;
        localStorage.setItem(groupingKey, JSON.stringify(milestoneGrouping));
          
        // Save custom columns
        const columnsKey = `design-deliverables-columns-${projectId}`;
        localStorage.setItem(columnsKey, JSON.stringify(customColumns));
      } catch (e) {
        console.error('Failed to auto-save design deliverables:', e);
      }
      }, 500);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [designItems, milestoneGrouping, customColumns, projectId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.design-engineer-dropdown') && !event.target.closest('button[type="button"]')) {
        setShowDesignEngineerDropdown({});
        setShowAddInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadDesignEngineerOptions = () => {
    const savedOptions = localStorage.getItem('design-engineer-options');
    if (savedOptions) {
      try {
        const options = JSON.parse(savedOptions);
        setDesignEngineerOptions(options);
      } catch (e) {
        console.error('Failed to load design engineer options:', e);
      }
    }
  };

  const saveDesignEngineerOptions = (options) => {
    try {
      localStorage.setItem('design-engineer-options', JSON.stringify(options));
    } catch (e) {
      console.error('Failed to save design engineer options:', e);
    }
  };

  const addDesignEngineer = () => {
    if (newEngineerName.trim() && !designEngineerOptions.includes(newEngineerName.trim())) {
      const updated = [...designEngineerOptions, newEngineerName.trim()];
      setDesignEngineerOptions(updated);
      saveDesignEngineerOptions(updated);
      setNewEngineerName('');
      setShowAddEngineer(false);
      toast.success('Design engineer added');
    }
  };

  const deleteDesignEngineer = (name) => {
    if (name === 'Design Engineer') {
      toast.error('Cannot delete default option');
      return;
    }
    const updated = designEngineerOptions.filter(opt => opt !== name);
    setDesignEngineerOptions(updated);
    saveDesignEngineerOptions(updated);
    toast.success('Design engineer deleted');
  };

  const loadLayout = () => {
    if (projectId) {
      if (!projectId) return; // CRITICAL: Never load without projectId
      const layoutKey = `design-deliverables-layout-${projectId}`;
      const savedLayout = localStorage.getItem(layoutKey);
      if (savedLayout) {
        try {
          const layout = JSON.parse(savedLayout);
          if (layout.columnWidths) {
            const normalizedColumnWidths = {};
            Object.keys(layout.columnWidths).forEach(key => {
              normalizedColumnWidths[parseInt(key)] = layout.columnWidths[key];
            });
            setColumnWidths(normalizedColumnWidths);
          }
          if (layout.rowHeights) {
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
    }
  };

  const saveLayout = () => {
    if (projectId) {
      if (!projectId) return; // CRITICAL: Never save without projectId
      const layoutKey = `design-deliverables-layout-${projectId}`;
      try {
        const layout = {
          columnWidths,
          rowHeights
        };
        localStorage.setItem(layoutKey, JSON.stringify(layout));
      } catch (e) {
        console.error('Failed to save layout:', e);
      }
    }
  };

  useEffect(() => {
    saveLayout();
  }, [columnWidths, rowHeights, projectId]);

  const saveDesignItems = (items) => {
    try {
      // CRITICAL: Never save without a valid projectId - this prevents data leakage
      if (!projectId || projectId === null || projectId === undefined) {
        console.warn('⚠️ Cannot save design deliverables: projectId is missing');
        return;
      }
      const key = `design-deliverables-${projectId}`;
      console.log('💾 saveDesignItems - projectId:', projectId, 'key:', key);
      localStorage.setItem(key, JSON.stringify(items));
      
      // Also save milestone grouping if it exists
      if (milestoneGrouping && milestoneGrouping.length > 0) {
        const groupingKey = `design-deliverables-grouping-${projectId}`;
        localStorage.setItem(groupingKey, JSON.stringify(milestoneGrouping));
      }
    } catch (e) {
      console.error('Failed to save design deliverables:', e);
    }
  };

  const loadDesignItems = () => {
    try {
      // CRITICAL: Never load without a valid projectId - this prevents data leakage
      if (!projectId || projectId === null || projectId === undefined) {
        console.warn('⚠️ Cannot load design deliverables: projectId is missing');
        setDesignItems([]);
        return;
      }
      const key = `design-deliverables-${projectId}`;
      console.log('📂 Loading design deliverables - projectId:', projectId, 'key:', key);
      const saved = localStorage.getItem(key);
      if (saved) {
        const items = JSON.parse(saved);
        
        // Also load milestone grouping
        const groupingKey = `design-deliverables-grouping-${projectId}`;
        const savedGrouping = localStorage.getItem(groupingKey);
        if (savedGrouping) {
          try {
            const grouping = JSON.parse(savedGrouping);
            setMilestoneGrouping(grouping);
          } catch (e) {
            console.error('Failed to load milestone grouping:', e);
            // Initialize grouping if loading fails
            initializeMilestoneGrouping(items);
          }
        } else {
          // Initialize grouping if not saved
          initializeMilestoneGrouping(items);
        }
        
        return items;
      }
    } catch (e) {
      console.error('Failed to load design deliverables:', e);
    }
    return null;
  };

  const initializeMilestoneGrouping = (items) => {
    const grouping = [];
    let currentGroupIndex = -1;
    let lastMilestone = null;
    
    items.forEach((item, idx) => {
      const milestone = item.milestone_number || '';
      const isGroupStart = milestone && milestone !== lastMilestone;
      
      if (isGroupStart) {
        currentGroupIndex++;
      }
      
      grouping.push({
        groupIndex: currentGroupIndex,
        isGroupStart: isGroupStart,
        originalMilestone: milestone,
        originalTypeOfWork: item.type_of_work || ''
      });
      
      lastMilestone = milestone;
    });
    
    setMilestoneGrouping(grouping);
  };

  const fetchData = async () => {
    try {
      // Load custom columns
      if (!projectId) return; // CRITICAL: Never load without projectId
      const columnsKey = `design-deliverables-columns-${projectId}`;
      const savedColumns = localStorage.getItem(columnsKey);
      if (savedColumns) {
        try {
          setCustomColumns(JSON.parse(savedColumns));
        } catch (e) {
          console.error('Failed to load custom columns:', e);
        }
      }
      
      // Try to load saved data first
      const savedData = loadDesignItems();
      if (savedData && savedData.length > 0) {
        setDesignItems(savedData);
        // Grouping is already initialized in loadDesignItems
        setLoading(false);
        return;
      }

      // Seed data for Milestone 0 and Milestone 1 as per image
      const seedData = [
        // Milestone 0 - Row 1
        {
          id: 1,
          sl_no: 1,
          description: 'Electrical & Automation Design, Supervision & Coordination',
          type_of_work: 'Electrical works',
          milestone_name: 'Entry Point',
          milestone_number: 'Milestone 0',
          sort: 'A',
          design_owner: '',
          deliverable_type: 'NA',
          delivery_type: 'NA',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 0 - Row 2
        {
          id: 2,
          sl_no: 2,
          description: 'Electrical Labour Contract',
          type_of_work: 'Electrical works',
          milestone_name: 'Third Party',
          milestone_number: 'Milestone 0',
          sort: 'A',
          design_owner: '',
          deliverable_type: 'NA',
          delivery_type: 'NA',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 3
        {
          id: 3,
          sl_no: 3,
          description: 'Conduits Accessories,',
          type_of_work: 'Electrical works',
          milestone_name: 'Conduiting',
          milestone_number: 'Milestone 1',
          sort: 'B',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: 'Client Requirement Drawing',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 4 (Drawing sub-item)
        {
          id: 4,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '1. BB, Building snapshot /keyplan',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 5 (Drawing sub-item)
        {
          id: 5,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '2. Electrical conduting',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 6 (Drawing sub-item)
        {
          id: 6,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '3. Networking conduiting',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 7 (Drawing sub-item)
        {
          id: 7,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '4. Lighting Dimension',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 8 (Drawing sub-item)
        {
          id: 8,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '5. Wallbox Drawing',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 9 (Drawing sub-item)
        {
          id: 9,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '6. Automation Conduiting Drawing',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 10 (Material List sub-item)
        {
          id: 10,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Material List',
          delivery_type: '1. Slab Conduiting',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 1 - Row 11 (Material List sub-item)
        {
          id: 11,
          sl_no: '',
          description: '',
          type_of_work: '',
          milestone_name: '',
          milestone_number: '',
          sort: '',
          design_owner: '',
          deliverable_type: 'Material List',
          delivery_type: '2. Open Conduiting',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // ===============================
        // Milestone 2 - Wall chipping
        // ===============================
        {
          id: 12,
          sl_no: 4,
          description: 'wall boxes and Drop Boxes',
          type_of_work: 'Electrical works',
          milestone_name: 'wall chipping',
          milestone_number: 'Milestone 2',
          sort: 'B',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // Milestone 2 - Drawing sub-items
        { id: 13, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '1. Wallbox Drawing', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 14, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '2. Custom DB', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 15, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '3. Automation Drawing', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 16, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '4. Networking Drawings', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // Milestone 2 - Material List row
        { id: 17, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Material List', delivery_type: '1. Wall Conduiting and wallbox Count and DB', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 3 - Wiring
        // ===============================
        {
          id: 18,
          sl_no: 5,
          description: 'Laying of fiber optics cable in the communication shaft',
          type_of_work: 'Communication work',
          milestone_name: 'Wiring',
          milestone_number: 'Milestone 3',
          sort: 'C',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        { id: 19, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '1. Grouping of lights', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        {
          id: 20,
          sl_no: 6,
          description: 'Internal Wiring & Cables',
          type_of_work: 'Electrical works',
          milestone_name: 'Wiring',
          milestone_number: 'Milestone 3',
          sort: 'C',
          design_owner: '',
          deliverable_type: 'Drawing',
          delivery_type: '',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        { id: 21, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Drawing', delivery_type: '2. DB SLD', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // Milestone 3 - Material List
        { id: 22, sl_no: '', description: '', type_of_work: '', milestone_name: '', milestone_number: '', sort: '', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Wiring Material List', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 4 - Backend Passive Components & DB Dressing
        // ===============================
        {
          id: 23,
          sl_no: 7,
          description: 'DBs, MCBs and Protection devices including custom DBs for automation',
          type_of_work: 'Electrical works',
          milestone_name: 'DB Dressing, Backend & Passive Components',
          milestone_number: 'Milestone 4',
          sort: 'D',
          design_owner: '',
          deliverable_type: 'Material List',
          delivery_type: 'DB dressing & MCBs Count Electrical',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        {
          id: 24,
          sl_no: 8,
          description: 'Backend Components',
          type_of_work: 'Lightning Automation',
          milestone_name: 'DB Dressing, Backend & Passive Components',
          milestone_number: 'Milestone 4',
          sort: 'D',
          design_owner: '',
          deliverable_type: 'Material List',
          delivery_type: 'DB dressing & MCB Count Automation',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        {
          id: 25,
          sl_no: 9,
          description: 'Networking Passive',
          type_of_work: 'Essential works',
          milestone_name: 'DB Dressing, Backend & Passive Components',
          milestone_number: 'Milestone 4',
          sort: 'D',
          design_owner: '',
          deliverable_type: 'Material List',
          delivery_type: 'Passive Component Essential',
          design_engineer: '',
          status: '',
          internal_review: '',
          approved_by_arc: '',
          drawing_ml_released_date: '',
          revised_date: ''
        },
        // ===============================
        // Milestone 5 - HT & LT External Works
        // ===============================
        { id: 26, sl_no: 10, description: 'RMU, Meter cubicle,', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'Load Calculation', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 27, sl_no: 11, description: 'Transformer,', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'Earthing Drawing', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 28, sl_no: 12, description: 'HT Kiosk', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'MSLD', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 29, sl_no: 13, description: 'HT cable laying from BESCOM tapping point to RMU', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'GA Drawing of Meter Board', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 30, sl_no: 14, description: 'HT cable laying from RMU to Metre cubicle', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'GA Drawing of Main Panel', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 31, sl_no: 15, description: 'HT cable laying from Meter cubicle to Primary side of Transformer', type_of_work: 'HT Works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'Lightning protection system', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 32, sl_no: 16, description: 'LT cable laying from Secondary side of Transformer to LT Kiosk', type_of_work: 'LT External works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Earthing and Lift', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 33, sl_no: 17, description: 'LT cable laying from LT Kiosk to LT Main panel', type_of_work: 'LT External works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Material List', delivery_type: 'HT and LT External BOQ', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 34, sl_no: 18, description: 'LT cable laying from LT Main panel to Sub panels', type_of_work: 'LT External works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Lightning Protection system BOQ', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 35, sl_no: 19, description: 'LT cable laying from Sub panels to DB\'s', type_of_work: 'LT External works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 36, sl_no: 20, description: 'Main LT panel and Sub panels', type_of_work: 'LT External works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // Addons under Milestone 5
        { id: 37, sl_no: 21, description: 'Earthing pit works for Panels,lifts, and any other third party', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 38, sl_no: 22, description: 'Lighting protection system', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 39, sl_no: 23, description: 'DG', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: 'Third Party', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 40, sl_no: 24, description: 'Solar panels', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: 'Solar ML', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 41, sl_no: 25, description: 'Servo Voltage Stabilizer', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: 'Ratings', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 42, sl_no: 26, description: 'UPS', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 43, sl_no: 27, description: 'Meter Board and Electrical Panels', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 44, sl_no: 28, description: 'Gate Motor for main gate. Shutter Motor for garage', type_of_work: 'Addons', milestone_name: 'Infrastructure', milestone_number: 'Milestone 5', sort: 'E', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 6 - Switches & Frontend
        // ===============================
        { id: 45, sl_no: 29, description: 'Earthing works (Convensional/ Copper rods with Chemical Earthing)', type_of_work: 'Electrical works', milestone_name: 'Infrastructure', milestone_number: 'Milestone 6', sort: 'F', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Automation Switch Count', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 46, sl_no: 30, description: 'Fronted Components', type_of_work: 'Lightning Automation', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', sort: 'F', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 47, sl_no: 31, description: 'Electrical switches International range', type_of_work: 'Electrical works', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', sort: 'F', design_owner: '', deliverable_type: '', delivery_type: 'Electrical Switches Indian Range', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 48, sl_no: 32, description: 'Electrical Switches Indian Range', type_of_work: 'Electrical works', milestone_name: 'Switches & Front End', milestone_number: 'Milestone 6', sort: 'F', design_owner: '', deliverable_type: '', delivery_type: 'Electrical Switches Indian Range', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 7 - Essentials work
        // ===============================
        { id: 49, sl_no: 33, description: 'Water Management solutions', type_of_work: 'Third Party Solutions', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 50, sl_no: 34, description: 'CCTV Basic', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'Networking Drawing', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 51, sl_no: 35, description: 'CCTV AI Based', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Essential Material List with Accessories', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 52, sl_no: 36, description: 'VDP villa / Multi tenant / Lock Inbuilt', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 53, sl_no: 37, description: 'Communication wiring and passive components', type_of_work: 'Essential works', milestone_name: 'DB Dressing, Backend & Passive Components', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 54, sl_no: 38, description: 'Networking Active', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 55, sl_no: 39, description: 'WiFi', type_of_work: 'Essential works', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 56, sl_no: 40, description: 'Digital Locks stand alone / Access controled based', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 57, sl_no: 41, description: 'Security System Basic', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 58, sl_no: 42, description: 'Security system Advanced (Gas leakage, smoke detectors, water leakage detectors, motion cams)', type_of_work: 'Essential works', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 59, sl_no: 43, description: 'Epbax / Ipbax / intercomm System', type_of_work: 'Third Party Solutions', milestone_name: 'Essentials', milestone_number: 'Milestone 7', sort: 'G', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 8 & 9 - Light Fixture
        // ===============================
        { id: 60, sl_no: 44, description: 'Curtain Motor/Blinds for Windows', type_of_work: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', sort: 'H', design_owner: '', deliverable_type: 'Material List', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 61, sl_no: 45, description: 'Zonal Audio', type_of_work: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', sort: 'H', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 62, sl_no: 46, description: 'Home theater', type_of_work: 'Third Party Solutions', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', sort: 'H', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 63, sl_no: 47, description: 'Light Fixtures', type_of_work: 'Electrical works', milestone_name: 'Light Fixtures', milestone_number: 'Milestone 8 and 9', sort: 'H', design_owner: '', deliverable_type: '', delivery_type: 'Lighting Count', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // Milestone 10 - Visualization & Hand Over
        // ===============================
        { id: 64, sl_no: 48, description: 'Visualization / Mobile Control', type_of_work: 'Lighthing Automation', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 65, sl_no: 49, description: 'HVAC Control', type_of_work: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 66, sl_no: 50, description: 'Any Socket on Schedule or Timer control', type_of_work: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 67, sl_no: 51, description: 'Heat Pumb On-Off control based on time', type_of_work: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 68, sl_no: 52, description: 'Voice control with Alexa or Siri', type_of_work: 'Third Party Solutions', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: '', delivery_type: 'Third Party Solutions', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 69, sl_no: 53, description: 'Commissioning, programming, handover and 1 year service', type_of_work: 'Handing Over', milestone_name: 'Visualization & Handover', milestone_number: 'Milestone 10', sort: 'I', design_owner: '', deliverable_type: 'Drawing', delivery_type: 'As Built Drawing', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        // ===============================
        // NA Milestone - Additional Systems
        // ===============================
        { id: 70, sl_no: 54, description: 'Installation of TV antennas', type_of_work: 'Communication work', milestone_name: 'Wiring', milestone_number: 'NA', sort: '', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 71, sl_no: 55, description: 'Fire alarm system', type_of_work: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', sort: '', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 72, sl_no: 56, description: 'PA system', type_of_work: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', sort: '', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' },
        { id: 73, sl_no: 57, description: 'Emergency exit system', type_of_work: 'Fire and Safety', milestone_name: 'Conduiting and wall chipping', milestone_number: 'NA', sort: '', design_owner: '', deliverable_type: '', delivery_type: '', design_engineer: '', status: '', internal_review: '', approved_by_arc: '', drawing_ml_released_date: '', revised_date: '' }
      ];
      
      setDesignItems(seedData);
      saveDesignItems(seedData);
      initializeMilestoneGrouping(seedData);
    } catch (error) {
      console.error('Failed to fetch design deliverables:', error);
      setDesignItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDesignItem = (index, field, value) => {
    // Use functional update to avoid stale closures and ensure immediate UI update
    setDesignItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-save useEffect will handle debounced saving
      return updated;
    });
  };

  const autoExpandTextarea = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Excel-like row operations
  const addRow = (afterIndex) => {
    const newId = Math.max(...designItems.map(item => item.id || 0), 0) + 1;
    const newRow = {
      id: newId,
      sl_no: '',
      description: '',
      type_of_work: '',
      milestone_name: '',
      milestone_number: '',
      sort: '',
      design_owner: '',
      deliverable_type: '',
      delivery_type: '',
      design_engineer: '',
      status: '',
      internal_review: '',
      approved_by_arc: '',
      drawing_ml_released_date: '',
      revised_date: '',
      ...customColumns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})
    };
    
    setDesignItems(prev => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newRow);
      return updated;
    });
    
    // Update milestone grouping
    setMilestoneGrouping(prev => {
      const updated = [...prev];
      const insertAfter = updated[afterIndex] || { groupIndex: 0, isGroupStart: false };
      updated.splice(afterIndex + 1, 0, {
        groupIndex: insertAfter.groupIndex,
        isGroupStart: false,
        originalMilestone: '',
        originalTypeOfWork: ''
      });
      return updated;
    });
    
    toast.success('Row added');
  };

  const deleteRow = (index) => {
    if (window.confirm('Delete this row?')) {
      setDesignItems(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      
      setMilestoneGrouping(prev => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
      
      toast.success('Row deleted');
    }
  };

  // Excel-like column operations
  const addColumn = (afterIndex) => {
    const columnNum = customColumns.length + 1;
    let insertAfterValue = afterIndex;
    let insertPosition = null;
    
    // If inserting after a custom column (afterIndex >= 14), find that column's position
    if (afterIndex >= 14) {
      const customColIndex = afterIndex - 14;
      if (customColIndex >= 0 && customColIndex < customColumns.length) {
        // Use the same insertAfter value as the custom column we're inserting after
        insertAfterValue = customColumns[customColIndex].insertAfter;
        // Find the position to insert (right after this custom column in the same group)
        insertPosition = customColIndex + 1;
        // Count how many columns already have this insertAfter value before this position
        let sameGroupCount = 0;
        for (let i = 0; i < customColIndex; i++) {
          if (customColumns[i].insertAfter === insertAfterValue) {
            sameGroupCount++;
          }
        }
        insertPosition = customColIndex + 1;
      }
    }
    
    const newColumn = {
      key: `custom_col_${Date.now()}_${columnNum}`,
      label: `Column ${columnNum}`,
      insertAfter: insertAfterValue // Track which base column (0-14) this should appear after
    };
    
    setCustomColumns(prev => {
      const updated = [...prev];
      if (insertPosition !== null) {
        // Insert at specific position (after a custom column) - RIGHT side
        updated.splice(insertPosition, 0, newColumn);
      } else {
        // Insert after a base column - find all columns with same insertAfter and add AFTER them (RIGHT side)
        // Find the last column with this insertAfter value
        let insertPos = updated.length;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].insertAfter === insertAfterValue) {
            insertPos = i + 1;
            break;
          }
        }
        updated.splice(insertPos, 0, newColumn);
      }
      return updated;
    });
    
    // Add empty value for this column to all rows
    setDesignItems(prev => prev.map(item => ({
      ...item,
      [newColumn.key]: ''
    })));
    
    toast.success('Column added');
  };

  const deleteColumn = (columnIndex) => {
    const column = customColumns[columnIndex];
    if (window.confirm(`Delete column "${column.label}"?`)) {
      setCustomColumns(prev => {
        const updated = [...prev];
        updated.splice(columnIndex, 1);
        return updated;
      });
      
      // Remove column data from all rows
      setDesignItems(prev => prev.map(item => {
        const updated = { ...item };
        delete updated[column.key];
        return updated;
      }));
      
      toast.success('Column deleted');
    }
  };

  const updateColumnLabel = (columnIndex, newLabel) => {
    setCustomColumns(prev => {
      const updated = [...prev];
      updated[columnIndex] = { ...updated[columnIndex], label: newLabel };
      return updated;
    });
  };

  const buildDesignRows = () => {
    const rows = [];
    let rowIndex = 0;
    let lastGroupIndex = -1;

    designItems.forEach((item, idx) => {
      // Use the original milestone grouping to determine where headers should be
      // This ensures headers don't move when dropdown values change
      const groupInfo = milestoneGrouping[idx];
      
      // Create milestone header only if this is the start of a new milestone group
      if (groupInfo && groupInfo.isGroupStart && groupInfo.groupIndex !== lastGroupIndex) {
        const milestoneNum = item.milestone_number || groupInfo.originalMilestone || '';
        const typeOfWork = item.type_of_work || groupInfo.originalTypeOfWork || '';
        
        if (milestoneNum) {
          rows.push({
            type: 'section',
            title: `MILESTONE ${milestoneNum} - ${typeOfWork}`,
            milestone: milestoneNum,
            rowIndex: rowIndex++
          });
          lastGroupIndex = groupInfo.groupIndex;
        }
      }
      
      rows.push({
        type: 'item',
        item: item,
        srcIndex: idx,
        index: item.sl_no,
        rowIndex: rowIndex++
      });
    });

    return rows;
  };

  const getDeliverableTypeColor = (type) => {
    if (type === 'Drawing') return 'bg-green-100';
    if (type === 'Material List') return 'bg-yellow-100';
    return '';
  };

  // Helper function to get custom columns that should appear after a base column
  const getCustomColumnsAfter = (baseColumnIndex) => {
    return customColumns.filter(col => col.insertAfter === baseColumnIndex);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const exportToGoogleSheets = () => {
    const baseHeaders = ['SL NO.', 'Description', 'Type of work', 'Milestone Name', 'Milestone Number', 'Sort', 'Design Owner', 'Deliverable Type', 'Delivery Type', 'Design Engineer', 'Status', 'Internal Review', 'Approved by ARC', 'Drawing/ML Released Date', 'Revised Date'];
    const customHeaders = customColumns.map(col => col.label || col.key);
    const headers = [...baseHeaders, ...customHeaders];
    const csv = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
    
    designItems.forEach((item) => {
      const baseRow = [
        item.sl_no || '',
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.type_of_work || '').replace(/"/g, '""')}"`,
        `"${(item.milestone_name || '').replace(/"/g, '""')}"`,
        `"${(item.milestone_number || '').replace(/"/g, '""')}"`,
        `"${(item.sort || '').replace(/"/g, '""')}"`,
        `"${(item.design_owner || '').replace(/"/g, '""')}"`,
        `"${(item.deliverable_type || '').replace(/"/g, '""')}"`,
        `"${(item.delivery_type || '').replace(/"/g, '""')}"`,
        `"${(item.design_engineer || '').replace(/"/g, '""')}"`,
        `"${(item.status || '').replace(/"/g, '""')}"`,
        `"${(item.internal_review || '').replace(/"/g, '""')}"`,
        `"${(item.approved_by_arc || '').replace(/"/g, '""')}"`,
        `"${(item.drawing_ml_released_date || '').replace(/"/g, '""')}"`,
        `"${(item.revised_date || '').replace(/"/g, '""')}"`
      ];
      const customRow = customColumns.map(col => `"${((item[col.key] || '').toString()).replace(/"/g, '""')}"`);
      csv.push([...baseRow, ...customRow].join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `design-deliverables-${projectId || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Design deliverables exported successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scope of work List</CardTitle>
          <Button size="sm" variant="outline" onClick={exportToGoogleSheets}>
            Export to Google Sheets
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <style>{`
          table {
            table-layout: auto;
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            font-size: 12px;
          }
          table th, table td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
            position: relative;
            word-wrap: break-word;
            word-break: break-word;
            overflow: visible !important;
            white-space: normal;
          }
          table th {
            background-color: #fef3c7;
            font-weight: 600;
            text-align: center;
            padding: 8px 6px;
          }
          table td textarea {
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
          table td {
            padding: 4px 6px !important;
            min-height: 32px !important;
            position: relative;
            background-color: white;
            word-wrap: break-word;
            word-break: break-word;
            overflow: visible !important;
            white-space: normal;
          }
          table td input, table td select {
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
            cursor: text;
          }
          table td input:focus, table td select:focus, table td textarea:focus {
            background-color: #f0f9ff !important;
            border: 1px solid #0ea5e9 !important;
            border-radius: 2px;
          }
          table td:hover {
            background-color: transparent !important;
          }
          table td:hover input, table td:hover textarea, table td:hover select {
            background-color: transparent !important;
          }
          .milestone-header {
            background-color: #fee2e2 !important;
            font-weight: bold;
            text-align: center;
          }
          .milestone-header td {
            background-color: #fee2e2 !important;
            padding: 8px 6px !important;
          }
          .bg-green-100 {
            background-color: #dcfce7 !important;
          }
          .bg-yellow-100 {
            background-color: #fef9c3 !important;
          }
          .row-controls, .col-controls {
            position: absolute;
            background: #3b82f6;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 6px;
            border-radius: 3px;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.1s ease, visibility 0.1s ease;
            min-width: 20px;
            min-height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          tr:hover .row-controls {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }
          th:hover .col-controls {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }
          .row-controls:hover, .col-controls:hover {
            background: #2563eb;
            opacity: 1 !important;
            visibility: visible !important;
          }
          table th, table td {
            cursor: default !important;
            position: relative;
          }
          table th:hover, table td:hover {
            cursor: default !important;
          }
          table td input, table td textarea, table td select {
            cursor: text !important;
            pointer-events: auto;
          }
          table th input {
            cursor: text !important;
            pointer-events: auto;
          }
          table td:hover {
            background-color: transparent !important;
          }
          table td:hover input, table td:hover textarea, table td:hover select {
            background-color: transparent !important;
            cursor: text !important;
          }
          table td:hover {
            cursor: default !important;
          }
          table td input:hover, table td textarea:hover, table td select:hover {
            cursor: text !important;
          }
          .row-add-btn {
            left: -18px;
            top: 50%;
            transform: translateY(-50%);
            position: absolute;
            white-space: nowrap;
          }
          .row-delete-btn {
            left: -18px;
            top: calc(50% + 22px);
            transform: translateY(-50%);
            position: absolute;
            white-space: nowrap;
          }
          table tbody tr td:first-of-type {
            position: relative;
            padding-left: 25px !important;
          }
          table tbody tr td:first-of-type input {
            width: calc(100% - 0px);
          }
          .col-add-btn {
            top: -25px;
            right: 10px;
            transform: none;
            position: absolute;
          }
          .col-delete-btn {
            top: -25px;
            right: -20px;
            transform: none;
            position: absolute;
          }
          table th {
            position: relative;
            overflow: visible !important;
          }
          table tr {
            position: relative;
            overflow: visible !important;
          }
          table td {
            overflow: visible !important;
          }
          table {
            overflow: visible !important;
          }
          .w-full.overflow-x-auto {
            overflow-x: auto;
            overflow-y: visible;
            padding-left: 25px;
          }
          table tbody tr {
            position: relative;
          }
          table tbody tr td:first-child {
            position: relative;
          }
          table th {
            position: relative;
          }
          table tr {
            position: relative;
          }
          table td input:focus, table td textarea:focus, table td select:focus {
            background-color: #f0f9ff !important;
            border: 1px solid #0ea5e9 !important;
            border-radius: 2px;
          }
          table td input:not(:focus), table td textarea:not(:focus), table td select:not(:focus) {
            background-color: transparent !important;
          }
        `}</style>
        <div className="w-full overflow-x-auto" style={{ position: 'relative', paddingLeft: '30px', paddingTop: '25px' }}>
          <table ref={tableRef} className="border">
            <thead>
              <tr>
                {/* Custom columns before first base column */}
                {getCustomColumnsAfter(-1).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[0] || '50px', minWidth: '50px' }}>
                  SL No.
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(0); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(0).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[1] || '300px', minWidth: '200px' }}>
                  Description
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(1); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(1).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[2] || '150px', minWidth: '120px' }}>
                  Type of work
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(2); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(2).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[3] || '150px', minWidth: '120px' }}>
                  Milestone Name
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(3); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(3).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[4] || '150px', minWidth: '120px' }}>
                  Milestone Number
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(4); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(4).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[5] || '80px', minWidth: '60px' }}>
                  Sort
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(5); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(5).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[6] || '180px', minWidth: '150px' }}>
                  Design Owner (Spinach owner)
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(6); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(6).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[7] || '200px', minWidth: '150px' }}>
                  Deliverable Type (Drawing or Material List)
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(7); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(7).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[8] || '300px', minWidth: '250px' }}>
                  Delivery Type
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(8); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(8).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[9] || '150px', minWidth: '120px' }}>
                  Design Engineer
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(9); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(9).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[10] || '120px', minWidth: '100px' }}>
                  Status
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(10); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(10).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[11] || '120px', minWidth: '100px' }}>
                  Internal Review
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(11); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(11).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[12] || '150px', minWidth: '120px' }}>
                  Approved By Arc
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(12); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(12).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[13] || '180px', minWidth: '150px' }}>
                  Drawing/ML Released Date
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(13); }} title="Add column after">+</button>
                </th>
                {getCustomColumnsAfter(13).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
                <th style={{ width: columnWidths[14] || '150px', minWidth: '120px' }}>
                  Revised Date
                  <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14); }} title="Add column after">+</button>
                </th>
                {customColumns.filter(col => col.insertAfter === undefined || col.insertAfter >= 14).map((col) => {
                  const colIdx = customColumns.indexOf(col);
                  return (
                    <th key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(colIdx, e.target.value)}
                        className="bg-transparent border-none outline-none text-center font-semibold w-full"
                        style={{ background: '#fef3c7', padding: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="col-controls col-add-btn" onClick={(e) => { e.stopPropagation(); addColumn(14 + colIdx); }} title="Add column after">+</button>
                      <button className="col-controls col-delete-btn" onClick={(e) => { e.stopPropagation(); deleteColumn(colIdx); }} title="Delete column">×</button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(!designItems || designItems.length === 0) ? (
                <tr>
                  <td colSpan={15 + customColumns.length} className="text-center text-slate-500 py-8">No design deliverables yet</td>
                </tr>
              ) : (
                buildDesignRows().map((row, idx) => (
                  row.type === 'section' ? (
                    <tr key={`section-${idx}`} className="milestone-header">
                      <td colSpan={15 + customColumns.length} className="font-bold text-center">{row.title}</td>
                    </tr>
                  ) : (
                    <tr 
                      key={row.item.id || `row-${idx}`} 
                      data-row-index={row.rowIndex} 
                      style={{ height: rowHeights[row.rowIndex] ? `${rowHeights[row.rowIndex]}px` : 'auto', minHeight: rowHeights[row.rowIndex] ? `${rowHeights[row.rowIndex]}px` : 'auto' }}
                    >
                      {/* Custom columns before first base column */}
                      {getCustomColumnsAfter(-1).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                      </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[0] || '50px', position: 'relative' }}>
                        <button 
                          className="row-controls row-add-btn" 
                          onClick={(e) => { e.stopPropagation(); addRow(row.srcIndex); }} 
                          title="Add row below"
                        >
                          +
                        </button>
                        <button 
                          className="row-controls row-delete-btn" 
                          onClick={(e) => { e.stopPropagation(); deleteRow(row.srcIndex); }} 
                          title="Delete row"
                        >
                          ×
                        </button>
                        <input 
                          type="text" 
                          className="bg-transparent text-center outline-none w-full border-none" 
                          value={row.item.sl_no || ''} 
                          onChange={(e) => updateDesignItem(row.srcIndex, 'sl_no', e.target.value)}
                          placeholder=""
                        />
                      </td>
                      {/* Custom columns after SL No. */}
                      {getCustomColumnsAfter(0).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[1] || '300px' }}>
                        <textarea 
                          className="w-full bg-transparent outline-none" 
                          value={row.item.description || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'description', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      {/* Custom columns after Description */}
                      {getCustomColumnsAfter(1).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[2] || '150px' }}>
                        <textarea 
                          className="w-full bg-transparent outline-none" 
                          value={row.item.type_of_work || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'type_of_work', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      {/* Custom columns after Type of work */}
                      {getCustomColumnsAfter(2).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[3] || '150px' }}>
                        <textarea 
                          className="w-full bg-transparent outline-none" 
                          value={row.item.milestone_name || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'milestone_name', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      <td className="text-center" style={{ width: columnWidths[4] || '150px' }}>
                        <Select 
                          value={row.item.milestone_number || undefined} 
                          onValueChange={(value) => {
                            updateDesignItem(row.srcIndex, 'milestone_number', value);
                          }}
                        >
                          <SelectTrigger className="w-full h-auto min-h-[24px] py-0 px-2 text-center border-0 bg-transparent">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Milestone 0">Milestone 0</SelectItem>
                            <SelectItem value="Milestone 1">Milestone 1</SelectItem>
                            <SelectItem value="Milestone 2">Milestone 2</SelectItem>
                            <SelectItem value="Milestone 3">Milestone 3</SelectItem>
                            <SelectItem value="Milestone 4">Milestone 4</SelectItem>
                            <SelectItem value="Milestone 5">Milestone 5</SelectItem>
                            <SelectItem value="Milestone 6">Milestone 6</SelectItem>
                            <SelectItem value="Milestone 7">Milestone 7</SelectItem>
                            <SelectItem value="Milestone 8">Milestone 8</SelectItem>
                            <SelectItem value="Milestone 9">Milestone 9</SelectItem>
                            <SelectItem value="Milestone 10">Milestone 10</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Custom columns after Milestone Name */}
                      {getCustomColumnsAfter(3).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      {/* Custom columns after Milestone Number */}
                      {getCustomColumnsAfter(4).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[5] || '80px' }}>
                        <textarea 
                          className="w-full bg-transparent text-center outline-none" 
                          value={row.item.sort || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'sort', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      {/* Custom columns after Sort */}
                      {getCustomColumnsAfter(5).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[6] || '180px' }}>
                        <textarea 
                          className="w-full bg-transparent outline-none" 
                          value={row.item.design_owner || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'design_owner', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      <td className={`text-center ${getDeliverableTypeColor(row.item.deliverable_type)}`} style={{ width: columnWidths[7] || '200px' }}>
                        <select 
                          className="w-full outline-none text-center" 
                          value={row.item.deliverable_type || ''} 
                          onChange={(e) => updateDesignItem(row.srcIndex, 'deliverable_type', e.target.value)}
                          style={{ background: 'transparent', border: 'none', width: '100%', height: '100%' }}
                        >
                          <option value="">Select</option>
                          <option value="Drawing">Drawing</option>
                          <option value="Material List">Material List</option>
                          <option value="NA">NA</option>
                        </select>
                      </td>
                      {/* Custom columns after Design Owner */}
                      {getCustomColumnsAfter(6).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      {/* Custom columns after Deliverable Type */}
                      {getCustomColumnsAfter(7).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[8] || '300px' }}>
                        <textarea 
                          className="w-full bg-transparent outline-none" 
                          value={row.item.delivery_type || ''} 
                          onChange={(e) => {
                            updateDesignItem(row.srcIndex, 'delivery_type', e.target.value);
                            autoExpandTextarea(e);
                          }}
                          onInput={autoExpandTextarea}
                          rows={1}
                        />
                      </td>
                      {/* Custom columns after Delivery Type */}
                      {getCustomColumnsAfter(8).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td style={{ width: columnWidths[9] || '150px' }} className="relative">
                        <div className="relative w-full flex items-center">
                          <button
                            type="button"
                            className="w-full bg-transparent outline-none border-none text-left pr-6 flex items-center justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDesignEngineerDropdown(prev => ({
                                ...prev,
                                [row.srcIndex]: !prev[row.srcIndex]
                              }));
                            }}
                            style={{ background: 'transparent', border: 'none', width: '100%', height: '100%', minHeight: '24px', cursor: 'pointer', padding: '4px 6px' }}
                          >
                            <span className="text-slate-700">{row.item.design_engineer || 'Select'}</span>
                            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {showDesignEngineerDropdown[row.srcIndex] && (
                          <div className="design-engineer-dropdown absolute z-50 bg-white border border-slate-200 rounded-md shadow-xl mt-1" style={{ minWidth: '200px', left: 0, top: '100%', maxHeight: '300px', overflowY: 'auto' }}>
                            <div className="py-1">
                              <button
                                type="button"
                                className="w-full text-left text-sm py-2 px-3 hover:bg-blue-50 text-slate-700"
                                onClick={() => {
                                  updateDesignItem(row.srcIndex, 'design_engineer', '');
                                  setShowDesignEngineerDropdown(prev => ({ ...prev, [row.srcIndex]: false }));
                                }}
                              >
                                Select
                              </button>
                              {designEngineerOptions.map((option, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between text-sm py-2 px-3 hover:bg-blue-50 text-slate-700 ${row.item.design_engineer === option ? 'bg-blue-50' : ''}`}
                                >
                                  <button
                                    type="button"
                                    className="flex-1 text-left"
                                    onClick={() => {
                                      updateDesignItem(row.srcIndex, 'design_engineer', option);
                                      setShowDesignEngineerDropdown(prev => ({ ...prev, [row.srcIndex]: false }));
                                    }}
                                  >
                                    {option}
                                  </button>
                                  {option !== 'Design Engineer' && (
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors ml-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDesignEngineer(option);
                                      }}
                                      title="Delete"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div className="border-t border-slate-200 mt-1">
                                {showAddInput ? (
                                  <div className="p-2 space-y-2">
                                    <input
                                      type="text"
                                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Enter name"
                                      value={newEngineerName}
                                      onChange={(e) => setNewEngineerName(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          addDesignEngineer();
                                          setShowAddInput(false);
                                          setShowDesignEngineerDropdown(prev => ({ ...prev, [row.srcIndex]: false }));
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className="flex-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                                        onClick={() => {
                                          addDesignEngineer();
                                          setShowAddInput(false);
                                          setShowDesignEngineerDropdown(prev => ({ ...prev, [row.srcIndex]: false }));
                                        }}
                                      >
                                        Add
                                      </button>
                                      <button
                                        type="button"
                                        className="flex-1 text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition-colors"
                                        onClick={() => {
                                          setShowAddInput(false);
                                          setNewEngineerName('');
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="w-full text-left text-sm py-2 px-3 hover:bg-slate-50 text-blue-600 font-medium flex items-center gap-2"
                                    onClick={() => {
                                      setShowAddInput(true);
                                      setNewEngineerName('');
                                    }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      {/* Custom columns after Design Engineer */}
                      {getCustomColumnsAfter(9).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[10] || '120px' }}>
                        <Select 
                          value={row.item.status || undefined} 
                          onValueChange={(value) => {
                            updateDesignItem(row.srcIndex, 'status', value);
                          }}
                        >
                          <SelectTrigger className="w-full h-auto min-h-[24px] py-0 px-2 text-center border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="NA">NA</SelectItem>
                            <SelectItem value="Ongoing">Ongoing</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Custom columns after Status */}
                      {getCustomColumnsAfter(10).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[11] || '120px' }}>
                        <Select 
                          value={row.item.internal_review || undefined} 
                          onValueChange={(value) => {
                            updateDesignItem(row.srcIndex, 'internal_review', value);
                          }}
                        >
                          <SelectTrigger className="w-full h-auto min-h-[24px] py-0 px-2 text-center border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="NA">NA</SelectItem>
                            <SelectItem value="Ongoing">Ongoing</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Custom columns after Internal Review */}
                      {getCustomColumnsAfter(11).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[12] || '150px' }}>
                        <Select 
                          value={row.item.approved_by_arc || undefined} 
                          onValueChange={(value) => {
                            updateDesignItem(row.srcIndex, 'approved_by_arc', value);
                          }}
                        >
                          <SelectTrigger className="w-full h-auto min-h-[24px] py-0 px-2 text-center border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="NA">NA</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Custom columns after Approved By Arc */}
                      {getCustomColumnsAfter(12).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[13] || '180px' }}>
                        <input 
                          type="date" 
                          className="bg-transparent text-center outline-none w-full" 
                          value={row.item.drawing_ml_released_date || ''} 
                          onChange={(e) => updateDesignItem(row.srcIndex, 'drawing_ml_released_date', e.target.value)}
                        />
                      </td>
                      {/* Custom columns after Drawing/ML Released Date */}
                      {getCustomColumnsAfter(13).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ width: columnWidths[14] || '150px' }}>
                        <input 
                          type="date" 
                          className="bg-transparent text-center outline-none w-full" 
                          value={row.item.revised_date || ''} 
                          onChange={(e) => updateDesignItem(row.srcIndex, 'revised_date', e.target.value)}
                        />
                      </td>
                      {/* Custom columns after Revised Date (insertAfter >= 14 or undefined) */}
                      {customColumns.filter(col => col.insertAfter === undefined || col.insertAfter >= 14).map((col) => {
                        const colIdx = customColumns.indexOf(col);
                        return (
                          <td key={col.key} style={{ width: columnWidths[15 + colIdx] || '150px' }}>
                            <textarea 
                              className="w-full bg-transparent outline-none" 
                              value={row.item[col.key] || ''} 
                              onChange={(e) => {
                                updateDesignItem(row.srcIndex, col.key, e.target.value);
                                autoExpandTextarea(e);
                              }}
                              onInput={autoExpandTextarea}
                              rows={1}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
