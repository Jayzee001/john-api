import bcrypt from 'bcryptjs';

export class User {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.address = {
      street: data.address?.street || '',
      city: data.address?.city || '',
      postCode: data.address?.postCode || '',
      country: data.address?.country || ''
    };
    this.role = data.role || 'customer';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.emailVerified = data.emailVerified || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Generate a unique ID for Cosmos DB
  generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate user data
  validate() {
    const errors = [];

    if (!this.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    if (!this.password) {
      errors.push('Password is required');
    } else if (this.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!this.firstName) {
      errors.push('First name is required');
    }

    if (!this.lastName) {
      errors.push('Last name is required');
    }

    return errors;
  }

  // Validate address data
  validateAddress(address) {
    const errors = [];

    if (!address.street || address.street.trim().length === 0) {
      errors.push('Street address is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push('City is required');
    }

    // Make postCode optional for now
    if (address.postCode && address.postCode.trim().length === 0) {
      errors.push('Postal code cannot be empty if provided');
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push('Country is required');
    }

    return errors;
  }

  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Hash password
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Update address
  updateAddress(addressData) {
    if (addressData.street !== undefined) this.address.street = addressData.street;
    if (addressData.city !== undefined) this.address.city = addressData.city;
    if (addressData.postCode !== undefined) this.address.postCode = addressData.postCode;
    if (addressData.country !== undefined) this.address.country = addressData.country;
    
    this.updatedAt = new Date().toISOString();
    return this.address;
  }

  // Convert to Cosmos DB document
  toDocument() {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      address: {
        street: this.address?.street || '',
        city: this.address?.city || '',
        postCode: this.address?.postCode || '',
        country: this.address?.country || ''
      },
      role: this.role,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Cosmos DB document
  static fromDocument(doc) {
    return new User({
      id: doc.id,
      email: doc.email,
      password: doc.password,
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
      address: {
        street: doc.address?.street || '',
        city: doc.address?.city || '',
        postCode: doc.address?.postCode || '',
        country: doc.address?.country || ''
      },
      role: doc.role,
      isActive: doc.isActive,
      emailVerified: doc.emailVerified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }

  // Get public profile (without sensitive data)
  toPublicProfile() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      address: {
        street: this.address?.street || '',
        city: this.address?.city || '',
        postCode: this.address?.postCode || '',
        country: this.address?.country || ''
      },
      role: this.role,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt
    };
  }
} 