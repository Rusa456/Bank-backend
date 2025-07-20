const express = require('express');
const router = express.Router();
const db = require('./db');
require('dotenv').config();


const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}


// GET all customers
router.get('/customers',authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST payment with status handling
router.post('/payments',authenticateToken, async (req, res) => {
  const { cid, amount } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check if customer exists
    const [customerRows] = await connection.query(
      'SELECT emidue FROM customers WHERE acno = ?',
      [cid]
    );

    let status = 'success';

    if (customerRows.length === 0) {
      // Customer not found
      status = 'failed';
    } else if (amount > customerRows[0].emidue) {
      // Overpaying EMI
      status = 'failed';
    }

    // Insert payment with correct status
    const [result] = await connection.query(
      'INSERT INTO payment (cid, paydate, amount, status) VALUES (?, NOW(), ?, ?)',
      [cid, amount, status]
    );

    // If status is success, update emi_due
    if (status === 'success') {
      await connection.query(
        'UPDATE customers SET emidue = emidue - ? WHERE acno = ?',
        [amount, cid]
      );
    }

    await connection.commit();

    res.json({
      paymentId: result.insertId,
      cid,
      amount,
      status,
      message: status === 'success'
        ? 'Payment successful'
        : 'Payment failed: Invalid CID or amount exceeds due'
    });
  } catch (err) {
    await connection.rollback();
    console.error('Payment error:', err.message);
    res.status(500).json({ error: 'Payment failed due to server error.' });
  } finally {
    connection.release();
  }
});

// GET payment history for a customer
router.get('/payments/:cid',authenticateToken, async (req, res) => {
  const { cid } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM payment WHERE cid = ?',
      [cid]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching payments:', err.message);
    res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});

module.exports = router;