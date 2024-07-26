
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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
      item_photo: item.attributes.item_photo ? item.attributes.item_photo.data.attributes.url : null
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
      item_photo: item.attributes.item_photo ? item.attributes.item_photo.data.attributes.url : null
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

app.use(bodyParser.json());

app.post('/getai', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const fetch = await import('node-fetch').then(mod => mod.default);

    const query = async (data) => {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        {
          headers: { Authorization: 'Bearer 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' },
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      const result = await response.blob();
      return result;
    };

    const response = await query({ inputs: prompt });

    // Save the image to the 'api/upload' folder
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const imageFileName = `generated_${Date.now()}.png`;
    const uploadDir = path.join(__dirname, 'api/upload');

    // Ensure the 'api/upload' directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imagePath = path.join(uploadDir, imageFileName);
    fs.writeFileSync(imagePath, imageBuffer);

    // Upload the image to Strapi's media library
    const formData = new FormData();
    formData.append('files', fs.createReadStream(imagePath), imageFileName);
    const uploadResponse = await axios.post('http://localhost:1337/api/upload', formData, {
      headers: formData.getHeaders(),
    });

    if (uploadResponse.data.length > 0) {
      const imageUrl = uploadResponse.data[0].url;

      // Respond with the uploaded image URL
      res.json({ image_url: imageUrl });

      // Optionally, delete the local file after uploading
      fs.unlinkSync(imagePath);
    } else {
      console.error('Upload response:', uploadResponse.data);
      throw new Error('Failed to upload image to Strapi');
    }
  } catch (error) {
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Periodically fetch and emit items every 30 seconds
setInterval(fetchAndEmitItems, 30000); // Adjust the interval as needed

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  // Fetch and emit items when the server starts
  fetchAndEmitItems();
});
