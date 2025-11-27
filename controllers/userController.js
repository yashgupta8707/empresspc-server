import mongoose from "mongoose"
import Product from "../models/Product.js"
import Order from "../models/Order.js"

const placeOrder = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { orderItems, shippingAddress, paymentMethod, totalPrice, isPaid = false } = req.body;
        const userId = req.user._id;
        
        // Validate required fields
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: "Order items are required" });
        }
        
        if (!shippingAddress) {
            return res.status(400).json({ message: "Shipping address is required" });
        }
        
        if (!paymentMethod) {
            return res.status(400).json({ message: "Payment method is required" });
        }
        
        if (!totalPrice || totalPrice <= 0) {
            return res.status(400).json({ message: "Valid total price is required" });
        }

        session.startTransaction();
        
        // Validate and update product quantities
        for (const item of orderItems) {
            const product = await Product.findById(item.product).session(session);
            if (!product) {
                throw new Error(`Product not found: ${item.product}`);
            }
            if (product.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
            }
            
            // Reduce product quantity
            product.quantity -= item.quantity;
            await product.save({ session });
        }
        
        // Create the order
        const order = new Order({
            orderItems,
            shippingAddress,
            paymentMethod,
            totalPrice,
            user: userId,
            isPaid: isPaid || paymentMethod === 'online', // Online payments are pre-paid
            paidAt: isPaid || paymentMethod === 'online' ? new Date() : undefined,
            status: isPaid || paymentMethod === 'online' ? 'Processing' : 'Pending'
        });
        
        const createdOrder = await order.save({ session });
        
        await session.commitTransaction();
        
        res.status(201).json({ 
            message: "Order placed successfully", 
            order: createdOrder,
            success: true 
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error placing order:', error);
        res.status(400).json({ 
            message: error.message,
            success: false 
        });
    } finally {
        await session.endSession();
    }
}

const cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Order ID is required!" });
        }
        
        session.startTransaction();
        
        const order = await Order.findById(id).session(session);
        if (!order) {
            throw new Error("Order not found");
        }
        
        // Check if order belongs to the user (unless admin)
        if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            throw new Error("Not authorized to cancel this order");
        }
        
        if (order.status === "Cancelled") {
            throw new Error("Order already cancelled");
        }
        
        if (order.status === "Delivered") {
            throw new Error("Cannot cancel delivered order");
        }
        
        // Restore product quantities
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                product.quantity += item.quantity;
                await product.save({ session });
            }
        }

        order.status = "Cancelled";
        order.cancelledAt = new Date();
        await order.save({ session });
        
        await session.commitTransaction();
        
        res.status(200).json({ 
            message: "Order cancelled successfully",
            success: true 
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error cancelling order:', error);
        res.status(400).json({ 
            message: error.message,
            success: false 
        });
    } finally {
        await session.endSession();
    }
}

const getMyOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;
        
        const filter = { user: userId };
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orders = await Order.find(filter)
            .populate('orderItems.product', 'name brand images price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Order.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));
        
        res.status(200).json({
            success: true,
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ 
            message: "Internal server error!",
            success: false 
        });
    }
}

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        if (!id) {
            return res.status(400).json({ message: "Order ID is required!" });
        }
        
        const order = await Order.findById(id)
            .populate('user', 'name email phone address')
            .populate('orderItems.product', 'name brand images price category');
            
        if (!order) {
            return res.status(404).json({ message: "Order not found!" });
        }
        
        // Check if order belongs to the user (unless admin)
        if (order.user._id.toString() !== userId.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: "Not authorized to view this order" });
        }
        
        res.status(200).json({ 
            success: true, 
            order 
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ 
            message: "Internal server error!",
            success: false 
        });
    }
}

export {
    placeOrder,
    cancelOrder,
    getMyOrders,
    getOrderById
}