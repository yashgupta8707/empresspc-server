import Product from "../models/Product.js";
import Blog from "../models/Blog.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { flattenObject } from "../utils/helper.js";

const createProduct = async (req, res) => {
    const { name, brand, category, price, originalPrice, description1, description2, images, specs, badge, quantity, colors, sizes } = req.body;
    try {
        const newProduct = new Product({
            name,
            brand,
            category,
            price,
            originalPrice,
            description1,
            description2,
            images,
            specs,
            badge,
            quantity,
            colors,
            sizes
        })
        try {
            const savedProduct = await newProduct.save();
            res.status(201).json({
                success: true,
                message: "Product created successfully",
                product: savedProduct
            });
        } catch (error) {
            res.status(500).json({ message: "Unable to add product!" });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
}

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ message: "Unable to fetch products!" });
    }
}

const editProduct = async (req, res) => {
    const { id } = req.params;
    const foundProduct = await Product.findById(id);
    if (!foundProduct) {
        return res.status(404).json({ message: "Product not found" });
    }
    const { editedFields } = req.body;
    if(!editedFields){
        return res.status(400).json({ message: "No fields to update" });
    }
    const updatedProduct = await Product.findByIdAndUpdate(id, { ...editedFields }, { new: true, runValidators: true });
    if (!updatedProduct) {
        return res.status(404).json({ message: "Unable to update product" });
    }
    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct
    });
}

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    if(!id){
        return res.status(400).json({ message: "Product ID is required!" });
    }
    const foundProduct = await Product.findById(id);
    if (!foundProduct) {
        return res.status(404).json({ message: "Product not found" });
    }
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
}

const createBlog = async (req, res) => {
    const { title, author, content, image } = req.body;
    const newBlog = new Blog({
        title,
        author,
        content,
        image
    })
    try {
        const savedBlog = await newBlog.save();
        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog: savedBlog
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.status(200).json({ success: true, blogs });
    } catch (error) {
        res.status(500).json({ message: "Unable to fetch blogs!" });
    }
}

const editBlog = async (req, res) => {
    const { id } = req.params;
    if(!id){
        return res.status(400).json({ message: "Blog ID is required!" });
    }
    try {
        const foundBlog = await Blog.findById(id);
        if (!foundBlog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        const { editedFields } = req.body;
        if(!editedFields){
            return res.status(400).json({ message: "No fields to update" });
        }
        const updatedBlog = await Blog.findByIdAndUpdate(id, { ...editedFields }, { new: true, runValidators: true });
        if (!updatedBlog) {
            return res.status(404).json({ message: "Unable to update blog" });
        }
        res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            blog: updatedBlog
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
}

const deleteBlog = async (req, res) => {
    const { id } = req.params;
    if(!id){
        return res.status(400).json({ message: "Blog ID is required!" });
    }
    try {
        const foundBlog = await Blog.findById(id);
        if (!foundBlog) {
            return res.status(404).json({ message: "Blog does not exist!" });
        }
        await Blog.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
}

const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, paymentMethod, search } = req.query;
        
        // Build filter object
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (paymentMethod && paymentMethod !== 'all') {
            filter.paymentMethod = paymentMethod;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let query = Order.find(filter)
            .populate('user', 'name email phone address')
            .populate('orderItems.product', 'name brand images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        // Add search functionality
        if (search) {
            query = Order.find({
                ...filter,
                $or: [
                    { '_id': { $regex: search, $options: 'i' } },
                    { 'user.name': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
                    { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
                ]
            })
            .populate('user', 'name email phone address')
            .populate('orderItems.product', 'name brand images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        }
        
        const orders = await query;
        const total = await Order.countDocuments(filter);
        
        if(orders.length === 0 && total === 0){
            return res.status(404).json({ message: "No orders found!" });
        }
        
        res.status(200).json({ 
            success: true, 
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                total,
                hasNextPage: page < Math.ceil(total / parseInt(limit)),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: "Unable to fetch orders!" });
    }
}

const getOrderById = async (req, res) => {
    const { id } = req.params;
    if(!id){
        return res.status(400).json({ message: "Order ID is required!" });
    }
    try {
        const foundOrder = await Order.findById(id)
            .populate('user','name email address phone')
            .populate('orderItems.product','name brand images price category');
        if (!foundOrder) {
            return res.status(404).json({ message: "Order not found!" });
        }
        res.status(200).json({ success: true, order: foundOrder });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: "Unable to fetch order!" });
    }
}

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id) {
        return res.status(400).json({ message: "Order ID is required!" });
    }
    
    if (!status) {
        return res.status(400).json({ message: "Status is required!" });
    }
    
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status!" });
    }
    
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found!" });
        }
        
        order.status = status;
        
        // Set delivery date if status is Delivered
        if (status === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = new Date();
        }
        
        // Set processing date if status is Processing and order is paid
        if (status === 'Processing' && order.isPaid) {
            order.paidAt = order.paidAt || new Date();
        }
        
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: "Unable to update order status!" });
    }
}

const markOrderAsPaid = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ message: "Order ID is required!" });
    }
    
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found!" });
        }
        
        if (order.isPaid) {
            return res.status(400).json({ message: "Order is already paid!" });
        }
        
        order.isPaid = true;
        order.paidAt = new Date();
        
        // If order is pending, move to processing
        if (order.status === 'Pending') {
            order.status = 'Processing';
        }
        
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: "Order marked as paid successfully",
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error marking order as paid:', error);
        res.status(500).json({ message: "Unable to mark order as paid!" });
    }
}

const markOrderAsDelivered = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ message: "Order ID is required!" });
    }
    
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found!" });
        }
        
        if (order.isDelivered) {
            return res.status(400).json({ message: "Order is already delivered!" });
        }
        
        order.isDelivered = true;
        order.deliveredAt = new Date();
        order.status = 'Delivered';
        
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: "Order marked as delivered successfully",
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error marking order as delivered:', error);
        res.status(500).json({ message: "Unable to mark order as delivered!" });
    }
}



const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const processingOrders = await Order.countDocuments({ status: 'Processing' });
        const shippedOrders = await Order.countDocuments({ status: 'Shipped' });
        const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
        const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
        
        const paidOrders = await Order.countDocuments({ isPaid: true });
        const unpaidOrders = await Order.countDocuments({ isPaid: false });
        
        // Calculate total revenue
        const revenueResult = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
        ]);
        
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        
        // Orders by payment method
        const paymentMethodStats = await Order.aggregate([
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
        ]);
        
        // Recent orders (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentOrders = await Order.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });
        
        res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                ordersByStatus: {
                    pending: pendingOrders,
                    processing: processingOrders,
                    shipped: shippedOrders,
                    delivered: deliveredOrders,
                    cancelled: cancelledOrders
                },
                ordersByPayment: {
                    paid: paidOrders,
                    unpaid: unpaidOrders
                },
                totalRevenue,
                paymentMethodStats,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ message: "Unable to fetch order statistics!" });
    }
}

const getUserOrderHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const foundUser = await User.findById(id);
        if (!foundUser) {
            return res.status(404).json({ message: "User not found!" });
        }
        const orders = await Order.find({ user: id }).sort({ createdAt: -1 });
        if (orders.length === 0) {
            return res.status(404).json({ message: "There is no order history for this user!" });
        }
        res.status(200).json({ message: "User details fetched successfully", success: true, user: foundUser, orders });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({},'_id name email phone address');
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
}

export { 
    createProduct,
    editProduct,
    getAllProducts,
    deleteProduct,
    createBlog,
    editBlog,
    deleteBlog,
    getAllBlogs,
    getAllOrders,
    getOrderById,
    getAllUsers,
    getUserOrderHistory,
    getOrderStats, 
    markOrderAsDelivered,
    markOrderAsPaid,
    updateOrderStatus,
};