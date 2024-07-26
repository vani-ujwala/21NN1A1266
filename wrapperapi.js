const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = 3030;

app.use(cors({
  origin: 'http://localhost:4200'
}));

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST']
  }
});

// Function to fetch and emit items
const fetchAndEmitItems = async () => {
  try {
    const response = await axios.get('http://localhost:1337/api/samples?populate=*');
    const items = response.data.data.map(item => ({
      id: item.id,
      name: item.attributes.name,
      price: item.attributes.price,
      category_type: item.attributes.category_type,
      item_photo: item.attributes.item_photo && item.attributes.item_photo.data ? item.attributes.item_photo.data.attributes.url : null
    }));

    const results = await Promise.all(items.map(async item => {
      if (item.item_photo) {
        const photoResponse = await axios.get(`http://localhost:1337${item.item_photo}`, { responseType: 'arraybuffer' });
        item.item_photo = Buffer.from(photoResponse.data, 'binary').toString('base64');
      }
      return item;
    }));

    // Emit an event with the fetched items
    io.emit('itemsFetched', results);

  } catch (error) {
    console.error('Failed to fetch data', error);
  }
};

// Define the API endpoint to fetch items on request
app.get('/api/items', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:1337/api/samples?populate=*');
    const items = response.data.data.map(item => ({
      id: item.id,
      name: item.attributes.name,
      price: item.attributes.price,
      category_type: item.attributes.category_type,
      item_photo: item.attributes.item_photo && item.attributes.item_photo.data ? item.attributes.item_photo.data.attributes.url : null
    }));

    const results = await Promise.all(items.map(async item => {
      if (item.item_photo) {
        const photoResponse = await axios.get(`http://localhost:1337${item.item_photo}`, { responseType: 'arraybuffer' });
        item.item_photo = Buffer.from(photoResponse.data, 'binary').toString('base64');
      }
      return item;
    }));

    res.json(results);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Periodically fetch and emit items every 15 seconds
setInterval(fetchAndEmitItems, 15000); // Adjust the interval as needed

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  // Fetch and emit items when the server starts
  fetchAndEmitItems();
});
