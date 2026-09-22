const express = require('express');
const authRoutes = require('./routes/auth.routes');
const clientCompaniesRoutes = require('./routes/clientCompanies.routes');
const usersRoutes = require('./routes/users.routes');
const machinesRoutes = require('./routes/machines.routes');
const partsRoutes = require('./routes/parts.routes');
const ordersRoutes = require('./routes/orders.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/client-companies', clientCompaniesRoutes);
app.use('/users', usersRoutes);
app.use('/machines', machinesRoutes);
app.use('/parts', partsRoutes);
app.use('/orders', ordersRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/reports', reportsRoutes);

module.exports = app;
