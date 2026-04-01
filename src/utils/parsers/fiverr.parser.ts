export type ParsedEmail = {
  type: 'new_order' | 'message' | 'revision' | 'payment' | 'unknown';
  orderId?: string;
  clientName?: string;
  projectTitle?: string;
  amount?: number;
  currency?: string;
  rawSubject: string;
  rawBody: string;
};

export const parseFiverrEmail = (subject: string, body: string): ParsedEmail | null => {
  // Only process Fiverr emails
  if (!subject.includes('Fiverr') && !subject.includes('fiverr')) {
    return null;
  }

  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  // New order
  if (lowerSubject.includes('new order') || lowerSubject.includes('you have a new order')) {
    const orderIdMatch = body.match(/order #?([A-Z0-9]+)/i);
    const clientMatch = body.match(/from\s+([A-Za-z\s]+?)(?:\s+\(|$)/i);
    const titleMatch = body.match(/project[:\s]+([^\n]+)/i);
    const amountMatch = body.match(/\$(\d+(?:\.\d{2})?)/);
    
    return {
      type: 'new_order',
      orderId: orderIdMatch?.[1],
      clientName: clientMatch?.[1]?.trim(),
      projectTitle: titleMatch?.[1]?.trim(),
      amount: amountMatch ? parseFloat(amountMatch[1]) : undefined,
      currency: 'USD',
      rawSubject: subject,
      rawBody: body,
    };
  }

  // Revision request
  if (lowerSubject.includes('revision') || lowerBody.includes('requested a revision')) {
    const orderIdMatch = body.match(/order #?([A-Z0-9]+)/i);
    
    return {
      type: 'revision',
      orderId: orderIdMatch?.[1],
      rawSubject: subject,
      rawBody: body,
    };
  }

  // New message
  if (lowerSubject.includes('message') || lowerBody.includes('sent you a message')) {
    const clientMatch = body.match(/([A-Za-z\s]+)\s+sent you a message/i);
    
    return {
      type: 'message',
      clientName: clientMatch?.[1]?.trim(),
      rawSubject: subject,
      rawBody: body,
    };
  }

  // Payment received
  if (lowerSubject.includes('payment') || lowerBody.includes('payment received')) {
    const amountMatch = body.match(/\$(\d+(?:\.\d{2})?)/);
    
    return {
      type: 'payment',
      amount: amountMatch ? parseFloat(amountMatch[1]) : undefined,
      currency: 'USD',
      rawSubject: subject,
      rawBody: body,
    };
  }

  return null;
};