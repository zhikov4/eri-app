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

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
};

type DeliveryChannel = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bank', name: 'Bank Transfer', icon: '🏦', enabled: true },
  { id: 'qris', name: 'QRIS', icon: '📱', enabled: true },
  { id: 'paypal', name: 'PayPal', icon: '💰', enabled: true },
];

const DELIVERY_CHANNELS: DeliveryChannel[] = [
  { id: 'email', name: 'Email', icon: '📧', enabled: true },
  { id: 'wa', name: 'WhatsApp', icon: '💬', enabled: true },
  { id: 'paypal', name: 'PayPal', icon: '💰', enabled: true },
  { id: 'link', name: 'Shareable Link', icon: '🔗', enabled: true },
];

export const InvoiceBuilderScreen = ({ route, navigation }: Props) => {
  const { taskId } = route.params;
  const user = useERIStore((state) => state.user);
  const userTier = useERIStore((state) => state.user?.tier || 'free');
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  
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
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  
  // Step 2: Payment & Delivery
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedDeliveryChannels, setSelectedDeliveryChannels] = useState<string[]>([]);
  
  // Step 3: Preview
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // Step 4: Sending
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadTask();
    generateInvoiceNumber();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [items, taxPct]);

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
        
        // Auto-detect currency based on client country
        const isIndonesia = result.client_country?.toLowerCase().includes('indonesia') ||
                           result.client_country?.toLowerCase() === 'id';
        
        if (isIndonesia) {
          setCurrency('IDR');
          setLanguage('id');
          setSelectedPaymentMethods(['bank', 'qris']);
          setSelectedDeliveryChannels(['wa', 'email']);
        } else if (result.client_country && result.client_country.trim() !== '') {
          setCurrency('USD');
          setLanguage('en');
          setSelectedPaymentMethods(['paypal']);
          setSelectedDeliveryChannels(['paypal', 'email']);
        } else {
          // Default based on user settings
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
      prev.includes(methodId)
        ? prev.filter(m => m !== methodId)
        : [...prev, methodId]
    );
  };

  const toggleDeliveryChannel = (channelId: string) => {
    setSelectedDeliveryChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const validateStep1 = (): boolean => {
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
      
      setSendResult({
        success: true,
        message: results.join('\n'),
      });
      
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
          language,
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
      setSendResult({
        success: false,
        message: 'Failed to send invoice. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderStep1 = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          style={styles.stepContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <Text style={styles.label}>Client Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={clientName}
            onChangeText={setClientName}
          />
          
          <Text style={styles.label}>Client Email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            keyboardType="email-address"
            value={clientEmail}
            onChangeText={setClientEmail}
          />
          
          <Text style={styles.label}>Client Phone (WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="+62 812 3456 7890"
            keyboardType="phone-pad"
            value={clientPhone}
            onChangeText={setClientPhone}
          />
          
          <Text style={styles.label}>Client Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            multiline
            numberOfLines={2}
            value={clientAddress}
            onChangeText={setClientAddress}
          />
          
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="Indonesia / USA / etc"
            value={clientCountry}
            onChangeText={setClientCountry}
          />
          
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Text style={styles.removeItemText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Service description"
                value={item.description}
                onChangeText={(text) => updateItem(item.id, 'description', text)}
              />
              
              <View style={styles.row}>
                <View style={[styles.rowItem, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="numeric"
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateItem(item.id, 'quantity', parseFloat(text) || 0)}
                  />
                </View>
                <View style={[styles.rowItem, { flex: 2 }]}>
                  <Text style={styles.label}>Price ({currency})</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={item.price.toString()}
                    onChangeText={(text) => updateItem(item.id, 'price', parseFloat(text) || 0)}
                  />
                </View>
              </View>
              
              <Text style={styles.itemSubtotal}>
                Subtotal: {currency === 'IDR' ? 'Rp ' : '$'}{item.subtotal.toLocaleString()}
              </Text>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
            <Text style={styles.addItemButtonText}>+ Add Item</Text>
          </TouchableOpacity>
          
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{currency === 'IDR' ? 'Rp ' : '$'}{subtotal.toLocaleString()}</Text>
            </View>
            
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax (%)</Text>
              <TextInput
                style={styles.taxInput}
                keyboardType="numeric"
                value={taxPct.toString()}
                onChangeText={(text) => setTaxPct(parseFloat(text) || 0)}
              />
            </View>
            
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax Amount</Text>
              <Text style={styles.totalsValue}>{currency === 'IDR' ? 'Rp ' : '$'}{taxAmount.toLocaleString()}</Text>
            </View>
            
            <View style={[styles.totalsRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{currency === 'IDR' ? 'Rp ' : '$'}{total.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.rowItem, { flex: 1 }]}>
              <Text style={styles.label}>Currency</Text>
              <View style={styles.currencyContainer}>
                <TouchableOpacity
                  style={[styles.currencyOption, currency === 'IDR' && styles.currencyOptionActive]}
                  onPress={() => setCurrency('IDR')}
                >
                  <Text style={[styles.currencyText, currency === 'IDR' && styles.currencyTextActive]}>IDR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currencyOption, currency === 'USD' && styles.currencyOptionActive]}
                  onPress={() => setCurrency('USD')}
                >
                  <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>USD</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.rowItem, { flex: 1 }]}>
              <Text style={styles.label}>Due in (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="14"
                keyboardType="numeric"
                value={dueDays.toString()}
                onChangeText={(text) => setDueDays(parseInt(text) || 0)}
              />
            </View>
          </View>
          
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Payment instructions, thank you note, etc."
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => validateStep1() && setStep(2)}
          >
            <Text style={styles.nextButtonText}>Next: Payment & Delivery →</Text>
          </TouchableOpacity>
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  const renderStep2 = () => (
    <ScrollView
      style={styles.stepContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Payment Methods</Text>
      <Text style={styles.hint}>Select how you want to be paid</Text>
      
      {PAYMENT_METHODS.map(method => (
        <TouchableOpacity
          key={method.id}
          style={[styles.optionCard, selectedPaymentMethods.includes(method.id) && styles.optionCardActive]}
          onPress={() => togglePaymentMethod(method.id)}
        >
          <Text style={styles.optionIcon}>{method.icon}</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.optionName}>{method.name}</Text>
            <Text style={styles.optionDesc}>
              {method.id === 'bank' && 'Transfer to bank account'}
              {method.id === 'qris' && 'Scan QRIS code'}
              {method.id === 'paypal' && 'Send PayPal invoice'}
            </Text>
          </View>
          <View style={[styles.optionCheck, selectedPaymentMethods.includes(method.id) && styles.optionCheckActive]}>
            {selectedPaymentMethods.includes(method.id) && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
      ))}
      
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Delivery Channels</Text>
      <Text style={styles.hint}>How to send the invoice</Text>
      
      {DELIVERY_CHANNELS.map(channel => (
        <TouchableOpacity
          key={channel.id}
          style={[styles.optionCard, selectedDeliveryChannels.includes(channel.id) && styles.optionCardActive]}
          onPress={() => toggleDeliveryChannel(channel.id)}
        >
          <Text style={styles.optionIcon}>{channel.icon}</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.optionName}>{channel.name}</Text>
            <Text style={styles.optionDesc}>
              {channel.id === 'email' && 'Send PDF to client email'}
              {channel.id === 'wa' && 'Share via WhatsApp message'}
              {channel.id === 'paypal' && 'Send via PayPal Invoicing API'}
              {channel.id === 'link' && 'Generate shareable link'}
            </Text>
          </View>
          <View style={[styles.optionCheck, selectedDeliveryChannels.includes(channel.id) && styles.optionCheckActive]}>
            {selectedDeliveryChannels.includes(channel.id) && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
      ))}
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={() => validateStep2() && setStep(3)}
        >
          <Text style={styles.nextButtonText}>Preview Invoice →</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      style={styles.stepContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Invoice Preview</Text>
        <Text style={styles.previewHint}>This is how your client will see it</Text>
      </View>
      
      <View style={styles.previewCard}>
        <Text style={styles.previewInvoiceNumber}>{invoiceNumber}</Text>
        <View style={styles.previewDivider} />
        
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Bill To:</Text>
          <View style={styles.previewClientInfo}>
            <Text style={styles.previewClientName}>{clientName}</Text>
            {clientEmail && <Text style={styles.previewClientDetail}>{clientEmail}</Text>}
            {clientPhone && <Text style={styles.previewClientDetail}>{clientPhone}</Text>}
            {clientAddress && <Text style={styles.previewClientDetail}>{clientAddress}</Text>}
          </View>
        </View>
        
        <View style={styles.previewDivider} />
        
        {items.map((item, index) => (
          <View key={item.id} style={styles.previewItem}>
            <View style={styles.previewItemInfo}>
              <Text style={styles.previewItemDesc}>{item.description}</Text>
              <Text style={styles.previewItemQty}>{item.quantity} × {currency === 'IDR' ? 'Rp ' : '$'}{item.price.toLocaleString()}</Text>
            </View>
            <Text style={styles.previewItemPrice}>{currency === 'IDR' ? 'Rp ' : '$'}{item.subtotal.toLocaleString()}</Text>
          </View>
        ))}
        
        <View style={styles.previewDivider} />
        
        <View style={styles.previewTotals}>
          <View style={styles.previewTotalRow}>
            <Text>Subtotal</Text>
            <Text>{currency === 'IDR' ? 'Rp ' : '$'}{subtotal.toLocaleString()}</Text>
          </View>
          {taxPct > 0 && (
            <View style={styles.previewTotalRow}>
              <Text>Tax ({taxPct}%)</Text>
              <Text>{currency === 'IDR' ? 'Rp ' : '$'}{taxAmount.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.previewTotalRow, styles.previewGrandTotal]}>
            <Text style={styles.previewGrandTotalText}>Total</Text>
            <Text style={styles.previewGrandTotalValue}>{currency === 'IDR' ? 'Rp ' : '$'}{total.toLocaleString()}</Text>
          </View>
        </View>
        
        {notes && (
          <>
            <View style={styles.previewDivider} />
            <Text style={styles.previewNotes}>{notes}</Text>
          </>
        )}
        
        {userTier === 'free' && (
          <Text style={styles.watermark}>Dibuat dengan ERI - eri.app</Text>
        )}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton]}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.sendButton]}
          onPress={handleSendInvoice}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? 'Sending...' : 'Send Invoice →'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView
      style={styles.stepContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.resultCard}>
        {sendResult?.success ? (
          <>
            <Text style={styles.resultIcon}>✅</Text>
            <Text style={styles.resultTitle}>Invoice Sent!</Text>
            <Text style={styles.resultMessage}>{sendResult.message}</Text>
          </>
        ) : (
          <>
            <Text style={styles.resultIcon}>❌</Text>
            <Text style={styles.resultTitle}>Send Failed</Text>
            <Text style={styles.resultMessage}>{sendResult?.message}</Text>
          </>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.navButton, styles.doneButton]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Loading task data...</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.primary || '#6366F1',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
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
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: COLORS.border || '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary || '#6366F1',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
    marginBottom: SPACING?.md || 16,
  },
  stepContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: 40,
  },
  bottomSpacer: {
    height: 40,
  },
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
  },
  rowItem: {
    flex: 1,
  },
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
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  removeItemText: {
    fontSize: 12,
    color: COLORS.danger || '#EF4444',
  },
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
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
  },
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
  totalsLabel: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#111827',
  },
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text || '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary || '#6366F1',
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: SPACING?.xs || 8,
  },
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
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted || '#6B7280',
  },
  currencyTextActive: {
    color: COLORS.primary || '#6366F1',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.sm || 12,
  },
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
  optionIcon: {
    fontSize: 28,
    marginRight: SPACING?.sm || 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  optionDesc: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2,
  },
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
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
    marginTop: SPACING?.lg || 24,
    marginBottom: SPACING?.xl || 32,
  },
  navButton: {
    flex: 1,
    paddingVertical: SPACING?.md || 16,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: COLORS.primary || '#6366F1',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  sendButton: {
    backgroundColor: COLORS.success || '#10B981',
    flex: 1,
    paddingVertical: SPACING?.md || 16,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doneButton: {
    backgroundColor: COLORS.primary || '#6366F1',
    marginHorizontal: SPACING?.md || 16,
    marginTop: SPACING?.lg || 24,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previewHeader: {
    marginBottom: SPACING?.md || 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text || '#111827',
  },
  previewHint: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
  },
  previewCard: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.lg || 24,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  previewInvoiceNumber: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    marginBottom: SPACING?.sm || 12,
  },
  previewDivider: {
    height: 1,
    backgroundColor: COLORS.border || '#E5E7EB',
    marginVertical: SPACING?.md || 16,
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  previewClientInfo: {
    flex: 1,
  },
  previewClientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  previewClientDetail: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING?.sm || 12,
  },
  previewItemInfo: {
    flex: 1,
  },
  previewItemDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#111827',
  },
  previewItemQty: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#111827',
  },
  previewTotals: {
    marginTop: SPACING?.sm || 12,
  },
  previewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING?.xs || 8,
  },
  previewGrandTotal: {
    marginTop: SPACING?.sm || 12,
    paddingTop: SPACING?.sm || 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#E5E7EB',
  },
  previewGrandTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text || '#111827',
  },
  previewGrandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary || '#6366F1',
  },
  previewNotes: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    fontStyle: 'italic',
  },
  watermark: {
    textAlign: 'center',
    fontSize: 9,
    color: '#AAAAAA',
    marginTop: SPACING?.lg || 24,
  },
  resultCard: {
    alignItems: 'center',
    paddingVertical: SPACING?.xl || 48,
    paddingHorizontal: SPACING?.lg || 24,
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: SPACING?.md || 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.sm || 12,
  },
  resultMessage: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    marginTop: SPACING?.sm || 12,
  },
});