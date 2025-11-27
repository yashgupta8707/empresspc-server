// // controllers/adminDashboardController.js
// import User from '../models/User.js';
// import Order from '../models/Order.js';
// import Product from '../models/Product.js';
// import mongoose from 'mongoose';

// // @desc Get dashboard overview stats
// // @route GET /api/admin/dashboard/overview
// // @access Private/Admin
// export const getDashboardOverview = async (req, res) => {
//   try {
//     const [totalUsers, totalOrders, totalProducts, revenueData] = await Promise.all([
//       User.countDocuments({ isActive: true }),
//       Order.countDocuments(),
//       Product.countDocuments(),
//       Order.aggregate([
//         { $match: { isPaid: true } },
//         { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
//       ])
//     ]);

//     const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

//     res.json({
//       success: true,
//       data: {
//         totalUsers,
//         totalOrders,
//         totalProducts,
//         totalRevenue
//       }
//     });
//   } catch (error) {
//     console.error('Dashboard overview error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching dashboard overview'
//     });
//   }
// };

// // @desc Get order statistics
// // @route GET /api/admin/dashboard/orders
// // @access Private/Admin
// export const getOrderStats = async (req, res) => {
//   try {
//     const orderStats = await Order.aggregate([
//       {
//         $group: {
//           _id: '$status',
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const stats = {
//       pending: 0,
//       processing: 0,
//       shipped: 0,
//       delivered: 0,
//       cancelled: 0
//     };

//     orderStats.forEach(stat => {
//       const status = stat._id.toLowerCase();
//       if (stats.hasOwnProperty(status)) {
//         stats[status] = stat.count;
//       }
//     });

//     res.json({
//       success: true,
//       data: stats
//     });
//   } catch (error) {
//     console.error('Order stats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching order statistics'
//     });
//   }
// };

// // @desc Get revenue statistics
// // @route GET /api/admin/dashboard/revenue
// // @access Private/Admin
// export const getRevenueStats = async (req, res) => {
//   try {
//     const { timeframe = 'week' } = req.query;
//     const now = new Date();
    
//     let todayStart, weekStart, monthStart, lastMonthStart, lastMonthEnd;
    
//     // Calculate date ranges
//     todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//     monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//     lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//     lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

//     const [todayRevenue, weekRevenue, monthRevenue, lastMonthRevenue] = await Promise.all([
//       Order.aggregate([
//         { 
//           $match: { 
//             isPaid: true, 
//             createdAt: { $gte: todayStart } 
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalPrice' } } }
//       ]),
//       Order.aggregate([
//         { 
//           $match: { 
//             isPaid: true, 
//             createdAt: { $gte: weekStart } 
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalPrice' } } }
//       ]),
//       Order.aggregate([
//         { 
//           $match: { 
//             isPaid: true, 
//             createdAt: { $gte: monthStart } 
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalPrice' } } }
//       ]),
//       Order.aggregate([
//         { 
//           $match: { 
//             isPaid: true, 
//             createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } 
//           } 
//         },
//         { $group: { _id: null, total: { $sum: '$totalPrice' } } }
//       ])
//     ]);

//     res.json({
//       success: true,
//       data: {
//         today: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
//         thisWeek: weekRevenue.length > 0 ? weekRevenue[0].total : 0,
//         thisMonth: monthRevenue.length > 0 ? monthRevenue[0].total : 0,
//         lastMonth: lastMonthRevenue.length > 0 ? lastMonthRevenue[0].total : 0
//       }
//     });
//   } catch (error) {
//     console.error('Revenue stats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching revenue statistics'
//     });
//   }
// };

// // @desc Get user statistics
// // @route GET /api/admin/dashboard/users
// // @access Private/Admin
// export const getUserStats = async (req, res) => {
//   try {
//     const now = new Date();
//     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

//     const [newToday, newThisWeek, activeUsers, verifiedUsers] = await Promise.all([
//       User.countDocuments({ 
//         createdAt: { $gte: todayStart },
//         isActive: true 
//       }),
//       User.countDocuments({ 
//         createdAt: { $gte: weekStart },
//         isActive: true 
//       }),