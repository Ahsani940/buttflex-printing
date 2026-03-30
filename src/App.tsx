import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Printer, Save, FilePlus, Lock, Search, X, Eye, EyeOff, TrendingUp, Users, CreditCard, MessageCircle, Pencil, CheckCircle, DollarSign, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Types ---
interface BillItem {
  id: string;
  description: string;
  width: number;
  height: number;
  qty: number;
  quality: string;
  rate: number;
  totalArea: number;
  totalAmount: number;
}

interface LedgerEntry {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  customer: string;
  customerPhone?: string;
  paymentMethod: string;
  totalAmount: number;
  advanceReceived: number;
  balanceRemaining: number;
  totalArea: number;
  items: BillItem[];
  designCharges: number;
  otherChargesName?: string;
  otherChargesAmount?: number;
  otherPaymentDescription?: string;
  isPrinted?: boolean;
}

// --- Constants ---
const COMPANY_NAME = '';
const APP_TITLE = 'Butt Flex Printing';
const APP_SUBTITLE = 'DIGITAL FLEX PRINTING';
const CONTACT_INFO = '0314-4174479, 0304-7758621';
const ADDRESS = 'Basement Bank Islamic G.T Road Muridkey';

const QUALITY_OPTIONS = [
  'Standard',
  'High',
  'Premium',
  'Glossy',
  'Matte',
  'Star',
  'China',
  'Frontlit',
  'Backlit',
  'Vinyl',
  'One Way Vision',
];

export default function App() {
  // --- State ---
  const [systemPassword, setSystemPassword] = useState(() => localStorage.getItem('butt_flex_password') || '123');
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [items, setItems] = useState<BillItem[]>([
    { id: '1', description: 'Sample File', width: 0, height: 0, qty: 1, quality: 'Standard', rate: 0, totalArea: 0, totalAmount: 0 },
  ]);
  const [designCharges, setDesignCharges] = useState<number>(0);
  const [otherChargesName, setOtherChargesName] = useState('');
  const [otherChargesAmount, setOtherChargesAmount] = useState<number>(0);
  const [advanceReceived, setAdvanceReceived] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [otherPaymentDescription, setOtherPaymentDescription] = useState('');
  const [showRate, setShowRate] = useState(true);
  const [isPrinted, setIsPrinted] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<LedgerEntry | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- Notification Helper ---
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Refs ---
  const printRef = useRef<HTMLDivElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const lastItemInputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedLedger = localStorage.getItem('butt_flex_ledger');
    if (savedLedger) {
      setLedger(JSON.parse(savedLedger));
    }

    // Load Draft
    const savedDraft = localStorage.getItem('butt_flex_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.customerName) setCustomerName(draft.customerName);
        if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
        if (draft.date) setDate(draft.date);
        if (draft.time) setTime(draft.time);
        if (draft.items) setItems(draft.items);
        if (draft.designCharges) setDesignCharges(draft.designCharges);
        if (draft.advanceReceived) setAdvanceReceived(draft.advanceReceived);
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        if (draft.editingId) setEditingId(draft.editingId);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('butt_flex_ledger', JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem('butt_flex_password', systemPassword);
  }, [systemPassword]);

  // Auto-save Draft
  useEffect(() => {
    const draft = {
      customerName,
      customerPhone,
      date,
      time,
      items,
      designCharges,
      advanceReceived,
      paymentMethod,
      editingId
    };
    localStorage.setItem('butt_flex_draft', JSON.stringify(draft));
  }, [customerName, customerPhone, date, items, designCharges, advanceReceived, paymentMethod, editingId]);

  useEffect(() => {
    if (isLocked && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked && customerNameRef.current) {
      customerNameRef.current.focus();
    }
  }, [isLocked]);

  // --- Calculations ---
  const totalArea = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalArea, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    return itemsTotal + designCharges + otherChargesAmount;
  }, [items, designCharges, otherChargesAmount]);

  const balanceRemaining = useMemo(() => {
    return totalAmount - advanceReceived;
  }, [totalAmount, advanceReceived]);

  // --- Handlers ---
  const handleUnlock = () => {
    if (password === systemPassword) {
      setIsLocked(false);
      setPassword('');
    } else {
      showNotification('Incorrect Password', 'error');
    }
  };

  const handleChangePassword = () => {
    if (currentPasswordInput !== systemPassword) {
      showNotification('Incorrect current password', 'error');
      return;
    }
    if (!newPassword) {
      showNotification('Please enter a new password', 'error');
      return;
    }
    setSystemPassword(newPassword);
    setIsChangingPassword(false);
    setCurrentPasswordInput('');
    setNewPassword('');
    showNotification('Password Changed Successfully');
  };

  const addItem = () => {
    const newItemId = Date.now().toString();
    setItems([
      ...items,
      { id: newItemId, description: '', width: 0, height: 0, qty: 1, quality: 'Standard', rate: 0, totalArea: 0, totalAmount: 0 },
    ]);
    
    // Auto focus on the new item's description
    setTimeout(() => {
      if (lastItemInputRef.current) {
        lastItemInputRef.current.focus();
      }
    }, 100);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          if (field === 'width' || field === 'height' || field === 'qty' || field === 'rate' || field === 'quality') {
            updatedItem.totalArea = updatedItem.width * updatedItem.height * updatedItem.qty;
            updatedItem.totalAmount = updatedItem.totalArea * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleFullPayment = () => {
    setAdvanceReceived(totalAmount);
  };

  const saveToLedger = () => {
    if (!customerName) {
      showNotification('Please enter customer name', 'error');
      return;
    }
    
    if (editingId) {
      // Update existing entry
      setLedger(ledger.map(entry => {
        if (entry.id === editingId) {
          return {
            ...entry,
            date,
            time,
            customer: customerName,
            customerPhone,
            paymentMethod,
            totalAmount,
            advanceReceived,
            balanceRemaining,
            totalArea,
            items: [...items],
            designCharges,
            otherChargesName,
            otherChargesAmount,
            otherPaymentDescription: paymentMethod === 'Other' ? otherPaymentDescription : '',
            isPrinted,
          };
        }
        return entry;
      }));
      showNotification('Invoice Updated Successfully');
      resetForm();
    } else {
      // Generate Invoice Number
      const lastInvoice = ledger.length > 0 ? parseInt(ledger[0].invoiceNo.split('-')[1]) : 1000;
      const nextInvoiceNo = `BF-${lastInvoice + 1}`;

      const newEntry: LedgerEntry = {
        id: Date.now().toString(),
        invoiceNo: nextInvoiceNo,
        date,
        time,
        customer: customerName,
        customerPhone,
        paymentMethod,
        totalAmount,
        advanceReceived,
        balanceRemaining,
        totalArea,
        items: [...items],
        designCharges,
        otherChargesName,
        otherChargesAmount,
        otherPaymentDescription: paymentMethod === 'Other' ? otherPaymentDescription : '',
        isPrinted,
      };
      setLedger([newEntry, ...ledger]);
      showNotification(`Saved as ${nextInvoiceNo}`);
      resetForm();
    }
  };

  const loadLedgerEntry = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setCustomerName(entry.customer);
    setCustomerPhone(entry.customerPhone || '');
    setDate(entry.date);
    setTime(entry.time || '');
    setPaymentMethod(entry.paymentMethod || 'Cash');
    setOtherPaymentDescription(entry.otherPaymentDescription || '');
    setOtherChargesName(entry.otherChargesName || '');
    setOtherChargesAmount(entry.otherChargesAmount || 0);
    setIsPrinted(entry.isPrinted || false);
    setItems([...entry.items]);
    setDesignCharges(entry.designCharges || 0);
    setAdvanceReceived(entry.advanceReceived);
    showNotification(`Loaded Invoice ${entry.invoiceNo}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewLedgerEntry = (entry: LedgerEntry) => {
    setViewingEntry(entry);
  };

  const downloadPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      showNotification('Generating PDF...', 'success');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
      showNotification('PDF Downloaded Successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      showNotification('Failed to generate PDF', 'error');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCustomerName('');
    setCustomerPhone('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setItems([{ id: '1', description: 'Sample File', width: 0, height: 0, qty: 1, quality: 'Standard', rate: 0, totalArea: 0, totalAmount: 0 }]);
    setDesignCharges(0);
    setAdvanceReceived(0);
    setPaymentMethod('Cash');
    setOtherPaymentDescription('');
    setOtherChargesName('');
    setOtherChargesAmount(0);
    setIsPrinted(false);
    
    // Auto focus on customer name
    setTimeout(() => {
      if (customerNameRef.current) {
        customerNameRef.current.focus();
      }
    }, 100);
  };

  const collectBalance = (id: string) => {
    setLedger(ledger.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          advanceReceived: entry.totalAmount,
          balanceRemaining: 0
        };
      }
      return entry;
    }));
    showNotification('Balance Collected Successfully');
  };

  const togglePrintStatus = (id: string) => {
    setLedger(ledger.map(entry => {
      if (entry.id === id) {
        return { ...entry, isPrinted: !entry.isPrinted };
      }
      return entry;
    }));
    showNotification('Printing status updated');
  };

  const sendWhatsAppAlert = (entry: LedgerEntry) => {
    if (!entry.customerPhone) {
      showNotification('No phone number found for this customer', 'error');
      return;
    }
    
    const itemsSummary = entry.items
      .map(item => `- ${item.description}: ${item.width}x${item.height} (${item.qty}) [${item.quality} @ Rs.${item.rate}] = Rs.${item.totalAmount.toLocaleString()}`)
      .join('%0A');

    const message = `*${APP_TITLE.toUpperCase()}*%0A` +
      `*Assalamu Alaikum*%0A%0A` +
      `*Professional Billing Alert*%0A%0A` +
      `Dear *${entry.customer}*,%0A` +
      `We hope you are doing well. Here are your invoice details:%0A%0A` +
      `*Invoice No:* ${entry.invoiceNo}%0A` +
      `*Date:* ${entry.date} ${entry.time || ''}%0A%0A` +
      `*Order Details:*%0A${itemsSummary}%0A%0A` +
      `*Design Charges:* Rs. ${entry.designCharges || 0}%0A` +
      (entry.otherChargesAmount ? `*${entry.otherChargesName || 'Other Charges'}:* Rs. ${entry.otherChargesAmount}%0A` : '') +
      `*Payment Mode:* ${entry.paymentMethod || 'Cash'}%0A` +
      `*Total Amount:* Rs. ${entry.totalAmount.toLocaleString()}%0A` +
      `*Advance Received:* Rs. ${entry.advanceReceived.toLocaleString()}%0A` +
      `*Remaining Balance: Rs. ${entry.balanceRemaining.toLocaleString()}*%0A%0A` +
      `Please clear the remaining balance at your earliest convenience.%0A%0A` +
      `*Contact:* ${CONTACT_INFO}%0A` +
      `Thank you for choosing *${APP_TITLE}*!`;
    
    const whatsappUrl = `https://wa.me/${entry.customerPhone.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const deleteLedgerEntry = (id: string) => {
    setLedger(ledger.filter((entry) => entry.id !== id));
    showNotification('Entry deleted');
  };

  const handlePrint = () => {
    setIsPreviewing(false);
    setTimeout(() => {
      window.focus();
      window.print();
    }, 300);
  };

  const filteredLedger = ledger.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      entry.customer.toLowerCase().includes(searchLower) || 
      (entry.customerPhone && entry.customerPhone.includes(searchTerm)) ||
      entry.invoiceNo.toLowerCase().includes(searchLower);
    
    if (!startDate && !endDate) return matchesSearch;
    
    const entryDate = new Date(entry.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    const matchesDate = (!start || entryDate >= start) && (!end || entryDate <= end);
    return matchesSearch && matchesDate;
  });

  const totalOutstanding = filteredLedger.reduce((sum, entry) => sum + entry.balanceRemaining, 0);
  const totalCollected = filteredLedger.reduce((sum, entry) => sum + entry.advanceReceived, 0);
  const totalBills = filteredLedger.length;

  // --- Render ---
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#34495e] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">System Locked</h1>
          <p className="text-gray-500 mb-8 font-medium">Powered by MOILA SOFT</p>
          
          <div className="mb-6">
            <input
              ref={passwordRef}
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-xl tracking-widest"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
          </div>
          
          <button
            onClick={handleUnlock}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 focus:ring-4 focus:ring-purple-200 outline-none"
          >
            <Lock size={20} />
            Unlock
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#34495e] p-4 md:p-8 print:bg-white print:p-0">
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 40, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className={`fixed top-0 left-1/2 z-[10000] px-8 py-4 rounded-xl shadow-2xl font-black text-white text-lg flex items-center gap-3 border-2 ${
              notification.type === 'success' ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'
            }`}
          >
            {notification.type === 'success' ? <Save size={24} /> : <X size={24} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800">Change Password</h2>
                <button onClick={() => setIsChangingPassword(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Update Password
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none print:rounded-none no-print">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 print:p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
                <Printer size={48} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-purple-800 tracking-tighter uppercase">{APP_TITLE}</h1>
                <p className="text-xl font-bold text-gray-600 tracking-widest">{APP_SUBTITLE}</p>
                <p className="text-lg font-semibold text-purple-700">{CONTACT_INFO}</p>
                <p className="text-sm font-medium text-gray-500">{ADDRESS}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <input
                ref={customerNameRef}
                type="text"
                placeholder="Customer Name"
                className="w-full md:w-64 px-4 py-2 border-b-2 border-purple-200 focus:border-purple-500 outline-none font-semibold"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                type="text"
                placeholder="WhatsApp Number (e.g. 923001234567)"
                className="w-full md:w-64 px-4 py-2 border-b-2 border-purple-200 focus:border-purple-500 outline-none text-sm"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <input
                type="date"
                className="w-full md:w-64 px-4 py-2 border-b-2 border-purple-200 focus:border-purple-500 outline-none text-gray-600"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="w-full md:w-64 px-4 py-2 border-b-2 border-purple-200 focus:border-purple-500 outline-none text-gray-600"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="p-6 overflow-x-auto print:p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-800 text-white">
                <th className="p-3 border border-purple-700 w-12 text-center">Sr#</th>
                <th className="p-3 border border-purple-700 min-w-[250px]">File Name</th>
                <th className="p-3 border border-purple-700 w-24 text-center">Width</th>
                <th className="p-3 border border-purple-700 w-24 text-center">Height</th>
                <th className="p-3 border border-purple-700 w-20 text-center">Qty</th>
                <th className="p-3 border border-purple-700 w-32 text-center">Quality</th>
                {showRate && <th className="p-3 border border-purple-700 w-24 text-center">Rate</th>}
                <th className="p-3 border border-purple-700 w-32 text-right">Total Area</th>
                <th className="p-3 border border-purple-700 w-32 text-right">Amount</th>
                <th className="p-3 border border-purple-700 w-12 text-center print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                  <td className="p-3 border border-gray-200 text-center font-medium">{index + 1}</td>
                  <td className="p-3 border border-gray-200">
                    <input
                      ref={index === items.length - 1 ? lastItemInputRef : null}
                      type="text"
                      className="w-full bg-transparent outline-none font-medium"
                      placeholder="Enter file name..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </td>
                  <td className="p-3 border border-gray-200">
                    <input
                      type="number"
                      className="w-full bg-transparent outline-none text-center"
                      value={item.width || ''}
                      onChange={(e) => updateItem(item.id, 'width', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-3 border border-gray-200">
                    <input
                      type="number"
                      className="w-full bg-transparent outline-none text-center"
                      value={item.height || ''}
                      onChange={(e) => updateItem(item.id, 'height', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-3 border border-gray-200">
                    <input
                      type="number"
                      className="w-full bg-transparent outline-none text-center"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-3 border border-gray-200">
                    <select
                      className="w-full bg-transparent outline-none text-center font-medium"
                      value={item.quality}
                      onChange={(e) => updateItem(item.id, 'quality', e.target.value)}
                    >
                      <option value="" disabled>Select Quality</option>
                      {QUALITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  {showRate && (
                    <td className="p-3 border border-gray-200">
                      <input
                        type="number"
                        className="w-full bg-transparent outline-none text-center font-bold"
                        value={item.rate || ''}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  )}
                  <td className="p-3 border border-gray-200 text-right">
                    {item.totalArea.toFixed(2)}
                  </td>
                  <td className="p-3 border border-gray-200 text-right font-bold">
                    Rs. {item.totalAmount.toLocaleString()}
                  </td>
                  <td className="p-3 border border-gray-200 text-center print:hidden">
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="text-red-500 hover:text-red-700 p-1 rounded-md focus:ring-2 focus:ring-red-200 outline-none"
                      title="Remove Row"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex gap-4 mt-4 print:hidden">
            <button
              onClick={addItem}
              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors focus:ring-4 focus:ring-purple-200 outline-none"
            >
              <Plus size={18} />
              Add New Row
            </button>
            <button
              onClick={() => setShowRate(!showRate)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors focus:ring-4 focus:ring-gray-100 outline-none font-bold"
            >
              {showRate ? <EyeOff size={18} /> : <Eye size={18} />}
              {showRate ? 'Hide Rate' : 'Show Rate'}
            </button>
          </div>
        </div>

        {/* Calculation Section */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 print:bg-white print:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="number"
                  placeholder="Design Charges"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={designCharges || ''}
                  onChange={(e) => setDesignCharges(parseFloat(e.target.value) || 0)}
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Other Charges Name"
                    className="flex-[2] px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    value={otherChargesName}
                    onChange={(e) => setOtherChargesName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    value={otherChargesAmount || ''}
                    onChange={(e) => setOtherChargesAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <input
                  type="number"
                  placeholder="Advance Received"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={advanceReceived || ''}
                  onChange={(e) => setAdvanceReceived(parseFloat(e.target.value) || 0)}
                />
                <select
                  className="min-w-[140px] px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-600 font-bold cursor-pointer relative z-10"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Online Wallet">Online Wallet</option>
                  <option value="Bank Account">Bank Account</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
                {paymentMethod === 'Other' && (
                  <input
                    type="text"
                    placeholder="Other Payment Description"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    value={otherPaymentDescription}
                    onChange={(e) => setOtherPaymentDescription(e.target.value)}
                  />
                )}
                <div className="flex items-center gap-2 print:hidden">
                  <input
                    type="radio"
                    id="fullPaymentRadio"
                    checked={advanceReceived === totalAmount && totalAmount > 0}
                    onChange={handleFullPayment}
                    className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <button
                    onClick={handleFullPayment}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap outline-none focus:ring-4 focus:ring-green-200"
                  >
                    Full Payment
                  </button>
                </div>
                <div className="flex items-center gap-2 print:hidden bg-white px-4 py-2 rounded-lg border border-gray-300">
                  <input
                    type="checkbox"
                    id="isPrintedCheckbox"
                    checked={isPrinted}
                    onChange={(e) => setIsPrinted(e.target.checked)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 cursor-pointer rounded"
                  />
                  <label htmlFor="isPrintedCheckbox" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                    Printed
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="uppercase font-bold text-xs mb-1">Total Area</p>
                  <p className="text-2xl font-black text-gray-800">{totalArea.toFixed(2)} <span className="text-sm font-normal text-gray-400">Sqft</span></p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="uppercase font-bold text-xs mb-1 text-purple-700">Total Amount</p>
                  <p className="text-2xl font-black text-purple-800">Rs. {totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="uppercase font-bold text-xs mb-1 text-green-700">Advance Received</p>
                  <p className="text-2xl font-black text-green-800">Rs. {advanceReceived.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="uppercase font-bold text-xs mb-1 text-red-700">Balance Remaining</p>
                  <p className="text-2xl font-black text-red-800">Rs. {balanceRemaining.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-4 print:hidden">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={saveToLedger}
                  className={`${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'} text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-green-200 outline-none`}
                >
                  <Save size={20} />
                  {editingId ? 'Update Invoice' : 'Save to Ledger'}
                </button>
                <button
                  onClick={() => setIsPreviewing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-blue-200 outline-none"
                >
                  <Printer size={20} />
                  Print Bill
                </button>
                <button
                  onClick={resetForm}
                  className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-orange-200 outline-none"
                >
                  <FilePlus size={20} />
                  New Bill
                </button>
                <div className="relative group">
                  <button
                    onClick={() => setIsLocked(true)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-yellow-200 outline-none"
                  >
                    <Lock size={20} />
                    Password
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsChangingPassword(true);
                    }}
                    className="absolute -top-2 -right-2 bg-white text-yellow-700 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-yellow-200 z-10"
                    title="Change Password"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 italic">Professional Billing System | Powered by MOILA SOFT</p>
            </div>
          </div>
        </div>

        {/* Ledger History Section */}
        <div className="p-6 border-t border-gray-200 no-print bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                  <FilePlus className="text-purple-600" />
                  Ledger History
                </h2>
                <p className="text-gray-500 font-medium">Manage your professional records and outstanding balances</p>
              </div>
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                title={showStats ? 'Hide Stats' : 'Show Stats'}
              >
                {showStats ? <EyeOff size={16} /> : <Eye size={16} />}
                {showStats ? 'Hide' : 'Stats'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <input
                  type="date"
                  className="px-3 py-2 outline-none text-xs font-bold text-gray-600 uppercase"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start Date"
                />
                <span className="text-gray-300">|</span>
                <input
                  type="date"
                  className="px-3 py-2 outline-none text-xs font-bold text-gray-600 uppercase"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End Date"
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, phone, or invoice..."
                  className="pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64 shadow-sm bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Professional Stats Summary */}
          <AnimatePresence>
            {showStats && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 p-6 rounded-2xl text-white shadow-xl shadow-purple-200/50 border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <TrendingUp size={120} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg shadow-inner"><TrendingUp size={24} /></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 bg-black/10 px-2 py-1 rounded">Total Sales</span>
                    </div>
                    <p className="text-3xl font-black relative z-10">Rs. {(totalCollected + totalOutstanding).toLocaleString()}</p>
                    <p className="text-xs opacity-70 mt-1 relative z-10 font-medium">From {totalBills} professional invoices</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-green-800 p-6 rounded-2xl text-white shadow-xl shadow-green-200/50 border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <CreditCard size={120} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg shadow-inner"><CreditCard size={24} /></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 bg-black/10 px-2 py-1 rounded">Collected</span>
                    </div>
                    <p className="text-3xl font-black relative z-10">Rs. {totalCollected.toLocaleString()}</p>
                    <p className="text-xs opacity-70 mt-1 relative z-10 font-medium">Total cash received</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-rose-500 via-red-600 to-red-800 p-6 rounded-2xl text-white shadow-xl shadow-red-200/50 border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <Users size={120} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg shadow-inner"><Users size={24} /></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 bg-black/10 px-2 py-1 rounded">Outstanding</span>
                    </div>
                    <p className="text-3xl font-black relative z-10">Rs. {totalOutstanding.toLocaleString()}</p>
                    <p className="text-xs opacity-70 mt-1 relative z-10 font-medium">Pending payments</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs font-black tracking-widest">
                  <th className="p-4 border-b border-gray-100">Inv #</th>
                  <th className="p-4 border-b border-gray-100">Date</th>
                  <th className="p-4 border-b border-gray-100">Customer</th>
                  <th className="p-4 border-b border-gray-100 text-right">Area</th>
                  <th className="p-4 border-b border-gray-100 text-right">Total</th>
                  <th className="p-4 border-b border-gray-100 text-right">Advance</th>
                  <th className="p-4 border-b border-gray-100 text-center">Print</th>
                  <th className="p-4 border-b border-gray-100 text-center">Status</th>
                  <th className="p-4 border-b border-gray-100 text-right">Balance</th>
                  <th className="p-4 border-b border-gray-100 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((entry) => {
                    const isPaid = entry.balanceRemaining === 0;
                    const isPartial = entry.balanceRemaining > 0 && entry.advanceReceived > 0;
                    
                    return (
                      <tr key={entry.id} className="hover:bg-purple-50/30 transition-colors group">
                        <td className="p-4 border-b border-gray-50 font-mono text-purple-700 font-bold">{entry.invoiceNo}</td>
                        <td className="p-4 border-b border-gray-50 text-gray-500">
                          <div className="font-medium">{entry.date}</div>
                          <div className="text-[10px] opacity-70">{entry.time}</div>
                        </td>
                        <td className="p-4 border-b border-gray-50 font-bold text-gray-800">
                          <button 
                            onClick={() => viewLedgerEntry(entry)}
                            className="hover:text-purple-700 transition-colors text-left"
                          >
                            {entry.customer}
                          </button>
                          <div className="text-[10px] text-gray-400 font-normal">{entry.items[0]?.description || 'No File'} [{entry.items[0]?.quality || 'Standard'}] {entry.items.length > 1 ? `(+${entry.items.length - 1} more)` : ''}</div>
                          <div className="text-[10px] text-purple-400 font-normal">{entry.paymentMethod}{entry.paymentMethod === 'Other' && entry.otherPaymentDescription ? ` (${entry.otherPaymentDescription})` : ''}</div>
                        </td>
                        <td className="p-4 border-b border-gray-50 text-right text-gray-600">{entry.totalArea.toFixed(2)}</td>
                        <td className="p-4 border-b border-gray-50 text-right font-bold">Rs. {entry.totalAmount.toLocaleString()}</td>
                        <td className="p-4 border-b border-gray-50 text-right text-green-600 font-medium">Rs. {entry.advanceReceived.toLocaleString()}</td>
                        <td className="p-4 border-b border-gray-50 text-center">
                          <button 
                            onClick={() => togglePrintStatus(entry.id)}
                            className={`p-2 rounded-lg transition-colors ${entry.isPrinted ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-400'}`}
                            title={entry.isPrinted ? 'Mark as Pending' : 'Mark as Printed'}
                          >
                            <Printer size={18} />
                          </button>
                        </td>
                        <td className="p-4 border-b border-gray-50 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            isPaid ? 'bg-green-100 text-green-700' : 
                            isPartial ? 'bg-orange-100 text-orange-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td className={`p-4 border-b border-gray-50 text-right font-black ${entry.balanceRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Rs. {entry.balanceRemaining.toLocaleString()}
                        </td>
                        <td className="p-4 border-b border-gray-50 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => sendWhatsAppAlert(entry)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Send WhatsApp Alert"
                            >
                              <MessageCircle size={18} />
                            </button>
                            <button
                              onClick={() => loadLedgerEntry(entry)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Invoice"
                            >
                              <Pencil size={18} />
                            </button>
                            {entry.balanceRemaining > 0 && (
                              <button
                                onClick={() => collectBalance(entry.id)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Collect Full Balance"
                              >
                                <DollarSign size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteLedgerEntry(entry.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400 italic">
                      <div className="flex flex-col items-center gap-2">
                        <FilePlus size={48} className="opacity-20" />
                        <p>No professional records found matching your search</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hidden Print Template / Preview Modal */}
      <div id="print-area" className={`print-only bg-white ${isPreviewing ? 'preview-mode' : ''}`}>
        {isPreviewing && (
          <div className="no-print fixed top-4 right-4 flex gap-4">
            <button 
              onClick={() => downloadPDF('print-content', `Invoice-${customerName || 'Customer'}`)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
            >
              <Download size={20} /> Save PDF
            </button>
            <button 
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
            >
              <Printer size={20} /> Confirm Print
            </button>
            <button 
              onClick={() => setIsPreviewing(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
            >
              <X size={20} /> Close Preview
            </button>
          </div>
        )}
        <div id="print-content" className={`p-8 max-w-[800px] mx-auto border-2 border-gray-300 ${isPreviewing ? 'bg-white my-8 shadow-2xl rounded-lg' : ''}`}>
          <div className="flex items-center gap-6 mb-8 border-b-4 border-purple-800 pb-6">
            <div className="w-24 h-24 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
              <Printer size={64} />
            </div>
            <div>
              <h1 className="text-5xl font-black text-purple-800 tracking-tighter uppercase">{APP_TITLE}</h1>
              <p className="text-2xl font-bold text-gray-600 tracking-widest">{APP_SUBTITLE}</p>
              <p className="text-xl font-semibold text-purple-700">{CONTACT_INFO}</p>
              <p className="text-sm font-medium text-gray-500">{ADDRESS}</p>
            </div>
          </div>

          <div className="flex justify-between mb-8 text-lg">
            <div>
              <p className="text-gray-500 uppercase font-bold text-xs">Customer</p>
              <p className="font-bold text-2xl">{customerName || 'Cash Customer'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 uppercase font-bold text-xs">Payment Mode</p>
              <p className="font-bold text-xl">{paymentMethod}{paymentMethod === 'Other' && otherPaymentDescription ? ` (${otherPaymentDescription})` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 uppercase font-bold text-xs">Date & Time</p>
              <p className="font-bold text-xl">{date}</p>
              <p className="font-bold text-sm text-gray-600">{time}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-8">
            <thead>
              <tr className="bg-purple-800 text-white">
                <th className="p-3 border border-purple-700 w-12 text-center">Sr#</th>
                <th className="p-3 border border-purple-700">File Name</th>
                <th className="p-3 border border-purple-700 w-24 text-center">W</th>
                <th className="p-3 border border-purple-700 w-24 text-center">H</th>
                <th className="p-3 border border-purple-700 w-20 text-center">Qty</th>
                <th className="p-3 border border-purple-700 w-24 text-center">Quality</th>
                {showRate && <th className="p-3 border border-purple-700 w-24 text-center">Rate</th>}
                <th className="p-3 border border-purple-700 w-32 text-right">Area</th>
                <th className="p-3 border border-purple-700 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="p-3 border border-gray-300 text-center">{index + 1}</td>
                  <td className="p-3 border border-gray-300 font-medium">{item.description}</td>
                  <td className="p-3 border border-gray-300 text-center">{item.width}</td>
                  <td className="p-3 border border-gray-300 text-center">{item.height}</td>
                  <td className="p-3 border border-gray-300 text-center">{item.qty}</td>
                  <td className="p-3 border border-gray-300 text-center">{item.quality}</td>
                  {showRate && <td className="p-3 border border-gray-300 text-right font-bold">Rs. {item.rate}</td>}
                  <td className="p-3 border border-gray-300 text-right font-bold">{item.totalArea.toFixed(2)}</td>
                  <td className="p-3 border border-gray-300 text-right font-bold">Rs. {item.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Total Area:</span>
                <span className="font-bold">{totalArea.toFixed(2)} Sqft</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Design Charges:</span>
                <span className="font-bold">Rs. {designCharges}</span>
              </div>
              {otherChargesAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{otherChargesName || 'Other Charges'}:</span>
                  <span className="font-bold">Rs. {otherChargesAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-purple-800 border-t-2 border-purple-200 pt-2">
                <span>Total Amount:</span>
                <span>Rs. {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold">
                <span>Advance Received:</span>
                <span>Rs. {advanceReceived.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-700 font-black text-xl border-t border-gray-200 pt-2">
                <span>Balance Remaining:</span>
                <span>Rs. {balanceRemaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-20 flex justify-between items-end">
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-500">Customer Signature</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-500">Authorized Signature</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <p className="italic font-medium">Thank you for choosing {APP_TITLE}! We appreciate your business.</p>
            <div className="flex gap-4">
              <span className="page-number"></span>
              <span>Powered by MOILA SOFT</span>
            </div>
          </div>
        </div>
      </div>
      {/* View Entry Modal */}
      <AnimatePresence>
        {viewingEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-800 rounded-lg flex items-center justify-center text-white">
                    <Printer size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-purple-800 tracking-tight">{APP_TITLE}</h2>
                    <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">{APP_SUBTITLE}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Invoice No</p>
                    <p className="text-sm font-black text-purple-800">{viewingEntry.invoiceNo}</p>
                  </div>
                  <button 
                    onClick={() => setViewingEntry(null)}
                    className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500"
                    title="Exit View"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8" id="view-modal-content">
                <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8 border-b border-gray-100 pb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Customer Details</p>
                    <p className="text-xl font-bold text-gray-800">{viewingEntry.customer}</p>
                    {viewingEntry.customerPhone && (
                      <p className="text-sm text-purple-600 font-medium">{viewingEntry.customerPhone}</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Company Info</p>
                    <p className="text-sm font-bold text-gray-800">{APP_TITLE}</p>
                    <p className="text-xs text-gray-500">{CONTACT_INFO}</p>
                    <p className="text-xs text-gray-500">{ADDRESS}</p>
                    <p className="text-xs text-purple-700 font-bold mt-1">Date: {viewingEntry.date}</p>
                    <p className="text-xs text-purple-700 font-bold">Time: {viewingEntry.time}</p>
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden mb-8">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        <th className="p-4 border-b">Item</th>
                        <th className="p-4 border-b text-center">Size</th>
                        <th className="p-4 border-b text-center">Qty</th>
                        {showRate && <th className="p-4 border-b text-center">Rate</th>}
                        <th className="p-4 border-b text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingEntry.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0">
                          <td className="p-4">
                            <p className="font-bold text-gray-800">{item.description}</p>
                            <p className="text-[10px] text-purple-600 font-bold uppercase">{item.quality}</p>
                          </td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">
                            {item.width}x{item.height}
                          </td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">
                            {item.qty}
                          </td>
                          {showRate && (
                            <td className="p-4 text-center text-sm text-gray-600 font-medium">
                              Rs. {item.rate}
                            </td>
                          )}
                          <td className="p-4 text-right font-bold text-gray-800">
                            Rs. {item.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-purple-50 p-6 rounded-2xl">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-purple-700 font-medium">Design Charges:</span>
                      <span className="text-sm font-bold">Rs. {viewingEntry.designCharges}</span>
                    </div>
                    {viewingEntry.otherChargesAmount > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-purple-700 font-medium">{viewingEntry.otherChargesName || 'Other Charges'}:</span>
                        <span className="text-sm font-bold">Rs. {viewingEntry.otherChargesAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-purple-700 font-medium">Total Area:</span>
                      <span className="text-sm font-bold">{viewingEntry.totalArea.toFixed(2)} Sqft</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-purple-700 font-medium">Payment Mode:</span>
                      <span className="text-sm font-bold">{viewingEntry.paymentMethod}{viewingEntry.paymentMethod === 'Other' && viewingEntry.otherPaymentDescription ? ` (${viewingEntry.otherPaymentDescription})` : ''}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-200">
                      <span className="text-lg font-black text-purple-800">Total:</span>
                      <span className="text-lg font-black text-purple-800">Rs. {viewingEntry.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl flex flex-col justify-center">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 font-medium">Advance:</span>
                      <span className="text-sm font-bold text-green-600">Rs. {viewingEntry.advanceReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-lg font-black text-gray-800">Balance:</span>
                      <span className="text-lg font-black text-red-600">Rs. {viewingEntry.balanceRemaining.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
                <button 
                  onClick={() => sendWhatsAppAlert(viewingEntry)}
                  className="flex-1 min-w-[140px] bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <MessageCircle size={20} /> WhatsApp
                </button>
                <button 
                  onClick={() => {
                    setViewingEntry(null);
                    loadLedgerEntry(viewingEntry);
                    setTimeout(() => setIsPreviewing(true), 300);
                  }}
                  className="flex-1 min-w-[140px] bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Printer size={20} /> Print
                </button>
                <button 
                  onClick={() => downloadPDF('view-modal-content', `Invoice-${viewingEntry.invoiceNo}`)}
                  className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Download size={20} /> PDF
                </button>
                <button 
                  onClick={() => setViewingEntry(null)}
                  className="flex-1 min-w-[140px] bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <X size={20} /> Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
