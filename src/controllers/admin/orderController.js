// Order Management Controller for Admin
// This controller will handle:
// - View all orders with filtering and pagination
// - Update order status (pending, processing, shipped, delivered, cancelled)
// - Order details and customer information
// - Order analytics and reporting

import Order from '../../models/Order.js';
import { containers } from '../../config/cosmos.js';

export class OrderController {
  // Get all orders (admin) with filtering, pagination, and search (Cosmos DB)
  static async getAllOrders(req, res, next) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let query = `SELECT * FROM c WHERE 1=1`;
      const parameters = [];
      if (status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }
      if (search) {
        query += ' AND (CONTAINS(c.customerEmail, @search, true) OR CONTAINS(c.metadata.order_ref, @search, true))';
        parameters.push({ name: '@search', value: search });
      }
      query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
      parameters.push({ name: '@offset', value: offset });
      parameters.push({ name: '@limit', value: parseInt(limit) });
      const querySpec = { query, parameters };
      const { resources } = await containers.orders.items.query(querySpec).fetchAll();
      res.json({
        success: true,
        orders: resources.map(doc => Order.fromDocument(doc)),
        page: parseInt(page),
        limit: parseInt(limit),
        total: resources.length,
        totalPages: Math.ceil(resources.length / limit),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a single order by ID (admin, Cosmos DB)
  static async getOrderById(req, res, next) {
    try {
      const orderId = req.params.id;
      // Try to find the order by scanning all partitions (not efficient, but works for admin)
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: orderId }]
      };
      const { resources } = await containers.orders.items.query(querySpec).fetchAll();
      if (!resources || resources.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      const order = Order.fromDocument(resources[0]);
      
      // Get user details
      let user = null;
      try {
        const { resource: userDoc } = await containers.users.item(order.userId, order.customerEmail).read();
        if (userDoc) {
          const { User } = await import('../../models/User.js');
          user = User.fromDocument(userDoc).toPublicProfile();
        }
      } catch (userError) {
        console.error('Error fetching user details:', userError);
        // Continue without user details if there's an error
      }
      
      res.json({ 
        success: true, 
        order: order,
        user: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Update order status (admin, Cosmos DB)
  static async updateOrderStatus(req, res, next) {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      const validStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      // Find the order (scan all partitions)
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: orderId }]
      };
      const { resources } = await containers.orders.items.query(querySpec).fetchAll();
      if (!resources || resources.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      const orderDoc = resources[0];
      orderDoc.status = status;
      orderDoc.updatedAt = new Date().toISOString();
      await containers.orders.item(orderId, orderDoc.userId).replace(orderDoc);
      res.json({ success: true, order: Order.fromDocument(orderDoc) });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderAnalytics(req, res, next) {
    // TODO: Get order analytics and reporting
    res.status(501).json({
      success: false,
      message: 'Order management not implemented yet'
    });
  }

  static async cancelOrder(req, res, next) {
    // TODO: Cancel order
    res.status(501).json({
      success: false,
      message: 'Order management not implemented yet'
    });
  }
} 