// User Shopping Controller
// This controller will handle:
// - Shopping cart management
// - Wishlist functionality
// - Order history
// - Product reviews and ratings

import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

import userService from '../../services/userService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class ShoppingController {
  // TODO: Implement shopping functionality
  static async getCart(req, res, next) {
    // TODO: Get user shopping cart
    res.status(501).json({
      success: false,
      message: 'Shopping cart not implemented yet'
    });
  }

  static async addToCart(req, res, next) {
    // TODO: Add product to cart
    res.status(501).json({
      success: false,
      message: 'Shopping cart not implemented yet'
    });
  }

  static async updateCartItem(req, res, next) {
    // TODO: Update cart item quantity
    res.status(501).json({
      success: false,
      message: 'Shopping cart not implemented yet'
    });
  }

  static async removeFromCart(req, res, next) {
    // TODO: Remove item from cart
    res.status(501).json({
      success: false,
      message: 'Shopping cart not implemented yet'
    });
  }

  static async getWishlist(req, res, next) {
    // TODO: Get user wishlist
    res.status(501).json({
      success: false,
      message: 'Wishlist not implemented yet'
    });
  }

  static async addToWishlist(req, res, next) {
    // TODO: Add product to wishlist
    res.status(501).json({
      success: false,
      message: 'Wishlist not implemented yet'
    });
  }

  static async getOrderHistory(req, res, next) {
    // TODO: Get user order history
    res.status(501).json({
      success: false,
      message: 'Order history not implemented yet'
    });
  }

  // Get all orders for the authenticated user with filtering, pagination, and search (Cosmos DB)
  static async getOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { containers } = await import('../../config/cosmos.js');
      const Order = (await import('../../models/Order.js')).Order;
      let query = `SELECT * FROM c WHERE c.userId = @userId`;
      const parameters = [{ name: '@userId', value: userId }];
      if (status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }
      if (search) {
        query += ' AND CONTAINS(c.metadata.order_ref, @search, true)';
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

  // Get a single order for the authenticated user (Cosmos DB)
  static async getOrderById(req, res, next) {
    try {
      const userId = req.user.id;
      const orderId = req.params.id;
      const { containers } = await import('../../config/cosmos.js');
      const Order = (await import('../../models/Order.js')).Order;
      const { resource } = await containers.orders.item(orderId, userId).read();
      if (!resource) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      res.json({ success: true, order: Order.fromDocument(resource) });
    } catch (error) {
      next(error);
    }
  }

  // Create Stripe Checkout Session and Order
  static async createCheckoutSession(req, res, next) {
    try {
      const userId = req.user.id;
      const { cartItems, customerEmail, address, total, metadata } = req.body;
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart items are required' });
      }
      if (!address) {
        return res.status(400).json({ success: false, error: 'Address is required' });
      }
      // 1. Create order in DB (pending, no stripeSessionId yet)
      const order = await userService.createOrder({
        userId,
        items: cartItems,
        address,
        total,
        status: 'pending',
        stripeSessionId: undefined,
        customerEmail,
        metadata,
      });
      // 2. Create Stripe Checkout Session, using order.id as client_reference_id
      const line_items = cartItems.map(item => ({
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            description: item.description && item.description.trim() ? item.description : 'No description provided',
            images: item.images || [],
          },
        },
        quantity: item.quantity,
      }));
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items,
        customer_email: customerEmail,
        success_url: `${process.env.CLIENT_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.CLIENT_CANCEL_URL,
        client_reference_id: order.id,
        metadata: {
          order_ref: `ORD-${Date.now()}`,
          address: JSON.stringify(address),
        },
      });
      // 3. Update order with stripeSessionId in Cosmos DB
      const updatedOrderDoc = {
        ...order.toDocument(),
        stripeSessionId: session.id,
        updatedAt: new Date().toISOString(),
      };
      const { containers } = await import('../../config/cosmos.js');
      await containers.orders.item(order.id, userId).replace(updatedOrderDoc);
      // 4. Return Checkout URL
      return res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Checkout Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Stripe Webhook Handler
  static async handleStripeWebhook(req, res, next) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.client_reference_id;
      console.log('Processing checkout.session.completed for order:', orderId);
      
      if (orderId) {
        try {
          const { containers } = await import('../../config/cosmos.js');
          // First, find the order by scanning (since we don't know the partition key)
          const querySpec = {
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: orderId }]
          };
          const { resources } = await containers.orders.items.query(querySpec).fetchAll();
          
          if (resources && resources.length > 0) {
            const orderDoc = resources[0];
            // Update status to confirmed using the correct partition key (userId)
            orderDoc.status = 'confirmed';
            orderDoc.updatedAt = new Date().toISOString();
            await containers.orders.item(orderId, orderDoc.userId).replace(orderDoc);
            console.log('Order marked as confirmed:', orderId);
          } else {
            console.error('Order not found:', orderId);
          }
        } catch (error) {
          console.error('Error updating order status:', error);
        }
      }
    }
    
    res.json({ received: true });
  }
} 