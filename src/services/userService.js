import { containers } from '../config/cosmos.js';
import { User } from '../models/User.js';
import Order from '../models/Order.js';

export class UserService {
  constructor() {
    this.container = containers.users;
  }

  // Create a new user
  async createUser(userData) {
    try {
      const user = new User(userData);
      
      // Validate user data
      const validationErrors = user.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await this.findByEmail(user.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      await user.hashPassword();

      // Create document in Cosmos DB
      const document = user.toDocument();
      const { resource } = await this.container.items.create(document);

      return User.fromDocument(resource);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? User.fromDocument(resources[0]) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by ID
  async findById(id) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      };
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources.length > 0 ? User.fromDocument(resources[0]) : null;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(id, updateData) {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user properties
      Object.assign(user, updateData);
      user.updatedAt = new Date().toISOString();

      // Hash password if it was updated
      if (updateData.password) {
        await user.hashPassword();
      }

      // Update document in Cosmos DB using email as partition key
      const document = user.toDocument();
      const { resource } = await this.container.item(id, user.email).replace(document);

      return User.fromDocument(resource);
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Handle Cosmos DB specific errors
      if (error.code === 404) {
        throw new Error('User not found in database');
      }
      
      if (error.message && error.message.includes('Entity with the specified id does not exist')) {
        throw new Error('User not found in database');
      }
      
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      await this.container.item(id, user.email).delete();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all users (with pagination)
  async getAllUsers(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        users: resources.map(doc => User.fromDocument(doc)),
        page,
        limit,
        total: resources.length
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE CONTAINS(c.firstName, @searchTerm, true) 
             OR CONTAINS(c.lastName, @searchTerm, true) 
             OR CONTAINS(c.email, @searchTerm, true)
          ORDER BY c.createdAt DESC 
          OFFSET @offset LIMIT @limit
        `,
        parameters: [
          { name: '@searchTerm', value: searchTerm },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      
      return {
        users: resources.map(doc => User.fromDocument(doc)),
        page,
        limit,
        total: resources.length,
        searchTerm
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Verify user credentials
  async verifyCredentials(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      throw error;
    }
  }

  // Create user address
  async createAddress(userId, addressData) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has an address
      if (user.address.street || user.address.city || user.address.postCode || user.address.country) {
        throw new Error('Address already exists');
      }

      // Validate address data
      const validationErrors = user.validateAddress(addressData);
      if (validationErrors.length > 0) {
        throw new Error(`Address validation failed: ${validationErrors.join(', ')}`);
      }

      // Create address
      const newAddress = user.updateAddress(addressData);

      // Update user in database
      const document = user.toDocument();
      const { resource } = await this.container.item(userId, user.email).replace(document);

      return {
        user: User.fromDocument(resource),
        address: newAddress
      };
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  // Update user address
  async updateAddress(userId, addressData) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate address data if provided
      if (addressData.street || addressData.city || addressData.postCode || addressData.country) {
        const addressToValidate = {
          street: addressData.street || user.address.street,
          city: addressData.city || user.address.city,
          postCode: addressData.postCode || user.address.postCode,
          country: addressData.country || user.address.country
        };
        const validationErrors = user.validateAddress(addressToValidate);
        if (validationErrors.length > 0) {
          throw new Error(`Address validation failed: ${validationErrors.join(', ')}`);
        }
      }

      // Update address
      const updatedAddress = user.updateAddress(addressData);

      // Update user in database
      const document = user.toDocument();
      const { resource } = await this.container.item(userId, user.email).replace(document);

      return {
        user: User.fromDocument(resource),
        address: updatedAddress
      };
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  // Get user address
  async getUserAddress(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        address: user.address
      };
    } catch (error) {
      console.error('Error getting user address:', error);
      throw error;
    }
  }

  // Create a new order (Cosmos DB style)
  async createOrder(orderData) {
    try {
      const order = new Order(orderData);
      // Validate order data
      const validationErrors = order.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Order validation failed: ${validationErrors.join(', ')}`);
      }
      // Store in Cosmos DB (orders container, partition key: userId)
      const { resource } = await containers.orders.items.create(order.toDocument());
      return Order.fromDocument(resource);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
}

export default new UserService(); 