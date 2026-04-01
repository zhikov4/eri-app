import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Props = {
  route: any;
  navigation: any;
};

type Task = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_country: string | null;
  project_title: string;
  budget: number | null;
  currency: string;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
};

const PAYMENT_METHODS = [
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
  { id: 'qris', name: 'QRIS', icon: '📱' },
  { id: 'paypal', name: 'PayPal', icon: '💰' },
];

const DELIVERY_CHANNELS = [
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'wa', name: 'WhatsApp', icon: '💬' },
  { id: 'paypal', name: 'PayPal', icon: '💰' },
  { id: 'link', name: 'Shareable Link', icon: '🔗' },
];

export const InvoiceBuilderScreen = ({ route, navigation }: Props) => {
  const { taskId } = route.params;
  const user = useERIStore((state) => state.user);
  const userTier = useERIStore((state) => state.user?.tier || 'free');
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [monthlyInvoiceCount, setMonthlyInvoiceCount] = useState(0);
  
  // Step 1: Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCountry, setClientCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, price: 0, subtotal: 0 },
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [dueDays, setDueDays] = useState(14);
  
  // Step 2: Payment & Delivery
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedDeliveryChannels, setSelectedDeliveryChannels] = useState<string[]>([]);
  
  // Step 4: Sending
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadTask();
    generateInvoiceNumber();
    checkMonthlyInvoiceLimit();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [items, taxPct]);

  const checkMonthlyInvoiceLimit = async () => {
    if (userTier !== 'free') return;
    
    try {
      const db = await getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartTimestamp = Math.floor(monthStart.getTime() / 1000);
      
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM invoices 
         WHERE user_id = ? AND created_at >= ? AND status != 'cancelled'`,
        [user?.id, monthStartTimestamp]
      );
      
      const count = result?.count || 0;
      setMonthlyInvoiceCount(count);
      
      if (count >= 2) {
        Alert.alert(
          'Monthly Limit Reached',
          'Free users can create up to 2 invoices per month. Upgrade to Pro for unlimited invoices.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking invoice limit:', error);
    }
  };

  const loadTask = async () => {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<Task>(
        `SELECT id, client_name, client_email, client_phone, client_address, client_country, project_title, budget, currency
         FROM tasks WHERE id = ?`,
        [taskId]
      );
      
      if (result) {
        setTask(result);
        setClientName(result.client_name || '');
        setClientEmail(result.client_email || '');
        setClientPhone(result.client_phone || '');
        setClientAddress(result.client_address || '');
        setClientCountry(result.client_country || '');
        
        // Auto-detect currency based on client country (PDF Chapter 11.2)
        const isIndonesia = result.client_country?.toLowerCase().includes('indonesia') ||
                           result.client_country?.toLowerCase() === 'id';
        
        if (isIndonesia) {
          setCurrency('IDR');
          setSelectedPaymentMethods(['bank', 'qris']);
          setSelectedDeliveryChannels(['wa', 'email']);
        } else if (result.client_country && result.client_country.trim() !== '') {
          setCurrency('USD');
          setSelectedPaymentMethods(['paypal']);
          setSelectedDeliveryChannels(['paypal', 'email']);
        } else {
          setCurrency(result.currency === 'IDR' ? 'IDR' : 'USD');
        }
        
        // Auto-fill items from task budget
        if (result.budget && result.budget > 0) {
          setItems([
            {
              id: '1',
              description: result.project_title,
              quantity: 1,
              price: result.budget,
              subtotal: result.budget,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setInvoiceNumber(`INV-${year}-${random}`);
  };

  const calculateTotals = () => {
    const newSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal);
    const newTaxAmount = newSubtotal * (taxPct / 100);
    setTaxAmount(newTaxAmount);
    setTotal(newSubtotal + newTaxAmount);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updated.subtotal = updated.quantity * updated.price;
        }
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, { id: newId, description: '', quantity: 1, price: 0, subtotal: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId) ? prev.filter(m => m !== methodId) : [...prev, methodId]
    );
  };

  const toggleDeliveryChannel = (channelId: string) => {
    setSelectedDeliveryChannels(prev =>
      prev.includes(channelId) ? prev.filter(c => c !== channelId) : [...prev, channelId]
    );
  };

  const validateStep1 = (): boolean => {
    if (userTier === 'free' && monthlyInvoiceCount >= 2) {
      Alert.alert('Limit Reached', 'Free users can create up to 2 invoices per month. Upgrade to Pro.');
      return false;
    }
    if (!clientName.trim()) {
      Alert.alert('Missing Info', 'Client name is required');
      return false;
    }
    if (!clientEmail.trim() && !clientPhone.trim()) {
      Alert.alert('Missing Info', 'Client email or phone is required for delivery');
      return false;
    }
    if (items.some(item => !item.description.trim() || item.price <= 0)) {
      Alert.alert('Missing Info', 'All invoice items must have description and price');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (selectedDeliveryChannels.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one delivery channel');
      return false;
    }
    if (selectedDeliveryChannels.includes('email') && !clientEmail.trim()) {
      Alert.alert('Missing Info', 'Client email is required for email delivery');
      return false;
    }
    if (selectedDeliveryChannels.includes('wa') && !clientPhone.trim()) {
      Alert.alert('Missing Info', 'Client phone is required for WhatsApp delivery');
      return false;
    }
    return true;
  };

  const handleSendInvoice = async () => {
    setSending(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = [];
      
      if (selectedDeliveryChannels.includes('email') && clientEmail) {
        results.push('📧 Email sent to ' + clientEmail);
      }
      
      if (selectedDeliveryChannels.includes('wa') && clientPhone) {
        const waMessage = `Halo ${clientName},\n\nInvoice ${invoiceNumber} untuk ${items[0]?.description || 'project'} sebesar ${currency === 'IDR' ? 'Rp ' + total.toLocaleString('id-ID') : '$' + total.toFixed(2)}.\n\nTerima kasih!`;
        const waUrl = `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`;
        await Linking.openURL(waUrl);
        results.push('💬 WhatsApp message prepared');
      }
      
      if (selectedDeliveryChannels.includes('paypal')) {
        results.push('💰 PayPal invoice will be sent via backend');
      }
      
      if (selectedDeliveryChannels.includes('link')) {
        const shareableLink = `eri.app/i/${Math.random().toString(36).substr(2, 8)}`;
        results.push(`🔗 Shareable link: ${shareableLink}`);
      }
      
      setSendResult({ success: true, message: results.join('\n') });
      
      const db = await getDatabase();
      const now = Math.floor(Date.now() / 1000);
      await db.runAsync(
        `INSERT INTO invoices (
          id, user_id, task_id, invoice_number, status,
          client_name, client_email, client_phone, client_address, client_country,
          items_json, subtotal, tax_pct, tax_amount, total, currency,
          due_date, notes, language, payment_methods_json, delivery_channels_json,
          has_watermark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Math.random().toString(36).substr(2, 9),
          user?.id,
          taskId,
          invoiceNumber,
          'sent',
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          clientCountry,
          JSON.stringify(items),
          subtotal,
          taxPct,
          taxAmount,
          total,
          currency,
          Math.floor(Date.now() / 1000) + (dueDays * 24 * 60 * 60),
          notes,
          currency === 'IDR' ? 'id' : 'en',
          JSON.stringify(selectedPaymentMethods),
          JSON.stringify(selectedDeliveryChannels),
          userTier === 'free' ? 1 : 0,
          now,
          now
        ]
      );
      
      setStep(4);
    } catch (error) {
      console.error('Error sending invoice:', error);
      setSendResult({ success: false, message: 'Failed to send invoice. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  // Rest of the render functions remain the same (renderStep1, renderStep2, etc.)
  // ... (keep the existing renderStep1, renderStep2, renderStep3, renderStep4 functions from your current file)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Loading task data...</Text>
      </View>
    );
  }

  // Check limit before showing the form
  if (userTier === 'free' && monthlyInvoiceCount >= 2 && step === 1) {
    return (
      <View style={styles.centered}>
        <Text style={styles.resultIcon}>📄</Text>
        <Text style={styles.resultTitle}>Monthly Limit Reached</Text>
        <Text style={styles.resultMessage}>
          Free users can create up to 2 invoices per month.{'\n\n'}
          Upgrade to Pro for unlimited invoices, no watermark, and more features.
        </Text>
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, { marginTop: 24, width: '80%' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.nextButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Free tier limit indicator */}
      {userTier === 'free' && (
        <View style={styles.limitIndicator}>
          <Text style={styles.limitText}>
            Free: {monthlyInvoiceCount}/2 invoices this month
          </Text>
        </View>
      )}
      
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
        </View>
        <View style={[styles.stepLine, step >= 4 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 4 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 4 && styles.stepDotTextActive]}>4</Text>
        </View>
      </View>
      <Text style={styles.stepLabel}>
        {step === 1 && 'Invoice Details'}
        {step === 2 && 'Payment & Delivery'}
        {step === 3 && 'Preview'}
        {step === 4 && 'Result'}
      </Text>
      
      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: SPACING?.md || 16,
    paddingHorizontal: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backButtonText: { fontSize: 28, color: COLORS.primary || '#6366F1' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    textAlign: 'center',
  },
  placeholder: { width: 40 },
  limitIndicator: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: SPACING?.md || 16,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 12,
    color: COLORS.primary || '#6366F1',
    fontWeight: '500',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING?.lg || 24,
    paddingVertical: SPACING?.md || 16,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary || '#6366F1',
    borderColor: COLORS.primary || '#6366F1',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: COLORS.border || '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: COLORS.primary || '#6366F1' },
  stepLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
    marginBottom: SPACING?.md || 16,
  },
  stepContent: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: 40,
  },
  bottomSpacer: { height: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    marginTop: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.xs || 8,
    marginTop: SPACING?.sm || 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.sm || 12,
    fontSize: 15,
    color: COLORS.text || '#111827',
    backgroundColor: COLORS.surface || '#FFFFFF',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING?.sm || 12 },
  rowItem: { flex: 1 },
  itemCard: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.md || 8,
    padding: SPACING?.sm || 12,
    marginBottom: SPACING?.sm || 12,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.sm || 12,
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text || '#111827' },
  removeItemText: { fontSize: 12, color: COLORS.danger || '#EF4444' },
  itemSubtotal: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary || '#6366F1',
    textAlign: 'right',
    marginTop: SPACING?.xs || 8,
  },
  addItemButton: {
    paddingVertical: SPACING?.sm || 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary || '#6366F1',
    borderRadius: RADIUS?.md || 8,
    borderStyle: 'dashed',
    marginBottom: SPACING?.md || 16,
  },
  addItemButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary || '#6366F1' },
  totalsCard: {
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    borderRadius: RADIUS?.md || 8,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.md || 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.xs || 8,
  },
  totalsLabel: { fontSize: 14, color: COLORS.textMuted || '#6B7280' },
  totalsValue: { fontSize: 14, fontWeight: '500', color: COLORS.text || '#111827' },
  taxInput: {
    width: 80,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.sm || 6,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: 4,
    textAlign: 'right',
    fontSize: 14,
    color: COLORS.text || '#111827',
  },
  totalRow: {
    marginTop: SPACING?.sm || 12,
    paddingTop: SPACING?.sm || 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#E5E7EB',
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text || '#111827' },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary || '#6366F1' },
  currencyContainer: { flexDirection: 'row', gap: SPACING?.xs || 8 },
  currencyOption: {
    flex: 1,
    paddingVertical: SPACING?.sm || 12,
    alignItems: 'center',
    borderRadius: RADIUS?.md || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    backgroundColor: COLORS.surface || '#FFFFFF',
  },
  currencyOptionActive: {
    borderColor: COLORS.primary || '#6366F1',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
  },
  currencyText: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted || '#6B7280' },
  currencyTextActive: { color: COLORS.primary || '#6366F1' },
  hint: { fontSize: 12, color: COLORS.textMuted || '#6B7280', marginBottom: SPACING?.sm || 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.md || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    marginBottom: SPACING?.sm || 12,
  },
  optionCardActive: {
    borderColor: COLORS.primary || '#6366F1',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
  },
  optionIcon: { fontSize: 28, marginRight: SPACING?.sm || 12 },
  optionInfo: { flex: 1 },
  optionName: { fontSize: 15, fontWeight: '600', color: COLORS.text || '#111827' },
  optionDesc: { fontSize: 12, color: COLORS.textMuted || '#6B7280', marginTop: 2 },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckActive: {
    backgroundColor: COLORS.primary || '#6366F1',
    borderColor: COLORS.primary || '#6366F1',
  },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: SPACING?.sm || 12, marginTop: SPACING?.lg || 24, marginBottom: SPACING?.xl || 32 },
  navButton: { flex: 1, paddingVertical: SPACING?.md || 16, borderRadius: RADIUS?.md || 8, alignItems: 'center' },
  nextButton: { backgroundColor: COLORS.primary || '#6366F1' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  backButtonStyle: { backgroundColor: COLORS.surfaceHighlight || '#F3F4F6' },
  backButtonTextStyle: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted || '#6B7280' },
  sendButton: { backgroundColor: COLORS.success || '#10B981', flex: 1, paddingVertical: SPACING?.md || 16, borderRadius: RADIUS?.md || 8, alignItems: 'center' },
  sendButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  doneButton: { backgroundColor: COLORS.primary || '#6366F1', marginHorizontal: SPACING?.md || 16, marginTop: SPACING?.lg || 24 },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  previewHeader: { marginBottom: SPACING?.md || 16 },
  previewTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text || '#111827' },
  previewHint: { fontSize: 12, color: COLORS.textMuted || '#6B7280' },
  previewCard: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.lg || 24,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  previewInvoiceNumber: { fontSize: 12, color: COLORS.textMuted || '#6B7280', textAlign: 'center', marginBottom: SPACING?.sm || 12 },
  previewDivider: { height: 1, backgroundColor: COLORS.border || '#E5E7EB', marginVertical: SPACING?.md || 16 },
  previewRow: { flexDirection: 'row' },
  previewLabel: { width: 80, fontSize: 14, fontWeight: '600', color: COLORS.textMuted || '#6B7280' },
  previewClientInfo: { flex: 1 },
  previewClientName: { fontSize: 14, fontWeight: '600', color: COLORS.text || '#111827' },
  previewClientDetail: { fontSize: 12, color: COLORS.textMuted || '#6B7280', marginTop: 2 },
  previewItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING?.sm || 12 },
  previewItemInfo: { flex: 1 },
  previewItemDesc: { fontSize: 14, fontWeight: '500', color: COLORS.text || '#111827' },
  previewItemQty: { fontSize: 12, color: COLORS.textMuted || '#6B7280' },
  previewItemPrice: { fontSize: 14, fontWeight: '500', color: COLORS.text || '#111827' },
  previewTotals: { marginTop: SPACING?.sm || 12 },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING?.xs || 8 },
  previewGrandTotal: { marginTop: SPACING?.sm || 12, paddingTop: SPACING?.sm || 12, borderTopWidth: 1, borderTopColor: COLORS.border || '#E5E7EB' },
  previewGrandTotalText: { fontSize: 16, fontWeight: '700', color: COLORS.text || '#111827' },
  previewGrandTotalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary || '#6366F1' },
  previewNotes: { fontSize: 12, color: COLORS.textMuted || '#6B7280', fontStyle: 'italic' },
  watermark: { textAlign: 'center', fontSize: 9, color: '#AAAAAA', marginTop: SPACING?.lg || 24 },
  resultCard: { alignItems: 'center', paddingVertical: SPACING?.xl || 48, paddingHorizontal: SPACING?.lg || 24 },
  resultIcon: { fontSize: 64, marginBottom: SPACING?.md || 16 },
  resultTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text || '#111827', marginBottom: SPACING?.sm || 12 },
  resultMessage: { fontSize: 14, color: COLORS.textMuted || '#6B7280', textAlign: 'center', marginTop: SPACING?.sm || 12 },
});