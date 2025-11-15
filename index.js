const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());
app.use(cors());

// Send notification endpoint
app.post('/send', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'tokens array required' });
    }

    const messages = tokens.map(token => ({
      token,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      }
    }));

    const response = await admin.messaging().sendEach(messages);

    console.log("Notification sent successfully!");
    console.log(JSON.stringify(response));
      console.log(JSON.stringify(messages));

    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      responses: response.responses
    });
  } catch (error) {
    console.error('FCM Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 2051;
app.listen(PORT, () => {
  console.log(`FCM Service running on port ${PORT}`);
});
