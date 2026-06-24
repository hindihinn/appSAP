require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/vehicle-legality', require('./routes/vehicleLegality'));
app.use('/api/vehicle-km', require('./routes/vehicleKm'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/driver-legality', require('./routes/driverLegality'));
app.use('/api/driver-assignments', require('./routes/driverAssignments'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/services', require('./routes/services'));
app.use('/api/reimbursements', require('./routes/reimbursements'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Fleet Management API running on port ${PORT}`);
});
