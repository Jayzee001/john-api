import { v4 as uuidv4 } from 'uuid';

export class Order {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.items = data.items || [];
    this.address = data.address || {};
    this.status = data.status || 'pending';
    this.total = data.total || 0;
    this.stripeSessionId = data.stripeSessionId || null;
    this.customerEmail = data.customerEmail || '';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  generateId() {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validate() {
    const errors = [];
    if (!this.userId) errors.push('User ID is required');
    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) errors.push('At least one item is required');
    if (!this.address || !this.address.street || !this.address.city || !this.address.country) errors.push('Valid address is required');
    if (!this.customerEmail) errors.push('Customer email is required');
    return errors;
  }

  toDocument() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      address: this.address,
      status: this.status,
      total: this.total,
      stripeSessionId: this.stripeSessionId,
      customerEmail: this.customerEmail,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDocument(doc) {
    return new Order({
      id: doc.id,
      userId: doc.userId,
      items: doc.items,
      address: doc.address,
      status: doc.status,
      total: doc.total,
      stripeSessionId: doc.stripeSessionId,
      customerEmail: doc.customerEmail,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }
}

export default Order; 