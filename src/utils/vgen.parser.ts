import { ParsedEmail } from './fiverr.parser';

export const parseVGenEmail = (subject: string, body: string): ParsedEmail | null => {
  // Only process VGen emails
  if (!subject.includes('VGen') && !subject.includes('vgen.co')) {
    return null;
  }

  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  // New commission
  if (lowerSubject.includes('new commission') || lowerSubject.includes('you got a commission')) {
    const orderIdMatch = body.match(/commission #?([A-Z0-9]+)/i);
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
    const orderIdMatch = body.match(/commission #?([A-Z0-9]+)/i);
    
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

  return null;
};